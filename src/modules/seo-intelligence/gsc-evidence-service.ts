import crypto from 'node:crypto';
import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import { GscPageKeywordEvidence, SeoKeywordStatus } from './seo-types';

export class GscEvidenceService {
  /**
   * Retrieves aggregate Search Console performance for target page and keyword.
   * If GSC is unlinked or returns zero data, safely returns partial state.
   * NEVER invents fake metrics or throws fatal exceptions.
   */
  public static async getEvidence(params: {
    tenantId: string;
    brandId: string;
    webSurfaceId: string;
    targetUrl: string;
    keyword: string;
  }): Promise<GscPageKeywordEvidence> {
    const { tenantId, brandId, webSurfaceId, targetUrl, keyword } = params;

    try {
      // 1. Locate GSC property mapping via ResourceMapping
      const mapping = await prisma.resourceMapping.findFirst({
        where: {
          tenantId,
          resourceType: 'GSC_PROPERTY',
          OR: [
            { localType: 'WEB_SURFACE', localId: webSurfaceId },
            { localType: 'BRAND', localId: brandId },
          ],
        },
      });

      if (!mapping || !mapping.externalId) {
        return {
          available: false,
          status: 'UNLINKED',
          clicks: 0,
          impressions: 0,
          ctr: 0,
          averagePosition: 0,
          landingPage: targetUrl,
          keywordStatus: SeoKeywordStatus.NOT_PRESENT_IN_AVAILABLE_GSC_DATA,
        };
      }

      const propertyId = mapping.externalId;
      const queryHash = crypto.createHash('sha256').update(keyword.trim().toLowerCase()).digest('hex');

      // 2. Query aggregate metrics for keyword query over the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // Find GscQuery record
      const gscQuery = await prisma.gscQuery.findFirst({
        where: {
          tenantId,
          propertyId,
          queryHash,
        },
      });

      if (!gscQuery) {
        return {
          available: false,
          status: 'NO_DATA',
          clicks: 0,
          impressions: 0,
          ctr: 0,
          averagePosition: 0,
          landingPage: targetUrl,
          keywordStatus: SeoKeywordStatus.NOT_PRESENT_IN_AVAILABLE_GSC_DATA,
        };
      }

      // Aggregate recent 30-day window
      const recentMetrics = await prisma.gscDailyQueryMetric.findMany({
        where: {
          tenantId,
          propertyId,
          queryId: gscQuery.id,
          date: { gte: thirtyDaysAgo },
        },
      });

      if (recentMetrics.length === 0) {
        return {
          available: true,
          status: 'AVAILABLE',
          clicks: 0,
          impressions: 0,
          ctr: 0,
          averagePosition: 0,
          landingPage: targetUrl,
          keywordStatus: SeoKeywordStatus.NOT_PRESENT_IN_AVAILABLE_GSC_DATA,
        };
      }

      const totalClicks = recentMetrics.reduce((sum, m) => sum + m.clicks, 0);
      const totalImpressions = recentMetrics.reduce((sum, m) => sum + m.impressions, 0);
      const totalSumPosImp = recentMetrics.reduce((sum, m) => sum + m.sumPositionImpressions, 0);

      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const avgPos = totalImpressions > 0 ? totalSumPosImp / totalImpressions : 0;

      // Aggregate prior comparison window (31-60 days ago) for trend
      const priorMetrics = await prisma.gscDailyQueryMetric.findMany({
        where: {
          tenantId,
          propertyId,
          queryId: gscQuery.id,
          date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      });

      let trend: 'IMPROVING' | 'DECLINING' | 'STABLE' | null = null;
      let comparisonPeriod = null;

      if (priorMetrics.length > 0) {
        const priorClicks = priorMetrics.reduce((sum, m) => sum + m.clicks, 0);
        const priorImpressions = priorMetrics.reduce((sum, m) => sum + m.impressions, 0);
        const priorSumPos = priorMetrics.reduce((sum, m) => sum + m.sumPositionImpressions, 0);
        const priorAvgPos = priorImpressions > 0 ? priorSumPos / priorImpressions : 0;

        comparisonPeriod = {
          clicks: priorClicks,
          impressions: priorImpressions,
          ctr: priorImpressions > 0 ? priorClicks / priorImpressions : 0,
          averagePosition: priorAvgPos,
        };

        if (avgPos < priorAvgPos - 1.5) {
          trend = 'IMPROVING';
        } else if (avgPos > priorAvgPos + 1.5) {
          trend = 'DECLINING';
        } else {
          trend = 'STABLE';
        }
      }

      // Keyword status categorization
      let keywordStatus: SeoKeywordStatusValue = SeoKeywordStatus.STABLE;
      if (totalImpressions >= 100 && ctr < 0.02) {
        keywordStatus = SeoKeywordStatus.HIGH_IMPRESSIONS_LOW_CTR;
      } else if (trend === 'IMPROVING') {
        keywordStatus = SeoKeywordStatus.IMPROVING;
      } else if (trend === 'DECLINING') {
        keywordStatus = SeoKeywordStatus.DECLINING;
      } else if (avgPos > 0 && avgPos <= 20) {
        keywordStatus = SeoKeywordStatus.RANKING;
      }

      return {
        available: true,
        status: 'AVAILABLE',
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr,
        averagePosition: avgPos,
        landingPage: targetUrl,
        comparisonPeriod,
        trend,
        keywordStatus,
      };
    } catch (err: any) {
      logger.warn({ error: err.message, targetUrl, keyword }, '[GscEvidenceService] Error reading GSC data');
      return {
        available: false,
        status: 'ERROR',
        clicks: 0,
        impressions: 0,
        ctr: 0,
        averagePosition: 0,
        landingPage: targetUrl,
        keywordStatus: SeoKeywordStatus.NOT_PRESENT_IN_AVAILABLE_GSC_DATA,
        error: err.message,
      };
    }
  }
}
