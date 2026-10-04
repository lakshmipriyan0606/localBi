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
      const currentGsc = await tx.gscDailyPerformance.findMany({
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

        prevGsc = await tx.gscDailyPerformance.findMany({
          where: {
            tenantId: tenant.id,
            propertyId: gscProp.id,
            date: { gte: prevStart, lte: prevEnd },
          },
        });
      }

      const curClicks = currentGsc.reduce((sum, r) => sum + r.clicks, 0);
      const curImpressions = currentGsc.reduce((sum, r) => sum + r.impressions, 0);
      const curCtr = curImpressions > 0 ? (curClicks / curImpressions) * 100 : 0;
      const curPos =
        currentGsc.length > 0
          ? currentGsc.reduce((sum, r) => sum + r.position, 0) / currentGsc.length
          : 0;

      const prevClicks = comparisonRange?.enabled ? prevGsc.reduce((sum, r) => sum + r.clicks, 0) : null;
      const prevImpressions = comparisonRange?.enabled ? prevGsc.reduce((sum, r) => sum + r.impressions, 0) : null;
      const prevCtr =
        comparisonRange?.enabled && prevImpressions && prevImpressions > 0
          ? ((prevClicks || 0) / prevImpressions) * 100
          : null;
      const prevPos =
        comparisonRange?.enabled && prevGsc.length > 0
          ? prevGsc.reduce((sum, r) => sum + r.position, 0) / prevGsc.length
          : null;

      // 4. Fetch Top Queries and Pages
      const topQueryRecords = await tx.gscQueryPerformance.findMany({
        where: {
          tenantId: tenant.id,
          propertyId: gscProp.id,
          date: { gte: curStart, lte: curEnd },
        },
        orderBy: { clicks: 'desc' },
        take: 10,
      });

      const topPageRecords = await tx.gscPagePerformance.findMany({
        where: {
          tenantId: tenant.id,
          propertyId: gscProp.id,
          date: { gte: curStart, lte: curEnd },
        },
        orderBy: { clicks: 'desc' },
        take: 10,
      });

      // 5. Fetch Rank stats for the brand
      const trackedKeywordsCount = await tx.keyword.count({
        where: { tenantId: tenant.id, brandId: brand.id, status: 'ACTIVE' },
      });

      const timeseries = currentGsc.map((r) => ({
        date: r.date.toISOString().split('T')[0]!,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Number(r.ctr.toFixed(2)),
        position: Number(r.position.toFixed(1)),
      }));

      const state: ModuleReportState = currentGsc.length > 0 ? 'DATA' : 'NO_DATA';

      return {
        state,
        source: 'GSC',
        metrics: {
          clicks: ComparisonEngine.calculate(curClicks, prevClicks, 'INTEGER'),
          impressions: ComparisonEngine.calculate(curImpressions, prevImpressions, 'INTEGER'),
          ctr: ComparisonEngine.calculate(curCtr, prevCtr, 'PERCENTAGE'),
          averagePosition: ComparisonEngine.calculate(curPos, prevPos, 'POSITION'),
          trackedKeywordsCount,
          top3Coverage: ComparisonEngine.calculate(0, null, 'PERCENTAGE'),
          averageRank: ComparisonEngine.calculate(0, null, 'POSITION'),
        },
        timeseries,
        topQueries: topQueryRecords.map((q) => ({
          query: q.query,
          clicks: q.clicks,
          impressions: q.impressions,
          ctr: Number(q.ctr.toFixed(2)),
          position: Number(q.position.toFixed(1)),
        })),
        topPages: topPageRecords.map((p) => ({
          path: p.page,
          clicks: p.clicks,
          impressions: p.impressions,
          ctr: Number(p.ctr.toFixed(2)),
          position: Number(p.position.toFixed(1)),
        })),
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
        clicks: ComparisonEngine.calculate(0, null, 'INTEGER'),
        impressions: ComparisonEngine.calculate(0, null, 'INTEGER'),
        ctr: ComparisonEngine.calculate(0, null, 'PERCENTAGE'),
        averagePosition: ComparisonEngine.calculate(0, null, 'POSITION'),
        trackedKeywordsCount: 0,
        top3Coverage: ComparisonEngine.calculate(0, null, 'PERCENTAGE'),
        averageRank: ComparisonEngine.calculate(0, null, 'POSITION'),
      },
      timeseries: [],
      topQueries: [],
      topPages: [],
    };
  }
}
