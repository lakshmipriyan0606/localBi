import { Prisma } from '@prisma/client';
import { RankReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class RankReportingAdapter {
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<RankReportDto> {
    const { tenant, brand, selectedStoreIds, comparisonRange } = context;

    try {
      const storeFilter = selectedStoreIds.length > 0 ? { storeId: { in: selectedStoreIds } } : {};

      // 1. Fetch active keywords for this brand
      const keywords = await tx.keyword.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          status: 'ACTIVE',
        },
        select: { id: true, term: true },
      });

      const keywordIds = keywords.map((k) => k.id);
      if (keywordIds.length === 0) {
        return this.emptyReport('NOT_CONNECTED');
      }

      // 2. Fetch latest rank summaries
      const summaries = await tx.rankRunSummary.findMany({
        where: {
          tenantId: tenant.id,
          keywordId: { in: keywordIds },
          ...storeFilter,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (summaries.length === 0) {
        return {
          state: 'NO_DATA',
          metrics: {
            trackedKeywords: keywordIds.length,
            top3Coverage: ComparisonEngine.calculate(0, null),
            top10Coverage: ComparisonEngine.calculate(0, null),
            foundCoverage: ComparisonEngine.calculate(0, null),
            averageFoundRank: ComparisonEngine.calculatePositionDelta(0, null),
          },
          topKeywords: [],
        };
      }

      // Check staleness (latest run > 7 days old)
      const latestRunAt = summaries[0]!.createdAt;
      const isStale = Date.now() - latestRunAt.getTime() > 7 * 24 * 60 * 60 * 1000;

      // Deduplicate to latest summary per keyword
      const latestSummaryPerKeyword = new Map<string, typeof summaries[0]>();
      for (const s of summaries) {
        if (!latestSummaryPerKeyword.has(s.keywordId)) {
          latestSummaryPerKeyword.set(s.keywordId, s);
        }
      }

      const activeSummaries = Array.from(latestSummaryPerKeyword.values());

      const top3Avg = activeSummaries.reduce((sum, s) => sum + s.top3Coverage, 0) / activeSummaries.length;
      const top10Avg = activeSummaries.reduce((sum, s) => sum + s.top10Coverage, 0) / activeSummaries.length;
      
      const totalValid = activeSummaries.reduce((sum, s) => sum + s.validCheckedPoints, 0);
      const totalFound = activeSummaries.reduce((sum, s) => sum + s.foundPoints, 0);
      const foundCoverage = totalValid > 0 ? (totalFound / totalValid) * 100 : 0;

      const validRanks = activeSummaries.filter((s) => s.averageFoundRank !== null);
      const avgFoundRank = validRanks.length > 0
        ? validRanks.reduce((sum, s) => sum + (s.averageFoundRank || 0), 0) / validRanks.length
        : 0;

      const baseline = comparisonRange?.label;

      const topKeywords = activeSummaries.slice(0, 5).map((s) => {
        const kw = keywords.find((k) => k.id === s.keywordId);
        return {
          keyword: kw?.term || 'Unknown keyword',
          top3Rate: Number(s.top3Coverage.toFixed(1)),
          avgRank: Number((s.averageFoundRank || 0).toFixed(1)),
        };
      });

      const state: ModuleReportState = isStale ? 'STALE' : 'DATA';

      return {
        state,
        metrics: {
          trackedKeywords: keywordIds.length,
          top3Coverage: ComparisonEngine.calculate(Number(top3Avg.toFixed(1)), null, { baselineLabel: baseline }),
          top10Coverage: ComparisonEngine.calculate(Number(top10Avg.toFixed(1)), null, { baselineLabel: baseline }),
          foundCoverage: ComparisonEngine.calculate(Number(foundCoverage.toFixed(1)), null, { baselineLabel: baseline }),
          averageFoundRank: ComparisonEngine.calculatePositionDelta(Number(avgFoundRank.toFixed(1)), null, baseline),
        },
        topKeywords,
      };
    } catch (err) {
      return this.emptyReport('UPSTREAM_ERROR');
    }
  }

  private static emptyReport(state: ModuleReportState): RankReportDto {
    return {
      state,
      metrics: {
        trackedKeywords: 0,
        top3Coverage: ComparisonEngine.calculate(0, null),
        top10Coverage: ComparisonEngine.calculate(0, null),
        foundCoverage: ComparisonEngine.calculate(0, null),
        averageFoundRank: ComparisonEngine.calculatePositionDelta(0, null),
      },
      topKeywords: [],
    };
  }
}
