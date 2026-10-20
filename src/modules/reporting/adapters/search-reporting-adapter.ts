import { Prisma } from '@prisma/client';
import { SearchReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class SearchReportingAdapter {
  /**
   * Builds an isolated SearchReportDto sourced exclusively from Google Search Console and Rank Tracking.
   * STRICT GUARDRAIL: Never mixes or adds GSC clicks with GA4/LocalBi website metrics.
   */
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<SearchReportDto> {
    const { tenant, brand, selectedWebSurface, dateRange, comparisonRange } = context;

    if (!selectedWebSurface) {
      return this.emptyReport('NOT_CONNECTED');
    }

    try {
      const curStart = new Date(dateRange.startDate + 'T00:00:00.000Z');
      const curEnd = new Date(dateRange.endDate + 'T23:59:59.999Z');

      // 1. Identify GSC property mapping
      const gscMapping = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId: tenant.id,
          webSurfaceId: selectedWebSurface.id,
          resource: { provider: 'GOOGLE_SEARCH_CONSOLE' },
        },
      });

      const gscProp = gscMapping
        ? await tx.gscProperty.findFirst({
            where: { tenantId: tenant.id, resourceId: gscMapping.resourceId },
          })
        : await tx.gscProperty.findFirst({
            where: { tenantId: tenant.id },
          });

      if (!gscProp) {
        return this.emptyReport('NOT_CONNECTED');
      }

      // 2. Fetch current period GSC metrics
      const currentGsc = await tx.gscDailyPropertyTotal.findMany({
        where: {
          tenantId: tenant.id,
          propertyId: gscProp.id,
          date: { gte: curStart, lte: curEnd },
        },
        orderBy: { date: 'asc' },
      });

      // 3. Fetch comparison period GSC metrics (if enabled)
      let prevGsc: typeof currentGsc = [];
      if (comparisonRange?.enabled) {
        const prevStart = new Date(comparisonRange.startDate + 'T00:00:00.000Z');
        const prevEnd = new Date(comparisonRange.endDate + 'T23:59:59.999Z');

        prevGsc = await tx.gscDailyPropertyTotal.findMany({
          where: {
            tenantId: tenant.id,
            propertyId: gscProp.id,
            date: { gte: prevStart, lte: prevEnd },
          },
        });
      }

      const curClicks = currentGsc.reduce((sum: number, r) => sum + r.clicks, 0);
      const curImpressions = currentGsc.reduce((sum: number, r) => sum + r.impressions, 0);
      const curSumPos = currentGsc.reduce((sum: number, r) => sum + r.sumPositionImpressions, 0);
      const curCtr = curImpressions > 0 ? (curClicks / curImpressions) * 100 : 0;
      const curPos = curImpressions > 0 ? curSumPos / curImpressions : 0;

      const prevClicks = comparisonRange?.enabled ? prevGsc.reduce((sum: number, r) => sum + r.clicks, 0) : null;
      const prevImpressions = comparisonRange?.enabled ? prevGsc.reduce((sum: number, r) => sum + r.impressions, 0) : null;
      const prevSumPos = comparisonRange?.enabled ? prevGsc.reduce((sum: number, r) => sum + r.sumPositionImpressions, 0) : null;
      const prevCtr =
        comparisonRange?.enabled && prevImpressions && prevImpressions > 0
          ? ((prevClicks || 0) / prevImpressions) * 100
          : null;
      const prevPos =
        comparisonRange?.enabled && prevImpressions && prevImpressions > 0 && prevSumPos !== null
          ? prevSumPos / prevImpressions
          : null;

      // 4. Fetch Top Queries and Pages
      const topQueryRecords = await tx.gscDailyQueryMetric.findMany({
        where: {
          tenantId: tenant.id,
          propertyId: gscProp.id,
          date: { gte: curStart, lte: curEnd },
        },
        include: { query: true },
        orderBy: { clicks: 'desc' },
        take: 10,
      });

      const topPageRecords = await tx.gscDailyPageMetric.findMany({
        where: {
          tenantId: tenant.id,
          propertyId: gscProp.id,
          date: { gte: curStart, lte: curEnd },
        },
        include: { page: true },
        orderBy: { clicks: 'desc' },
        take: 10,
      });

      // 5. Fetch Rank stats for the brand
      const trackedKeywordsCount = await tx.keyword.count({
        where: { tenantId: tenant.id, brandId: brand.id, status: 'ACTIVE' },
      });

      const timeseries = currentGsc.map((r) => {
        const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
        const position = r.impressions > 0 ? r.sumPositionImpressions / r.impressions : 0;
        return {
          date: r.date.toISOString().split('T')[0]!,
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: Number(ctr.toFixed(2)),
          position: Number(position.toFixed(1)),
        };
      });

      const state: ModuleReportState = currentGsc.length > 0 ? 'DATA' : 'NO_DATA';

      return {
        state,
        source: 'GSC',
        metrics: {
          clicks: ComparisonEngine.calculate(curClicks, prevClicks, { decimals: 0 }),
          impressions: ComparisonEngine.calculate(curImpressions, prevImpressions, { decimals: 0 }),
          ctr: ComparisonEngine.calculate(curCtr, prevCtr, { decimals: 1 }),
          averagePosition: ComparisonEngine.calculate(curPos, prevPos, { higherIsBetter: false, decimals: 1 }),
          trackedKeywordsCount,
          top3Coverage: ComparisonEngine.calculate(0, null, { decimals: 1 }),
          averageRank: ComparisonEngine.calculate(0, null, { higherIsBetter: false, decimals: 1 }),
        },
        timeseries,
        topQueries: topQueryRecords.map((q) => {
          const ctr = q.impressions > 0 ? (q.clicks / q.impressions) * 100 : 0;
          const position = q.impressions > 0 ? q.sumPositionImpressions / q.impressions : 0;
          return {
            query: q.query.queryText,
            clicks: q.clicks,
            impressions: q.impressions,
            ctr: Number(ctr.toFixed(2)),
            position: Number(position.toFixed(1)),
          };
        }),
        topPages: topPageRecords.map((p) => {
          const ctr = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0;
          const position = p.impressions > 0 ? p.sumPositionImpressions / p.impressions : 0;
          return {
            path: p.page.fullUrl,
            clicks: p.clicks,
            impressions: p.impressions,
            ctr: Number(ctr.toFixed(2)),
            position: Number(position.toFixed(1)),
          };
        }),
      };
    } catch {
      return this.emptyReport('UPSTREAM_ERROR');
    }
  }

  public static emptyReport(state: ModuleReportState = 'NO_DATA'): SearchReportDto {
    return {
      state,
      source: 'GSC',
      metrics: {
        clicks: ComparisonEngine.calculate(0, null, { decimals: 0 }),
        impressions: ComparisonEngine.calculate(0, null, { decimals: 0 }),
        ctr: ComparisonEngine.calculate(0, null, { decimals: 1 }),
        averagePosition: ComparisonEngine.calculate(0, null, { higherIsBetter: false, decimals: 1 }),
        trackedKeywordsCount: 0,
        top3Coverage: ComparisonEngine.calculate(0, null, { decimals: 1 }),
        averageRank: ComparisonEngine.calculate(0, null, { higherIsBetter: false, decimals: 1 }),
      },
      timeseries: [],
      topQueries: [],
      topPages: [],
    };
  }
}
