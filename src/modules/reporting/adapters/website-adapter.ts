import { Prisma } from '@prisma/client';
import { WebsiteReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class WebsiteReportingAdapter {
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<WebsiteReportDto> {
    const { tenant, brand, selectedWebSurface, dateRange, comparisonRange } = context;

    if (!selectedWebSurface) {
      return this.emptyReport('NOT_CONNECTED');
    }

    try {
      const curStart = new Date(dateRange.startDate + 'T00:00:00.000Z');
      const curEnd = new Date(dateRange.endDate + 'T23:59:59.999Z');

      // 1. Fetch current period GA4 metrics
      const currentGa4 = await tx.ga4DailyMetric.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          webSurfaceId: selectedWebSurface.id,
          date: { gte: curStart, lte: curEnd },
        },
      });

      // 2. Fetch comparison period GA4 metrics (if enabled)
      let prevGa4: typeof currentGa4 = [];
      if (comparisonRange?.enabled) {
        const prevStart = new Date(comparisonRange.startDate + 'T00:00:00.000Z');
        const prevEnd = new Date(comparisonRange.endDate + 'T23:59:59.999Z');

        prevGa4 = await tx.ga4DailyMetric.findMany({
          where: {
            tenantId: tenant.id,
            brandId: brand.id,
            webSurfaceId: selectedWebSurface.id,
            date: { gte: prevStart, lte: prevEnd },
          },
        });
      }

      // Sum GA4 metrics (using activeUsers, sessions, screenPageViews)
      const curUsers = currentGa4.reduce((sum, r) => sum + r.activeUsers, 0);
      const curSessions = currentGa4.reduce((sum, r) => sum + r.sessions, 0);
      const curPageViews = currentGa4.reduce((sum, r) => sum + (r.screenPageViews || 0), 0);

      const prevUsers = comparisonRange?.enabled ? prevGa4.reduce((sum, r) => sum + r.activeUsers, 0) : null;
      const prevSessions = comparisonRange?.enabled ? prevGa4.reduce((sum, r) => sum + r.sessions, 0) : null;
      const prevPageViews = comparisonRange?.enabled ? prevGa4.reduce((sum, r) => sum + (r.screenPageViews || 0), 0) : null;

      // 3. Fetch GSC metrics for date ranges
      const gscMapping = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId: tenant.id,
          webSurfaceId: selectedWebSurface.id,
          resource: {
            provider: 'GOOGLE_SEARCH_CONSOLE',
          },
        },
      });

      const gscProp = gscMapping
        ? await tx.gscProperty.findFirst({
            where: {
              tenantId: tenant.id,
              resourceId: gscMapping.resourceId,
            },
          })
        : await tx.gscProperty.findFirst({
            where: {
              tenantId: tenant.id,
            },
          });

      let curClicks = 0;
      let curImpressions = 0;
      let curCtr = 0;
      let curPosition = 0;
      let prevClicks: number | null = null;
      let prevImpressions: number | null = null;
      let prevCtr: number | null = null;
      let prevPosition: number | null = null;

      const currentGsc = gscProp
        ? await tx.gscDailyPropertyTotal.findMany({
            where: {
              tenantId: tenant.id,
              propertyId: gscProp.id,
              date: { gte: curStart, lte: curEnd },
            },
          })
        : [];

      if (currentGsc.length > 0) {
        curClicks = currentGsc.reduce((sum, r) => sum + r.clicks, 0);
        curImpressions = currentGsc.reduce((sum, r) => sum + r.impressions, 0);
        curCtr = curImpressions > 0 ? (curClicks / curImpressions) * 100 : 0;
        const curSumPos = currentGsc.reduce((sum, r) => sum + r.sumPositionImpressions, 0);
        curPosition = curImpressions > 0 ? curSumPos / curImpressions : 0;
      }

      if (comparisonRange?.enabled && gscProp) {
        const prevStart = new Date(comparisonRange.startDate + 'T00:00:00.000Z');
        const prevEnd = new Date(comparisonRange.endDate + 'T23:59:59.999Z');

        const prevGsc = await tx.gscDailyPropertyTotal.findMany({
          where: {
            tenantId: tenant.id,
            propertyId: gscProp.id,
            date: { gte: prevStart, lte: prevEnd },
          },
        });

        if (prevGsc.length > 0) {
          prevClicks = prevGsc.reduce((sum, r) => sum + r.clicks, 0);
          prevImpressions = prevGsc.reduce((sum, r) => sum + r.impressions, 0);
          prevCtr = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : null;
          const prevSumPos = prevGsc.reduce((sum, r) => sum + r.sumPositionImpressions, 0);
          prevPosition = prevImpressions > 0 ? prevSumPos / prevImpressions : null;
        }
      }

      const baseline = comparisonRange?.label;

      // 4. Construct timeseries map
      const dateMap = new Map<string, { date: string; users: number; sessions: number; clicks: number; impressions: number }>();
      for (const row of currentGa4) {
        const dStr = row.date.toISOString().slice(0, 10);
        dateMap.set(dStr, {
          date: dStr,
          users: row.activeUsers,
          sessions: row.sessions,
          clicks: 0,
          impressions: 0,
        });
      }
      for (const row of currentGsc) {
        const dStr = row.date.toISOString().slice(0, 10);
        const existing = dateMap.get(dStr) || {
          date: dStr,
          users: 0,
          sessions: 0,
          clicks: 0,
          impressions: 0,
        };
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        dateMap.set(dStr, existing);
      }

      const timeseries = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      const hasData = curUsers > 0 || curSessions > 0 || curClicks > 0 || curImpressions > 0;
      const state: ModuleReportState = hasData ? 'DATA' : 'NO_DATA';

      return {
        state,
        webSurfaceType: selectedWebSurface.type,
        webSurfaceId: selectedWebSurface.id,
        metrics: {
          users: ComparisonEngine.calculate(curUsers, prevUsers, { baselineLabel: baseline }),
          sessions: ComparisonEngine.calculate(curSessions, prevSessions, { baselineLabel: baseline }),
          pageViews: ComparisonEngine.calculate(curPageViews, prevPageViews, { baselineLabel: baseline }),
          gscClicks: ComparisonEngine.calculate(curClicks, prevClicks, { baselineLabel: baseline }),
          gscImpressions: ComparisonEngine.calculate(curImpressions, prevImpressions, { baselineLabel: baseline }),
          ctr: ComparisonEngine.calculate(curCtr, prevCtr, { baselineLabel: baseline }),
          averagePosition: ComparisonEngine.calculatePositionDelta(curPosition, prevPosition, baseline),
        },
        timeseries,
        topQueries: [],
        topPages: [],
      };
    } catch (err) {
      return this.emptyReport('UPSTREAM_ERROR');
    }
  }

  private static emptyReport(state: ModuleReportState): WebsiteReportDto {
    return {
      state,
      webSurfaceType: 'LOCALBI',
      webSurfaceId: '',
      metrics: {
        users: ComparisonEngine.calculate(0, null),
        sessions: ComparisonEngine.calculate(0, null),
        pageViews: ComparisonEngine.calculate(0, null),
        gscClicks: ComparisonEngine.calculate(0, null),
        gscImpressions: ComparisonEngine.calculate(0, null),
        ctr: ComparisonEngine.calculate(0, null),
        averagePosition: ComparisonEngine.calculatePositionDelta(0, null),
      },
      timeseries: [],
      topQueries: [],
      topPages: [],
    };
  }
}
