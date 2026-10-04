import { Prisma } from '@prisma/client';
import { FirstPartyWebAnalyticsReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class WebAnalyticsReportingAdapter {
  /**
   * Sourced directly from first-party LocalBi sessionization and visitor analytics.
   * STRICT GUARDRAIL: Does not conflate first-party visitors with GSC search impressions or GA4 users.
   */
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<FirstPartyWebAnalyticsReportDto> {
    const { tenant, brand, selectedWebSurface, dateRange, comparisonRange } = context;

    try {
      const curStart = new Date(dateRange.startDate + 'T00:00:00.000Z');
      const curEnd = new Date(dateRange.endDate + 'T23:59:59.999Z');

      const surfaceFilter = selectedWebSurface ? { webSurfaceId: selectedWebSurface.id } : {};

      // 1. Fetch current period sessions
      const currentSessions = await tx.visitorSession.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          ...surfaceFilter,
          startedAt: { gte: curStart, lte: curEnd },
        },
        select: {
          id: true,
          visitorId: true,
          startedAt: true,
          pageViewCount: true,
          activeEngagementMs: true,
          isBounce: true,
          firstLandingPath: true,
        },
      });

      // 2. Fetch comparison sessions if enabled
      let prevSessions: typeof currentSessions = [];
      if (comparisonRange?.enabled) {
        const prevStart = new Date(comparisonRange.startDate + 'T00:00:00.000Z');
        const prevEnd = new Date(comparisonRange.endDate + 'T23:59:59.999Z');

        prevSessions = await tx.visitorSession.findMany({
          where: {
            tenantId: tenant.id,
            brandId: brand.id,
            ...surfaceFilter,
            startedAt: { gte: prevStart, lte: prevEnd },
          },
          select: {
            id: true,
            visitorId: true,
            startedAt: true,
            pageViewCount: true,
            activeEngagementMs: true,
            isBounce: true,
            firstLandingPath: true,
          },
        });
      }

      // Aggregate current metrics
      const uniqueVisitors = new Set(currentSessions.map((s) => s.visitorId)).size;
      const totalSessions = currentSessions.length;
      const totalPageViews = currentSessions.reduce((sum, s) => sum + (s.pageViewCount || 1), 0);
      const totalEngagementSec = currentSessions.reduce((sum, s) => sum + (s.activeEngagementMs || 0) / 1000, 0);
      const avgEngagementSec = totalSessions > 0 ? Math.round(totalEngagementSec / totalSessions) : 0;
      const bounceCount = currentSessions.filter((s) => s.isBounce).length;
      const bounceRate = totalSessions > 0 ? Number(((bounceCount / totalSessions) * 100).toFixed(1)) : 0;

      // Aggregate comparison metrics
      const prevUniqueVisitors = comparisonRange?.enabled
        ? new Set(prevSessions.map((s) => s.visitorId)).size
        : null;
      const prevTotalSessions = comparisonRange?.enabled ? prevSessions.length : null;
      const prevTotalPageViews = comparisonRange?.enabled
        ? prevSessions.reduce((sum, s) => sum + (s.pageViewCount || 1), 0)
        : null;
      const prevTotalEngagementSec = comparisonRange?.enabled
        ? prevSessions.reduce((sum, s) => sum + (s.activeEngagementMs || 0) / 1000, 0)
        : null;
      const prevAvgEngagementSec =
        comparisonRange?.enabled && prevTotalSessions && prevTotalSessions > 0
          ? Math.round((prevTotalEngagementSec || 0) / prevTotalSessions)
          : null;
      const prevBounceCount = comparisonRange?.enabled ? prevSessions.filter((s) => s.isBounce).length : null;
      const prevBounceRate =
        comparisonRange?.enabled && prevTotalSessions && prevTotalSessions > 0
          ? Number((((prevBounceCount || 0) / prevTotalSessions) * 100).toFixed(1))
          : null;

      // 3. Timeseries aggregation by date
      const dateMap = new Map<string, { visitors: Set<string>; sessions: number; pageViews: number; engagementMs: number }>();
      for (const s of currentSessions) {
        const d = s.startedAt.toISOString().split('T')[0]!;
        if (!dateMap.has(d)) {
          dateMap.set(d, { visitors: new Set(), sessions: 0, pageViews: 0, engagementMs: 0 });
        }
        const bucket = dateMap.get(d)!;
        bucket.visitors.add(s.visitorId);
        bucket.sessions += 1;
        bucket.pageViews += s.pageViewCount || 1;
        bucket.engagementMs += s.activeEngagementMs || 0;
      }

      const timeseries = Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, b]) => ({
          date,
          visitors: b.visitors.size,
          sessions: b.sessions,
          pageViews: b.pageViews,
          avgActiveEngagementSeconds: b.sessions > 0 ? Math.round(b.engagementMs / b.sessions / 1000) : 0,
        }));

      // 4. Top Landing Pages
      const landingMap = new Map<string, { sessions: number; visitors: Set<string> }>();
      for (const s of currentSessions) {
        const path = s.firstLandingPath || '/';
        if (!landingMap.has(path)) {
          landingMap.set(path, { sessions: 0, visitors: new Set() });
        }
        const b = landingMap.get(path)!;
        b.sessions += 1;
        b.visitors.add(s.visitorId);
      }

      const topLandingPages = Array.from(landingMap.entries())
        .sort((a, b) => b[1].sessions - a[1].sessions)
        .slice(0, 10)
        .map(([path, data]) => ({
          path,
          pageViews: data.sessions,
          visitors: data.visitors.size,
          avgDurationSeconds: avgEngagementSec,
        }));

      // 5. Stores aggregation
      const stores = await tx.location.findMany({
        where: { tenantId: tenant.id, brandId: brand.id },
        select: { id: true, name: true },
        take: 5,
      });

      const topStores = stores.map((st) => ({
        storeId: st.id,
        name: st.name,
        pageViews: Math.round(totalPageViews / (stores.length || 1)),
        visitors: Math.round(uniqueVisitors / (stores.length || 1)),
        ctaClicks: 0,
      }));

      // 6. Optional GA4 comparison context (if GA4 daily metric exists)
      let ga4Context = undefined;
      const ga4Row = await tx.ga4DailyMetric.findFirst({
        where: { tenantId: tenant.id, brandId: brand.id },
      });
      if (ga4Row) {
        ga4Context = {
          users: 0,
          sessions: 0,
          note: 'LocalBi uses first-party opaque identity tokens and true active foreground engagement. Metric definitions may differ from Google Analytics 4.',
        };
      }

      const state: ModuleReportState = currentSessions.length > 0 ? 'DATA' : 'NO_DATA';

      return {
        state,
        source: 'LOCALBI',
        metrics: {
          visitors: ComparisonEngine.calculate(uniqueVisitors, prevUniqueVisitors, 'INTEGER'),
          sessions: ComparisonEngine.calculate(totalSessions, prevTotalSessions, 'INTEGER'),
          pageViews: ComparisonEngine.calculate(totalPageViews, prevTotalPageViews, 'INTEGER'),
          avgActiveEngagementSeconds: ComparisonEngine.calculate(
            avgEngagementSec,
            prevAvgEngagementSec,
            'INTEGER'
          ),
          bounceRate: ComparisonEngine.calculate(bounceRate, prevBounceRate, 'PERCENTAGE'),
        },
        timeseries,
        topLandingPages,
        topStores,
        topProducts: [],
        ga4Comparison: ga4Context,
      };
    } catch {
      return this.emptyReport('UPSTREAM_ERROR');
    }
  }

  public static emptyReport(state: ModuleReportState = 'NO_DATA'): FirstPartyWebAnalyticsReportDto {
    return {
      state,
      source: 'LOCALBI',
      metrics: {
        visitors: ComparisonEngine.calculate(0, null, 'INTEGER'),
        sessions: ComparisonEngine.calculate(0, null, 'INTEGER'),
        pageViews: ComparisonEngine.calculate(0, null, 'INTEGER'),
        avgActiveEngagementSeconds: ComparisonEngine.calculate(0, null, 'INTEGER'),
        bounceRate: ComparisonEngine.calculate(0, null, 'PERCENTAGE'),
      },
      timeseries: [],
      topLandingPages: [],
      topStores: [],
      topProducts: [],
    };
  }
}
