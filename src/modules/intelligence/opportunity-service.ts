/**
 * Phase 10: Opportunity Service
 * End-to-end execution, query, and workflow management for SEO opportunities.
 * Strictly adheres to multi-tenant RLS, human-in-the-loop review, and explainable evidence.
 */

import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
  ScopeMode,
} from '@/shared/authorization/policy';
import {
  createOpportunityNotFoundError,
  createOpportunityWorkflowError,
  ErrorCode,
} from '@/shared/errors';
import { logger } from '@/shared/observability/logger';
import {
  OpportunityDto,
  OpportunityFilterParams,
  OpportunityStatus,
  OpportunityStatusValue,
  OpportunitySummaryStats,
  OpportunityPriority,
} from './opportunity-types';
import { SearchSignalService } from './search-signal-service';
import { OpportunityRuleEngine } from './opportunity-rule-engine';

export class OpportunityService {
  /**
   * Runs the full factual evaluation pipeline for a brand and persists opportunities.
   */
  public static async runOpportunityEvaluation(
    tenantId: string,
    brandId: string,
    context: AuthorizedContext
  ): Promise<{ evaluated: number; created: number; updated: number }> {
    AuthorizationService.assertCan(context, Action.OPPORTUNITY_MANAGE);
    AuthorizationService.assertBrandAccess(context, brandId);

    logger.info({ tenantId, brandId }, 'Starting opportunity evaluation pipeline');

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Ingest factual signals across providers without blurring provenance
      const signals = await SearchSignalService.loadSignals(tenantId, brandId, {}, tx);

      // 2. Evaluate all deterministic versioned rules
      const candidates = await OpportunityRuleEngine.evaluateAll({
        tenantId,
        brandId,
        signals,
        db: tx,
      });

      let created = 0;
      let updated = 0;

      for (const candidate of candidates) {
        const identityHash = OpportunityRuleEngine.generateIdentityHash(
          tenantId,
          brandId,
          candidate.ruleId,
          candidate.entityKey,
          candidate.title
        );

        // Check if existing opportunity exists with this identity
        const existing = await tx.opportunity.findUnique({
          where: {
            uq_opportunity_identity_hash: {
              tenantId,
              identityHash,
            },
          },
        });

        if (existing) {
          // If dismissed recently (< 14 days), respect human dismissal and do not reopen
          if (existing.status === OpportunityStatus.DISMISSED && existing.dismissedAt) {
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
            if (existing.dismissedAt > fourteenDaysAgo) {
              continue;
            }
          }

          // If completed, do not re-create unless explicitly reopened
          if (existing.status === OpportunityStatus.COMPLETED) {
            continue;
          }

          // Update existing open/in_review/accepted opportunity with latest signals & evidence
          await tx.opportunity.update({
            where: { id: existing.id },
            data: {
              lastEvaluatedAt: new Date(),
              priority: candidate.priority,
              priorityScore: candidate.priorityScore,
              confidence: candidate.confidence,
              title: candidate.title,
              summary: candidate.summary,
              actionPayload: candidate.actionPayload as any,
              evidence: {
                deleteMany: {},
                create: candidate.evidence.map((ev) => ({
                  tenant: { connect: { id: tenantId } },
                  source: ev.source,
                  metric: ev.metric,
                  value: ev.value,
                  comparisonValue: ev.comparisonValue ?? null,
                  formattedValue: ev.formattedValue ?? null,
                  dateRange: ev.dateRange ?? null,
                  entityType: ev.entityType ?? null,
                  entityId: ev.entityId ?? null,
                  entityLabel: ev.entityLabel ?? null,
                  details: ev.details as any,
                })),
              },
            },
          });
          updated++;
        } else {
          // Create new opportunity with evidence
          await tx.opportunity.create({
            data: {
              tenantId,
              brandId,
              storeId: candidate.storeId ?? null,
              webSurfaceId: candidate.webSurfaceId ?? null,
              pageId: candidate.pageId ?? null,
              productId: candidate.productId ?? null,
              categoryId: candidate.categoryId ?? null,
              keywordId: candidate.keywordId ?? null,
              type: candidate.type,
              status: OpportunityStatus.OPEN,
              priority: candidate.priority,
              priorityScore: candidate.priorityScore,
              confidence: candidate.confidence,
              title: candidate.title,
              summary: candidate.summary,
              actionType: candidate.actionType,
              actionPayload: candidate.actionPayload as any,
              ruleId: candidate.ruleId,
              ruleVersion: candidate.ruleVersion,
              identityHash,
              evidence: {
                create: candidate.evidence.map((ev) => ({
                  tenant: { connect: { id: tenantId } },
                  source: ev.source,
                  metric: ev.metric,
                  value: ev.value,
                  comparisonValue: ev.comparisonValue ?? null,
                  formattedValue: ev.formattedValue ?? null,
                  dateRange: ev.dateRange ?? null,
                  entityType: ev.entityType ?? null,
                  entityId: ev.entityId ?? null,
                  entityLabel: ev.entityLabel ?? null,
                  details: ev.details as any,
                })),
              },
            },
          });
          created++;
        }
      }

      logger.info(
        { tenantId, brandId, evaluated: candidates.length, created, updated },
        'Completed opportunity evaluation pipeline'
      );

      return {
        evaluated: candidates.length,
        created,
        updated,
      };
    });
  }

  /**
   * Lists opportunities with scoped filtering, sorting, pagination, and evidence summary.
   */
  public static async listOpportunities(
    tenantId: string,
    params: OpportunityFilterParams,
    context: AuthorizedContext
  ): Promise<{ opportunities: OpportunityDto[]; stats: OpportunitySummaryStats; total: number }> {
    AuthorizationService.assertCan(context, Action.OPPORTUNITY_VIEW);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const page = Math.max(1, params.page ?? 1);
      const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
      const skip = (page - 1) * pageSize;

      const where: any = {
        tenantId,
      };

      // Scope enforcement
      if (context.scopeMode === ScopeMode.RESTRICTED) {
        if (context.grantedBrandIds && context.grantedBrandIds.size > 0) {
          where.brandId = { in: Array.from(context.grantedBrandIds) };
        }
        if (context.grantedLocationIds && context.grantedLocationIds.size > 0) {
          where.OR = [
            { storeId: { in: Array.from(context.grantedLocationIds) } },
            { storeId: null },
          ];
        }
      }

      if (params.brandId) {
        AuthorizationService.assertBrandAccess(context, params.brandId);
        where.brandId = params.brandId;
      }

      if (params.storeId) {
        where.storeId = params.storeId;
      }

      if (params.status && params.status !== 'ALL') {
        where.status = params.status;
      } else if (!params.status) {
        // By default show active opportunities (not dismissed or completed)
        where.status = { in: [OpportunityStatus.OPEN, OpportunityStatus.IN_REVIEW, OpportunityStatus.ACCEPTED] };
      }

      if (params.priority) {
        where.priority = params.priority;
      }

      if (params.type) {
        where.type = params.type;
      }

      if (params.actionType) {
        where.actionType = params.actionType;
      }

      if (params.search) {
        where.OR = [
          { title: { contains: params.search, mode: 'insensitive' } },
          { summary: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      const [records, totalCount, allStats] = await Promise.all([
        tx.opportunity.findMany({
          where,
          include: {
            brand: { select: { name: true } },
            store: { select: { name: true } },
            page: { select: { slug: true } },
            product: { select: { name: true } },
            category: { select: { name: true } },
            keyword: { select: { term: true } },
            evidence: {
              orderBy: { capturedAt: 'desc' },
            },
          },
          orderBy: [
            { priorityScore: 'desc' },
            { detectedAt: 'desc' },
          ],
          skip,
          take: pageSize,
        }),
        tx.opportunity.count({ where }),
        // Calculate global summary stats for the tenant/brand
        tx.opportunity.groupBy({
          by: ['status', 'priority', 'type'],
          where: {
            tenantId,
            ...(params.brandId ? { brandId: params.brandId } : {}),
          },
          _count: { id: true },
        }),
      ]);

      // Build summary stats
      const stats: OpportunitySummaryStats = {
        total: 0,
        open: 0,
        inReview: 0,
        accepted: 0,
        dismissed: 0,
        completed: 0,
        byPriority: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        byType: {},
      };

      for (const item of allStats) {
        const count = item._count.id;
        stats.total += count;

        if (item.status === OpportunityStatus.OPEN) stats.open += count;
        if (item.status === OpportunityStatus.IN_REVIEW) stats.inReview += count;
        if (item.status === OpportunityStatus.ACCEPTED) stats.accepted += count;
        if (item.status === OpportunityStatus.DISMISSED) stats.dismissed += count;
        if (item.status === OpportunityStatus.COMPLETED) stats.completed += count;

        if (item.priority === OpportunityPriority.CRITICAL) stats.byPriority.critical += count;
        if (item.priority === OpportunityPriority.HIGH) stats.byPriority.high += count;
        if (item.priority === OpportunityPriority.MEDIUM) stats.byPriority.medium += count;
        if (item.priority === OpportunityPriority.LOW) stats.byPriority.low += count;

        stats.byType[item.type] = (stats.byType[item.type] ?? 0) + count;
      }

      const opportunities: OpportunityDto[] = records.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        brandId: r.brandId,
        storeId: r.storeId,
        webSurfaceId: r.webSurfaceId,
        pageId: r.pageId,
        productId: r.productId,
        categoryId: r.categoryId,
        keywordId: r.keywordId,
        type: r.type as any,
        status: r.status as any,
        priority: r.priority as any,
        priorityScore: r.priorityScore,
        confidence: r.confidence as any,
        title: r.title,
        summary: r.summary,
        actionType: r.actionType as any,
        actionPayload: r.actionPayload as any,
        ruleId: r.ruleId,
        ruleVersion: r.ruleVersion,
        identityHash: r.identityHash,
        detectedAt: r.detectedAt,
        lastEvaluatedAt: r.lastEvaluatedAt,
        resolvedAt: r.resolvedAt,
        dismissedAt: r.dismissedAt,
        dismissalReason: r.dismissalReason,
        dismissedBy: r.dismissedBy,
        acceptedAt: r.acceptedAt,
        acceptedBy: r.acceptedBy,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        brandName: r.brand?.name,
        storeName: r.store?.name,
        pageSlug: r.page?.slug,
        productName: r.product?.name,
        categoryName: r.category?.name,
        keywordTerm: r.keyword?.term,
        evidence: r.evidence.map((ev) => ({
          id: ev.id,
          source: ev.source as any,
          metric: ev.metric,
          value: ev.value,
          comparisonValue: ev.comparisonValue,
          formattedValue: ev.formattedValue,
          dateRange: ev.dateRange,
          entityType: ev.entityType,
          entityId: ev.entityId,
          entityLabel: ev.entityLabel,
          details: ev.details as any,
          capturedAt: ev.capturedAt,
        })),
      }));

      return {
        opportunities,
        stats,
        total: totalCount,
      };
    });
  }

  /**
   * Fetches detailed opportunity by ID including all factual evidence.
   */
  public static async getOpportunityById(
    tenantId: string,
    opportunityId: string,
    context: AuthorizedContext
  ): Promise<OpportunityDto> {
    AuthorizationService.assertCan(context, Action.OPPORTUNITY_VIEW);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const r = await tx.opportunity.findUnique({
        where: {
          uq_opportunity_tenant_id: {
            tenantId,
            id: opportunityId,
          },
        },
        include: {
          brand: { select: { name: true } },
          store: { select: { name: true } },
          page: { select: { slug: true } },
          product: { select: { name: true } },
          category: { select: { name: true } },
          keyword: { select: { term: true } },
          evidence: {
            orderBy: { capturedAt: 'desc' },
          },
        },
      });

      if (!r) {
        throw createOpportunityNotFoundError(opportunityId);
      }

      AuthorizationService.assertBrandAccess(context, r.brandId);

      return {
        id: r.id,
        tenantId: r.tenantId,
        brandId: r.brandId,
        storeId: r.storeId,
        webSurfaceId: r.webSurfaceId,
        pageId: r.pageId,
        productId: r.productId,
        categoryId: r.categoryId,
        keywordId: r.keywordId,
        type: r.type as any,
        status: r.status as any,
        priority: r.priority as any,
        priorityScore: r.priorityScore,
        confidence: r.confidence as any,
        title: r.title,
        summary: r.summary,
        actionType: r.actionType as any,
        actionPayload: r.actionPayload as any,
        ruleId: r.ruleId,
        ruleVersion: r.ruleVersion,
        identityHash: r.identityHash,
        detectedAt: r.detectedAt,
        lastEvaluatedAt: r.lastEvaluatedAt,
        resolvedAt: r.resolvedAt,
        dismissedAt: r.dismissedAt,
        dismissalReason: r.dismissalReason,
        dismissedBy: r.dismissedBy,
        acceptedAt: r.acceptedAt,
        acceptedBy: r.acceptedBy,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        brandName: r.brand?.name,
        storeName: r.store?.name,
        pageSlug: r.page?.slug,
        productName: r.product?.name,
        categoryName: r.category?.name,
        keywordTerm: r.keyword?.term,
        evidence: r.evidence.map((ev) => ({
          id: ev.id,
          source: ev.source as any,
          metric: ev.metric,
          value: ev.value,
          comparisonValue: ev.comparisonValue,
          formattedValue: ev.formattedValue,
          dateRange: ev.dateRange,
          entityType: ev.entityType,
          entityId: ev.entityId,
          entityLabel: ev.entityLabel,
          details: ev.details as any,
          capturedAt: ev.capturedAt,
        })),
      };
    });
  }

  /**
   * Transitions an opportunity's workflow status (Human Review step).
   * Valid transitions:
   * - OPEN -> IN_REVIEW, ACCEPTED, DISMISSED
   * - IN_REVIEW -> ACCEPTED, DISMISSED, OPEN
   * - ACCEPTED -> COMPLETED, DISMISSED
   */
  public static async updateWorkflowStatus(
    tenantId: string,
    opportunityId: string,
    update: {
      status: OpportunityStatusValue;
      dismissalReason?: string | null | undefined;
      dismissedBy?: string | null | undefined;
      acceptedBy?: string | null | undefined;
    },
    context: AuthorizedContext
  ): Promise<OpportunityDto> {
    if (update.status === OpportunityStatus.DISMISSED) {
      AuthorizationService.assertCan(context, Action.OPPORTUNITY_DISMISS);
      if (!update.dismissalReason || update.dismissalReason.trim() === '') {
        throw createOpportunityWorkflowError(
          'A dismissal reason is required when dismissing an opportunity.',
          ErrorCode.DISMISSAL_REASON_REQUIRED
        );
      }
    } else {
      AuthorizationService.assertCan(context, Action.OPPORTUNITY_MANAGE);
    }

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.opportunity.findUnique({
        where: {
          uq_opportunity_tenant_id: {
            tenantId,
            id: opportunityId,
          },
        },
      });

      if (!existing) {
        throw createOpportunityNotFoundError(opportunityId);
      }

      AuthorizationService.assertBrandAccess(context, existing.brandId);

      const data: any = {
        status: update.status,
      };

      if (update.status === OpportunityStatus.ACCEPTED) {
        data.acceptedAt = new Date();
        data.acceptedBy = update.acceptedBy ?? context.userId;
      } else if (update.status === OpportunityStatus.DISMISSED) {
        data.dismissedAt = new Date();
        data.dismissalReason = update.dismissalReason;
        data.dismissedBy = update.dismissedBy ?? context.userId;
      } else if (update.status === OpportunityStatus.COMPLETED) {
        data.resolvedAt = new Date();
      }

      const updated = await tx.opportunity.update({
        where: { id: opportunityId },
        data,
        include: {
          brand: { select: { name: true } },
          store: { select: { name: true } },
          page: { select: { slug: true } },
          product: { select: { name: true } },
          category: { select: { name: true } },
          keyword: { select: { term: true } },
          evidence: {
            orderBy: { capturedAt: 'desc' },
          },
        },
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        brandId: updated.brandId,
        storeId: updated.storeId,
        webSurfaceId: updated.webSurfaceId,
        pageId: updated.pageId,
        productId: updated.productId,
        categoryId: updated.categoryId,
        keywordId: updated.keywordId,
        type: updated.type as any,
        status: updated.status as any,
        priority: updated.priority as any,
        priorityScore: updated.priorityScore,
        confidence: updated.confidence as any,
        title: updated.title,
        summary: updated.summary,
        actionType: updated.actionType as any,
        actionPayload: updated.actionPayload as any,
        ruleId: updated.ruleId,
        ruleVersion: updated.ruleVersion,
        identityHash: updated.identityHash,
        detectedAt: updated.detectedAt,
        lastEvaluatedAt: updated.lastEvaluatedAt,
        resolvedAt: updated.resolvedAt,
        dismissedAt: updated.dismissedAt,
        dismissalReason: updated.dismissalReason,
        dismissedBy: updated.dismissedBy,
        acceptedAt: updated.acceptedAt,
        acceptedBy: updated.acceptedBy,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        brandName: updated.brand?.name,
        storeName: updated.store?.name,
        pageSlug: updated.page?.slug,
        productName: updated.product?.name,
        categoryName: updated.category?.name,
        keywordTerm: updated.keyword?.term,
        evidence: updated.evidence.map((ev) => ({
          id: ev.id,
          source: ev.source as any,
          metric: ev.metric,
          value: ev.value,
          comparisonValue: ev.comparisonValue,
          formattedValue: ev.formattedValue,
          dateRange: ev.dateRange,
          entityType: ev.entityType,
          entityId: ev.entityId,
          entityLabel: ev.entityLabel,
          details: ev.details as any,
          capturedAt: ev.capturedAt,
        })),
      };
    });
  }
}
