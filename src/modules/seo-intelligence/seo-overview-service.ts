import { prisma } from '@/shared/database/client';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { SeoAnalysisRepository } from './seo-analysis-repository';

export interface SeoOverviewStats {
  searchClicks: number;
  searchImpressions: number;
  averageCtr: number;
  averagePosition: number;
  trackedKeywordsCount: number;
  openOpportunitiesCount: number;
  pendingApprovalsCount: number;
  recentAnalyses: any[];
}

export class SeoOverviewService {
  /**
   * Aggregates factual SEO overview statistics across GSC, Opportunities, and Analysis history.
   * NO FAKE HEALTH SCORE. All figures are direct observed aggregates.
   */
  public static async getOverview(
    tenantId: string,
    brandId?: string,
    context?: AuthorizedContext
  ): Promise<SeoOverviewStats> {
    if (context) {
      AuthorizationService.assertCan(context, Action.SEO_ANALYZE);
      if (brandId) {
        AuthorizationService.assertBrandAccess(context, brandId);
      }
    }

    // 1. GSC Totals over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const gscTotals = await prisma.gscDailyPropertyTotal.findMany({
      where: {
        tenantId,
        date: { gte: thirtyDaysAgo },
      },
    });

    const totalClicks = gscTotals.reduce((sum, t) => sum + t.clicks, 0);
    const totalImpressions = gscTotals.reduce((sum, t) => sum + t.impressions, 0);
    const totalSumPos = gscTotals.reduce((sum, t) => sum + t.sumPositionImpressions, 0);

    const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const averagePosition = totalImpressions > 0 ? totalSumPos / totalImpressions : 0;

    // 2. Tracked Keywords count
    const kwWhere: any = { tenantId };
    const trackedKeywordsCount = await prisma.keyword.count({ where: kwWhere });

    // 3. Open SEO Opportunities & Pending Approvals
    const oppWhere: any = {
      tenantId,
      type: { in: ['SEO_META_TITLE', 'SEO_META_DESCRIPTION', 'SEO_CONTENT_GAP', 'SEO_INTERNAL_LINK', 'SEO_SCHEMA'] },
    };
    if (brandId) oppWhere.brandId = brandId;

    const openOpportunitiesCount = await prisma.opportunity.count({
      where: { ...oppWhere, status: 'OPEN' },
    });

    const pendingApprovalsCount = await prisma.opportunity.count({
      where: {
        ...oppWhere,
        status: { in: ['OPEN', 'IN_REVIEW'] },
      },
    });

    // 4. Recent Analyses
    const recentAnalyses = await SeoAnalysisRepository.listByTenant(tenantId, brandId, 10);

    return {
      searchClicks: totalClicks,
      searchImpressions: totalImpressions,
      averageCtr,
      averagePosition,
      trackedKeywordsCount,
      openOpportunitiesCount,
      pendingApprovalsCount,
      recentAnalyses,
    };
  }
}
