import crypto from 'node:crypto';
import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import {
  SeoAiAnalysisResponse,
  SeoGapItem,
  GscPageKeywordEvidence,
  CompetitorCandidate,
  SeoPageSignals,
  SeoPriority,
} from './seo-types';

export interface OpportunityBridgeInput {
  analysisId: string;
  tenantId: string;
  brandId: string;
  webSurfaceId: string;
  pageId?: string | null;
  storeId?: string | null;
  targetUrl: string;
  keyword: string;
  keywordId?: string | null;
  surfaceType: 'LOCALBI' | 'ORIGINAL';
  gscEvidence?: GscPageKeywordEvidence | null;
  clientSignals: SeoPageSignals;
  competitors: Array<{
    candidate: CompetitorCandidate;
    signals: SeoPageSignals;
  }>;
  deterministicGaps: SeoGapItem[];
  aiAnalysis: SeoAiAnalysisResponse;
}

export class SeoOpportunityBridge {
  public static readonly RULE_VERSION = '1.0.0';

  /**
   * Persists recommendations into canonical Opportunity and OpportunityEvidence records.
   * Preserves immutable original AI suggestions and associates granular evidence.
   */
  public static async createOpportunitiesFromAnalysis(
    input: OpportunityBridgeInput
  ): Promise<string[]> {
    const {
      analysisId,
      tenantId,
      brandId,
      webSurfaceId,
      pageId,
      storeId,
      targetUrl,
      keyword,
      keywordId,
      surfaceType,
      gscEvidence,
      clientSignals,
      competitors,
      deterministicGaps,
      aiAnalysis,
    } = input;

    const createdOpportunityIds: string[] = [];

    // Helper: generate unique identity hash for idempotency
    const makeIdentityHash = (type: string, entityKey: string) => {
      return crypto
        .createHash('sha256')
        .update(`${tenantId}:${brandId}:${type}:${entityKey}:${targetUrl}`)
        .digest('hex')
        .slice(0, 32);
    };

    // ── 1. META TITLE OPPORTUNITY ───────────────────────────────────────────
    if (aiAnalysis.metaTitleRecommendations && aiAnalysis.metaTitleRecommendations.length > 0) {
      const topTitleOption = aiAnalysis.metaTitleRecommendations[0]!;
      const identityHash = makeIdentityHash('SEO_META_TITLE', 'title');

      const what = 'Update search page title.';
      const why =
        'Your page is appearing in search, but the title headline does not naturally emphasize the primary search topic and local service context.';
      const evidence = gscEvidence?.available
        ? `${gscEvidence.impressions.toLocaleString()} search impressions at avg position ${gscEvidence.averagePosition.toFixed(1)}. Observed ${competitors.length} competitors targeting "${keyword}".`
        : `Observed on-page differences across ${competitors.length} organic competitors in Google Search.`;
      const action = 'Review recommended title options and approve or customize the desired headline.';

      const actionPayload = {
        analysisId,
        recommendationType: 'SEO_META_TITLE',
        targetUrl,
        keyword,
        currentValue: clientSignals.title || 'NONE',
        originalSuggestion: topTitleOption.title,
        approvedValue: null,
        options: aiAnalysis.metaTitleRecommendations,
        explanation: { what, why, evidence, action },
        implementationDetails: {
          surface: surfaceType,
          mode: surfaceType === 'LOCALBI' ? 'PAGE_SEO_DRAFT' : 'MANUAL_TASK',
          status: 'PENDING_APPROVAL',
        },
        verificationState: {
          status: 'UNVERIFIED',
          expectedValue: topTitleOption.title,
        },
      };

      try {
        const opp = await prisma.opportunity.upsert({
          where: {
            uq_opportunity_identity_hash: {
              tenantId,
              identityHash,
            },
          },
          create: {
            tenantId,
            brandId,
            webSurfaceId,
            pageId: pageId ?? null,
            storeId: storeId ?? null,
            keywordId: keywordId ?? null,
            type: 'SEO_META_TITLE',
            status: 'OPEN',
            priority: SeoPriority.HIGH,
            priorityScore: 85.0,
            confidence: topTitleOption.confidence,
            title: `Improve Page Title for "${keyword}"`,
            summary: `${what} ${why}`,
            actionType: 'UPDATE_METADATA',
            actionPayload: actionPayload as any,
            ruleId: 'RULE_SEO_TITLE_ALIGNMENT',
            ruleVersion: this.RULE_VERSION,
            identityHash,
          },
          update: {
            priorityScore: 85.0,
            title: `Improve Page Title for "${keyword}"`,
            summary: `${what} ${why}`,
            actionPayload: actionPayload as any,
            lastEvaluatedAt: new Date(),
          },
        });

        createdOpportunityIds.push(opp.id);

        // Associate Evidence
        await this.syncEvidenceForOpportunity(tenantId, opp.id, {
          gscEvidence,
          clientSignals,
          competitors,
          primaryMetric: 'TITLE_SIMILARITY',
        });
      } catch (err: any) {
        logger.error({ error: err.message }, 'Failed to save SEO_META_TITLE opportunity');
      }
    }

    // ── 2. META DESCRIPTION OPPORTUNITY ─────────────────────────────────────
    if (aiAnalysis.metaDescriptionRecommendations && aiAnalysis.metaDescriptionRecommendations.length > 0) {
      const topDescOption = aiAnalysis.metaDescriptionRecommendations[0]!;
      const identityHash = makeIdentityHash('SEO_META_DESCRIPTION', 'description');

      const what = 'Add or optimize meta description.';
      const why =
        'A descriptive snippet increases search click-through rate by clearly communicating storefront offerings, physical locality, and customer service guarantees.';
      const evidence = gscEvidence?.available
        ? `Current CTR is ${(gscEvidence.ctr * 100).toFixed(1)}%. Competitor snippets highlight verified local inventory and fast customer response.`
        : 'Missing or generic description compared against top 3 organic competitors.';
      const action = 'Review suggested descriptions and approve your preferred text.';

      const actionPayload = {
        analysisId,
        recommendationType: 'SEO_META_DESCRIPTION',
        targetUrl,
        keyword,
        currentValue: clientSignals.metaDescription || 'NONE',
        originalSuggestion: topDescOption.description,
        approvedValue: null,
        options: aiAnalysis.metaDescriptionRecommendations,
        explanation: { what, why, evidence, action },
        implementationDetails: {
          surface: surfaceType,
          mode: surfaceType === 'LOCALBI' ? 'PAGE_SEO_DRAFT' : 'MANUAL_TASK',
          status: 'PENDING_APPROVAL',
        },
        verificationState: {
          status: 'UNVERIFIED',
          expectedValue: topDescOption.description,
        },
      };

      try {
        const opp = await prisma.opportunity.upsert({
          where: {
            uq_opportunity_identity_hash: {
              tenantId,
              identityHash,
            },
          },
          create: {
            tenantId,
            brandId,
            webSurfaceId,
            pageId: pageId ?? null,
            storeId: storeId ?? null,
            keywordId: keywordId ?? null,
            type: 'SEO_META_DESCRIPTION',
            status: 'OPEN',
            priority: SeoPriority.MEDIUM,
            priorityScore: 75.0,
            confidence: topDescOption.confidence,
            title: `Optimize Meta Description for "${keyword}"`,
            summary: `${what} ${why}`,
            actionType: 'UPDATE_METADATA',
            actionPayload: actionPayload as any,
            ruleId: 'RULE_SEO_META_DESCRIPTION_OPTIMIZATION',
            ruleVersion: this.RULE_VERSION,
            identityHash,
          },
          update: {
            priorityScore: 75.0,
            title: `Optimize Meta Description for "${keyword}"`,
            summary: `${what} ${why}`,
            actionPayload: actionPayload as any,
            lastEvaluatedAt: new Date(),
          },
        });

        createdOpportunityIds.push(opp.id);

        await this.syncEvidenceForOpportunity(tenantId, opp.id, {
          gscEvidence,
          clientSignals,
          competitors,
          primaryMetric: 'CTR_OPTIMIZATION',
        });
      } catch (err: any) {
        logger.error({ error: err.message }, 'Failed to save SEO_META_DESCRIPTION opportunity');
      }
    }

    // ── 3. CONTENT GAPS OPPORTUNITIES ────────────────────────────────────────
    for (const gap of aiAnalysis.contentGaps) {
      const identityHash = makeIdentityHash('SEO_CONTENT_GAP', gap.topic);

      const what = `Address content gap: ${gap.topic}`;
      const why = gap.reason;
      const evidence = gap.groundedEvidence;
      const action = `Incorporate a section addressing "${gap.topic}" in the ${gap.targetSection}.`;

      const actionPayload = {
        analysisId,
        recommendationType: 'SEO_CONTENT_GAP',
        targetUrl,
        keyword,
        currentValue: 'Content gap identified',
        originalSuggestion: action,
        approvedValue: null,
        explanation: { what, why, evidence, action },
        implementationDetails: {
          surface: surfaceType,
          mode: 'CONTENT_BRIEF_OR_EDIT',
          status: 'PENDING_APPROVAL',
        },
        verificationState: {
          status: 'UNVERIFIED',
        },
      };

      try {
        const opp = await prisma.opportunity.upsert({
          where: {
            uq_opportunity_identity_hash: {
              tenantId,
              identityHash,
            },
          },
          create: {
            tenantId,
            brandId,
            webSurfaceId,
            pageId: pageId ?? null,
            storeId: storeId ?? null,
            keywordId: keywordId ?? null,
            type: 'SEO_CONTENT_GAP',
            status: 'OPEN',
            priority: gap.priority as any,
            priorityScore: gap.priority === 'HIGH' ? 70.0 : 55.0,
            confidence: 'HIGH',
            title: `Add ${gap.topic} to Landing Page`,
            summary: `${what} - ${why}`,
            actionType: 'IMPROVE_EXISTING_PAGE',
            actionPayload: actionPayload as any,
            ruleId: 'RULE_SEO_CONTENT_GAP',
            ruleVersion: this.RULE_VERSION,
            identityHash,
          },
          update: {
            title: `Add ${gap.topic} to Landing Page`,
            summary: `${what} - ${why}`,
            actionPayload: actionPayload as any,
            lastEvaluatedAt: new Date(),
          },
        });

        createdOpportunityIds.push(opp.id);
      } catch (err: any) {
        logger.error({ error: err.message }, 'Failed to save SEO_CONTENT_GAP opportunity');
      }
    }

    return createdOpportunityIds;
  }

  private static async syncEvidenceForOpportunity(
    tenantId: string,
    opportunityId: string,
    data: {
      gscEvidence?: GscPageKeywordEvidence | null;
      clientSignals: SeoPageSignals;
      competitors: Array<{ candidate: CompetitorCandidate; signals: SeoPageSignals }>;
      primaryMetric: string;
    }
  ): Promise<void> {
    try {
      // Clear old evidence for idempotency
      await prisma.opportunityEvidence.deleteMany({
        where: { tenantId, opportunityId },
      });

      const evidenceRecords: any[] = [];

      // 1. GSC Evidence item
      if (data.gscEvidence?.available) {
        evidenceRecords.push({
          tenant: { connect: { id: tenantId } },
          opportunity: { connect: { id: opportunityId } },
          source: 'GSC',
          metric: 'impressions',
          value: data.gscEvidence.impressions,
          comparisonValue: data.gscEvidence.comparisonPeriod?.impressions ?? null,
          formattedValue: `${data.gscEvidence.impressions.toLocaleString()} impressions (Avg Rank: ${data.gscEvidence.averagePosition.toFixed(1)})`,
          dateRange: 'Last 30 Days',
          entityType: 'KEYWORD',
          entityLabel: data.gscEvidence.landingPage,
          details: {
            clicks: data.gscEvidence.clicks,
            ctr: data.gscEvidence.ctr,
            averagePosition: data.gscEvidence.averagePosition,
            trend: data.gscEvidence.trend,
            keywordStatus: data.gscEvidence.keywordStatus,
          },
        });
      }

      // 2. Client On-Page Signal item
      evidenceRecords.push({
        tenant: { connect: { id: tenantId } },
        opportunity: { connect: { id: opportunityId } },
        source: 'LOCALBI',
        metric: 'on_page_signals',
        value: data.clientSignals.wordCount,
        formattedValue: `Title: "${data.clientSignals.title || 'NONE'}" (${data.clientSignals.wordCount} words)`,
        entityType: 'PAGE',
        entityLabel: data.clientSignals.url,
        details: {
          title: data.clientSignals.title,
          metaDescription: data.clientSignals.metaDescription,
          h1: data.clientSignals.headings.h1,
          canonical: data.clientSignals.canonical,
          indexable: data.clientSignals.indexability.isIndexable,
        },
      });

      // 3. Competitor Comparison Evidence item
      if (data.competitors.length > 0) {
        evidenceRecords.push({
          tenant: { connect: { id: tenantId } },
          opportunity: { connect: { id: opportunityId } },
          source: 'LOCAL_RANK',
          metric: 'competitor_signals',
          value: data.competitors.length,
          formattedValue: `${data.competitors.length} organic competitors analyzed`,
          entityType: 'KEYWORD',
          details: {
            competitors: data.competitors.map((c) => ({
              domain: c.candidate.domain,
              position: c.candidate.position,
              title: c.signals.title,
              h1: c.signals.headings.h1[0],
            })),
          },
        });
      }

      for (const ev of evidenceRecords) {
        await prisma.opportunityEvidence.create({ data: ev });
      }
    } catch (err: any) {
      logger.warn({ error: err.message, opportunityId }, 'Failed to link evidence records to opportunity');
    }
  }
}
