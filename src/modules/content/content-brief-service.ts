/**
 * Phase 11: Content Brief Service
 * Bridges SEO Opportunities (Phase 10) to actionable editorial briefs.
 * Ensures structured keyword targeting, search intent alignment, and outlines.
 */

import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
} from '@/shared/authorization/policy';
import {
  createContentBriefNotFoundError,
  createOpportunityNotFoundError,
} from '@/shared/errors';
import { logger } from '@/shared/observability/logger';
import {
  ContentBriefRecord,
  ContentBriefStatus,
  ContentBriefStatusValue,
} from './content-types';

export interface CreateBriefInput {
  tenantId: string;
  brandId: string;
  opportunityId?: string | null;
  keywordId?: string | null;
  workingTitle: string;
  primaryTopic: string;
  primaryKeyword?: string | null;
  secondaryKeywords?: string[] | null;
  intent?: string;
  targetAudience?: string | null;
  relatedProductIds?: string[] | null;
  relatedStoreIds?: string[] | null;
  relatedCategoryIds?: string[] | null;
  requiredTopics?: string[] | null;
  notes?: string | null;
  userId?: string | null;
}

export interface UpdateBriefInput {
  workingTitle?: string;
  primaryTopic?: string;
  primaryKeyword?: string | null;
  secondaryKeywords?: string[] | null;
  intent?: string;
  targetAudience?: string | null;
  relatedProductIds?: string[] | null;
  relatedStoreIds?: string[] | null;
  relatedCategoryIds?: string[] | null;
  requiredTopics?: string[] | null;
  notes?: string | null;
  status?: ContentBriefStatusValue;
}

export class ContentBriefService {
  /**
   * Generates a Content Brief directly from an Opportunity.
   */
  public static async createBriefFromOpportunity(
    tenantId: string,
    opportunityId: string,
    userId: string,
    context: AuthorizedContext
  ): Promise<ContentBriefRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_CREATE);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const opportunity = await tx.opportunity.findFirst({
        where: { id: opportunityId, tenantId },
        include: { evidence: true },
      });

      if (!opportunity) {
        throw createOpportunityNotFoundError(opportunityId);
      }

      AuthorizationService.assertBrandAccess(context, opportunity.brandId);

      const firstEv = opportunity.evidence?.[0];
      const evDetails = (firstEv?.details as Record<string, any>) || {};
      const primaryKeyword =
        evDetails.keywordText ||
        firstEv?.entityLabel ||
        opportunity.title.replace(/^(Improve|Create|Update|Add)\s+/i, '').trim();

      const secondaryKeywords: string[] = Array.isArray(evDetails.secondaryKeywords)
        ? evDetails.secondaryKeywords
        : [];

      const intent = evDetails.intent || 'INFORMATIONAL';
      const workingTitle = `Comprehensive Guide: ${primaryKeyword}`;
      const primaryTopic = primaryKeyword;

      const brief = await tx.contentBrief.create({
        data: {
          tenantId,
          brandId: opportunity.brandId,
          opportunityId: opportunity.id,
          keywordId: opportunity.keywordId ?? null,
          workingTitle,
          primaryTopic,
          primaryKeyword,
          secondaryKeywords: secondaryKeywords as any,
          intent,
          requiredTopics: [
            `Understanding ${primaryKeyword}`,
            'Key benefits and solutions',
            'Local store availability and verified pricing',
            'Frequently asked questions',
          ] as any,
          notes: `Generated from Opportunity ${opportunity.id} (${opportunity.type})`,
          status: ContentBriefStatus.DRAFT,
          createdBy: userId,
        },
      });

      // Update opportunity status to ACCEPTED if it was OPEN
      if (opportunity.status === 'OPEN' || opportunity.status === 'IN_REVIEW') {
        await tx.opportunity.update({
          where: { id: opportunity.id },
          data: {
            status: 'ACCEPTED',
          },
        });
      }

      logger.info(
        { tenantId, briefId: brief.id, opportunityId },
        'Created content brief from opportunity'
      );

      return this.mapBrief(brief);
    });
  }

  /**
   * Manually creates a new content brief.
   */
  public static async createBrief(
    input: CreateBriefInput,
    context: AuthorizedContext
  ): Promise<ContentBriefRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_CREATE);
    AuthorizationService.assertBrandAccess(context, input.brandId);

    return await TenantContextService.withTenantContext(prisma, input.tenantId, async (tx) => {
      const brief = await tx.contentBrief.create({
        data: {
          tenantId: input.tenantId,
          brandId: input.brandId,
          opportunityId: input.opportunityId ?? null,
          keywordId: input.keywordId ?? null,
          workingTitle: input.workingTitle,
          primaryTopic: input.primaryTopic,
          primaryKeyword: input.primaryKeyword ?? null,
          secondaryKeywords: input.secondaryKeywords ? (input.secondaryKeywords as any) : undefined,
          intent: input.intent || 'INFORMATIONAL',
          targetAudience: input.targetAudience ?? null,
          relatedProductIds: input.relatedProductIds ? (input.relatedProductIds as any) : undefined,
          relatedStoreIds: input.relatedStoreIds ? (input.relatedStoreIds as any) : undefined,
          relatedCategoryIds: input.relatedCategoryIds ? (input.relatedCategoryIds as any) : undefined,
          requiredTopics: input.requiredTopics ? (input.requiredTopics as any) : undefined,
          notes: input.notes ?? null,
          status: ContentBriefStatus.DRAFT,
          createdBy: input.userId ?? null,
        },
      });

      return this.mapBrief(brief);
    });
  }

  /**
   * Updates an existing content brief.
   */
  public static async updateBrief(
    tenantId: string,
    briefId: string,
    input: UpdateBriefInput,
    context: AuthorizedContext
  ): Promise<ContentBriefRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_EDIT);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.contentBrief.findFirst({
        where: { id: briefId, tenantId },
      });

      if (!existing) {
        throw createContentBriefNotFoundError(briefId);
      }

      AuthorizationService.assertBrandAccess(context, existing.brandId);

      const updateData: any = {};
      if (input.workingTitle !== undefined) updateData.workingTitle = input.workingTitle;
      if (input.primaryTopic !== undefined) updateData.primaryTopic = input.primaryTopic;
      if (input.primaryKeyword !== undefined) updateData.primaryKeyword = input.primaryKeyword;
      if (input.secondaryKeywords !== undefined) updateData.secondaryKeywords = input.secondaryKeywords as any;
      if (input.intent !== undefined) updateData.intent = input.intent;
      if (input.targetAudience !== undefined) updateData.targetAudience = input.targetAudience;
      if (input.relatedProductIds !== undefined) updateData.relatedProductIds = input.relatedProductIds as any;
      if (input.relatedStoreIds !== undefined) updateData.relatedStoreIds = input.relatedStoreIds as any;
      if (input.relatedCategoryIds !== undefined) updateData.relatedCategoryIds = input.relatedCategoryIds as any;
      if (input.requiredTopics !== undefined) updateData.requiredTopics = input.requiredTopics as any;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.status !== undefined) updateData.status = input.status;

      const updated = await tx.contentBrief.update({
        where: { id: briefId },
        data: updateData,
      });

      return this.mapBrief(updated);
    });
  }

  /**
   * Retrieves a brief by ID.
   */
  public static async getBriefById(
    tenantId: string,
    briefId: string,
    context: AuthorizedContext
  ): Promise<ContentBriefRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_VIEW);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const brief = await tx.contentBrief.findFirst({
        where: { id: briefId, tenantId },
      });

      if (!brief) {
        throw createContentBriefNotFoundError(briefId);
      }

      AuthorizationService.assertBrandAccess(context, brief.brandId);

      return this.mapBrief(brief);
    });
  }

  /**
   * Lists briefs for a tenant/brand.
   */
  public static async listBriefs(
    tenantId: string,
    brandId: string,
    status?: ContentBriefStatusValue,
    context?: AuthorizedContext
  ): Promise<ContentBriefRecord[]> {
    if (context) {
      AuthorizationService.assertCan(context, Action.CONTENT_VIEW);
      AuthorizationService.assertBrandAccess(context, brandId);
    }

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const where: any = { tenantId, brandId };
      if (status) where.status = status;

      const briefs = await tx.contentBrief.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return briefs.map((b: any) => this.mapBrief(b));
    });
  }

  private static mapBrief(brief: any): ContentBriefRecord {
    return {
      id: brief.id,
      tenantId: brief.tenantId,
      brandId: brief.brandId,
      opportunityId: brief.opportunityId,
      keywordId: brief.keywordId,
      workingTitle: brief.workingTitle,
      primaryTopic: brief.primaryTopic,
      primaryKeyword: brief.primaryKeyword,
      secondaryKeywords: brief.secondaryKeywords || [],
      intent: brief.intent,
      targetAudience: brief.targetAudience,
      relatedProductIds: brief.relatedProductIds || [],
      relatedStoreIds: brief.relatedStoreIds || [],
      relatedCategoryIds: brief.relatedCategoryIds || [],
      requiredTopics: brief.requiredTopics || [],
      notes: brief.notes,
      status: brief.status,
      createdBy: brief.createdBy,
      createdAt: brief.createdAt,
      updatedAt: brief.updatedAt,
    };
  }
}
