import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import {
  AuthorizedContext,
  ScopeMode,
} from '@/shared/authorization/policy';
import {
  createBrandAccessDeniedError,
  createLocationAccessDeniedError,
  createResourceNotFoundError,
  createTenantAccessDeniedError,
} from '@/shared/errors';
import { AnalyticsUrlNormalizer } from '@/modules/analytics/url-normalizer';

export interface PerformanceSummaryParams {
  tenantId: string;
  brandId: string;
  locationId?: string | undefined;
  webSurfaceId?: string | undefined;
  mode?: 'LOCALBI' | 'ORIGINAL' | 'COMPARE' | undefined;
  startDate: string;
  endDate: string;
  context: AuthorizedContext;
}

export interface PerformanceSummaryDto {
  source: 'GOOGLE_SEARCH_CONSOLE' | 'GOOGLE_BUSINESS_PROFILE';
  webSurfaceId?: string | undefined;
  webSurfaceType?: string | undefined;
  isDomainProperty?: boolean | undefined;
  urlPrefixFilter?: string | null | undefined;
  period: {
    startDate: string;
    endDate: string;
  };
  gsc: {
    totalClicks: number;
    totalImpressions: number;
    ctr: number; // calculated as clicks / impressions
    averagePosition: number;
  };
  gbp: {
    status?: 'ready' | 'empty' | 'not_configured' | 'partial' | undefined;
    mappedLocationsCount?: number | undefined;
    totalLocationsCount?: number | undefined;
    totalSearchViews: number;
    totalMapsViews: number;
    totalViews: number;
    websiteClicks: number;
    callClicks: number;
    directionRequests: number;
  };
  previousPeriod?: {
    clicksGrowthPercent?: number | undefined;
    impressionsGrowthPercent?: number | undefined;
    viewsGrowthPercent?: number | undefined;
    callsGrowthPercent?: number | undefined;
    directionsGrowthPercent?: number | undefined;
    websiteClicksGrowthPercent?: number | undefined;
  } | undefined;
}

export interface TimeseriesPoint {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  views: number;
  calls: number;
  websiteClicks: number;
  directions: number;
}

export interface QueryDimensionRow {
  queryText: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PageDimensionRow {
  fullUrl: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface DeviceDimensionRow {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position?: number;
}

export interface CountryDimensionRow {
  countryCode: string;
  countryName: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface DateDimensionRow {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  dataState: 'FINAL' | 'FRESH';
}

export interface GbpLocationBreakdownRow {
  locationId: string;
  locationName: string;
  storeCode: string | null;
  city: string;
  searchViews: number;
  mapsViews: number;
  totalViews: number;
  callClicks: number;
  websiteClicks: number;
  directionRequests: number;
}

export interface GbpSearchKeywordRow {
  keyword: string;
  month: string;
  impressions: number;
  impressionsText: string;
  isThreshold: boolean;
}

export interface DrilldownParams extends PerformanceSummaryParams {
  dimension: 'query' | 'page' | 'country' | 'device' | 'date' | 'location' | 'search-keywords';
  search?: string | undefined;
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export class ReportingService {
  /**
   * Generates aggregated summary metrics across GSC and GBP with strict scope enforcement.
   */
  public static async getPerformanceSummary(params: PerformanceSummaryParams): Promise<PerformanceSummaryDto> {
    const { tenantId, brandId, locationId, startDate, endDate, context } = params;

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Resolve brand, GSC property IDs, and permitted location IDs with surface awareness
      const { propertyIds, allowedLocationIds, targetSurface, isDomainProperty, urlPrefixFilter } =
        await this.resolveReportingContext(tx, {
          tenantId,
          brandId,
          locationId,
          webSurfaceId: params.webSurfaceId,
          mode: params.mode,
          context,
        });

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Aggregate current and previous period metrics in parallel
      const durationMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - durationMs);
      const prevEnd = new Date(start.getTime());

      let totalClicks = 0;
      let totalImpressions = 0;
      let sumPositionImpressions = 0;
      let prevGscClicks = 0;
      let prevGscImpressions = 0;

      const [currentGbpMetrics, prevGbpMetrics, gbpLocationMappings] = await Promise.all([
        allowedLocationIds.length > 0
          ? tx.gbpDailyMetric.findMany({
              where: { tenantId, locationId: { in: allowedLocationIds }, date: { gte: start, lte: end } },
            })
          : Promise.resolve([]),
        allowedLocationIds.length > 0
          ? tx.gbpDailyMetric.findMany({
              where: { tenantId, locationId: { in: allowedLocationIds }, date: { gte: prevStart, lte: prevEnd } },
            })
          : Promise.resolve([]),
        allowedLocationIds.length > 0
          ? tx.internalResourceMapping.findMany({
              where: {
                tenantId,
                internalType: 'LOCATION',
                internalId: { in: allowedLocationIds },
                resource: { provider: 'GOOGLE_BUSINESS_PROFILE' },
              },
            })
          : Promise.resolve([]),
      ]);

      if (propertyIds.length > 0) {
        if (isDomainProperty && urlPrefixFilter) {
          // Domain property LocalBi isolation: query page-level data matching urlPrefixFilter
          const [currPageMetrics, prevPageMetrics] = await Promise.all([
            tx.gscDailyPageMetric.findMany({
              where: {
                tenantId,
                propertyId: { in: propertyIds },
                date: { gte: start, lte: end },
                page: { fullUrl: { startsWith: urlPrefixFilter } },
              },
              select: { clicks: true, impressions: true, sumPositionImpressions: true },
            }),
            tx.gscDailyPageMetric.findMany({
              where: {
                tenantId,
                propertyId: { in: propertyIds },
                date: { gte: prevStart, lte: prevEnd },
                page: { fullUrl: { startsWith: urlPrefixFilter } },
              },
              select: { clicks: true, impressions: true },
            }),
          ]);

          for (const row of currPageMetrics) {
            totalClicks += row.clicks;
            totalImpressions += row.impressions;
            sumPositionImpressions += row.sumPositionImpressions;
          }
          for (const row of prevPageMetrics) {
            prevGscClicks += row.clicks;
            prevGscImpressions += row.impressions;
          }
        } else {
          // Direct URL-prefix property (or no filter) — use property daily totals directly
          const [currentGscTotals, prevGscTotals] = await Promise.all([
            tx.gscDailyPropertyTotal.findMany({
              where: { tenantId, propertyId: { in: propertyIds }, date: { gte: start, lte: end } },
            }),
            tx.gscDailyPropertyTotal.findMany({
              where: { tenantId, propertyId: { in: propertyIds }, date: { gte: prevStart, lte: prevEnd } },
            }),
          ]);

          for (const row of currentGscTotals) {
            totalClicks += row.clicks;
            totalImpressions += row.impressions;
            sumPositionImpressions += row.sumPositionImpressions;
          }
          for (const row of prevGscTotals) {
            prevGscClicks += row.clicks;
            prevGscImpressions += row.impressions;
          }
        }
      }

      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const averagePosition = totalImpressions > 0 ? sumPositionImpressions / totalImpressions : 0;

      let searchViews = 0;
      let mapsViews = 0;
      let websiteClicks = 0;
      let callClicks = 0;
      let directionRequests = 0;

      for (const m of currentGbpMetrics) {
        const val = Number(m.value);
        switch (m.metricType) {
          case 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH':
          case 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH':
            searchViews += val;
            break;
          case 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS':
          case 'BUSINESS_IMPRESSIONS_MOBILE_MAPS':
            mapsViews += val;
            break;
          case 'WEBSITE_CLICKS':
            websiteClicks += val;
            break;
          case 'CALL_CLICKS':
            callClicks += val;
            break;
          case 'BUSINESS_DIRECTION_REQUESTS':
            directionRequests += val;
            break;
        }
      }

      let prevSearchViews = 0;
      let prevMapsViews = 0;
      let prevWebsiteClicks = 0;
      let prevCallClicks = 0;
      let prevDirectionRequests = 0;

      for (const m of prevGbpMetrics) {
        const val = Number(m.value);
        switch (m.metricType) {
          case 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH':
          case 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH':
            prevSearchViews += val;
            break;
          case 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS':
          case 'BUSINESS_IMPRESSIONS_MOBILE_MAPS':
            prevMapsViews += val;
            break;
          case 'WEBSITE_CLICKS':
            prevWebsiteClicks += val;
            break;
          case 'CALL_CLICKS':
            prevCallClicks += val;
            break;
          case 'BUSINESS_DIRECTION_REQUESTS':
            prevDirectionRequests += val;
            break;
        }
      }

      const totalViews = searchViews + mapsViews;
      const prevTotalViews = prevSearchViews + prevMapsViews;

      const calcGrowth = (curr: number, prev: number): number | undefined => {
        if (prev === 0) {
          return curr > 0 ? 100 : undefined;
        }
        return Math.round(((curr - prev) / prev) * 1000) / 10;
      };

      const mappedLocationIds = new Set(gbpLocationMappings.map((m) => m.internalId));
      let gbpStatus: 'ready' | 'empty' | 'not_configured' | 'partial' = 'ready';
      if (mappedLocationIds.size === 0) {
        gbpStatus = 'not_configured';
      } else if (mappedLocationIds.size < allowedLocationIds.length) {
        gbpStatus = 'partial';
      } else if (currentGbpMetrics.length === 0) {
        gbpStatus = 'empty';
      }

      return {
        source: 'GOOGLE_SEARCH_CONSOLE',
        webSurfaceId: targetSurface?.id,
        webSurfaceType: targetSurface?.type,
        isDomainProperty,
        urlPrefixFilter,
        period: { startDate, endDate },
        gsc: {
          totalClicks,
          totalImpressions,
          ctr: Math.round(ctr * 10000) / 10000,
          averagePosition: Math.round(averagePosition * 10) / 10,
        },
        gbp: {
          status: gbpStatus,
          mappedLocationsCount: mappedLocationIds.size,
          totalLocationsCount: allowedLocationIds.length,
          totalSearchViews: searchViews,
          totalMapsViews: mapsViews,
          totalViews,
          websiteClicks,
          callClicks,
          directionRequests,
        },
        previousPeriod: {
          clicksGrowthPercent: calcGrowth(totalClicks, prevGscClicks),
          impressionsGrowthPercent: calcGrowth(totalImpressions, prevGscImpressions),
          viewsGrowthPercent: calcGrowth(totalViews, prevTotalViews),
          callsGrowthPercent: calcGrowth(callClicks, prevCallClicks),
          directionsGrowthPercent: calcGrowth(directionRequests, prevDirectionRequests),
          websiteClicksGrowthPercent: calcGrowth(websiteClicks, prevWebsiteClicks),
        },
      };
    });
  }

  /**
   * Returns daily performance timeseries data for trend charts.
   */
  public static async getTimeseries(params: PerformanceSummaryParams): Promise<TimeseriesPoint[]> {
    const { tenantId, brandId, locationId, startDate, endDate, context } = params;

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const { propertyIds, allowedLocationIds, isDomainProperty, urlPrefixFilter } = await this.resolveReportingContext(tx, {
        tenantId,
        brandId,
        locationId,
        webSurfaceId: params.webSurfaceId,
        mode: params.mode,
        context,
      });

      const start = new Date(startDate);
      const end = new Date(endDate);

      const dailyMap = new Map<string, TimeseriesPoint>();

      if (propertyIds.length > 0) {
        if (isDomainProperty && urlPrefixFilter) {
          const pageMetrics = await tx.gscDailyPageMetric.findMany({
            where: {
              tenantId,
              propertyId: { in: propertyIds },
              date: { gte: start, lte: end },
              page: { fullUrl: { startsWith: urlPrefixFilter } },
            },
            select: { date: true, clicks: true, impressions: true, sumPositionImpressions: true },
          });

          for (const row of pageMetrics) {
            const dStr = row.date.toISOString().slice(0, 10);
            const existing = dailyMap.get(dStr) || {
              date: dStr,
              clicks: 0,
              impressions: 0,
              ctr: 0,
              position: 0,
              views: 0,
              calls: 0,
              websiteClicks: 0,
              directions: 0,
            };

            existing.clicks += row.clicks;
            existing.impressions += row.impressions;
            if (existing.impressions > 0) {
              existing.ctr = Math.round((existing.clicks / existing.impressions) * 10000) / 10000;
              existing.position = Math.round((row.sumPositionImpressions / row.impressions) * 10) / 10;
            }
            dailyMap.set(dStr, existing);
          }
        } else {
          const gscTotals = await tx.gscDailyPropertyTotal.findMany({
            where: { tenantId, propertyId: { in: propertyIds }, date: { gte: start, lte: end } },
            orderBy: { date: 'asc' },
          });

          for (const row of gscTotals) {
            const dStr = row.date.toISOString().slice(0, 10);
            const existing = dailyMap.get(dStr) || {
              date: dStr,
              clicks: 0,
              impressions: 0,
              ctr: 0,
              position: 0,
              views: 0,
              calls: 0,
              websiteClicks: 0,
              directions: 0,
            };

            existing.clicks += row.clicks;
            existing.impressions += row.impressions;
            if (existing.impressions > 0) {
              existing.ctr = Math.round((existing.clicks / existing.impressions) * 10000) / 10000;
              existing.position = Math.round((row.sumPositionImpressions / row.impressions) * 10) / 10;
            }
            dailyMap.set(dStr, existing);
          }
        }
      }

      const gbpRows = allowedLocationIds.length > 0
        ? await tx.gbpDailyMetric.findMany({
            where: { tenantId, locationId: { in: allowedLocationIds }, date: { gte: start, lte: end } },
            orderBy: { date: 'asc' },
          })
        : [];

      for (const m of gbpRows) {
        const dStr = m.date.toISOString().slice(0, 10);
        const existing = dailyMap.get(dStr) || {
          date: dStr,
          clicks: 0,
          impressions: 0,
          ctr: 0,
          position: 0,
          views: 0,
          calls: 0,
          websiteClicks: 0,
          directions: 0,
        };

        const val = Number(m.value);
        if (m.metricType.includes('IMPRESSIONS')) {
          existing.views += val;
        } else if (m.metricType === 'CALL_CLICKS') {
          existing.calls += val;
        } else if (m.metricType === 'WEBSITE_CLICKS') {
          existing.websiteClicks += val;
        } else if (m.metricType === 'BUSINESS_DIRECTION_REQUESTS') {
          existing.directions += val;
        }
        dailyMap.set(dStr, existing);
      }

      return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  /**
   * Returns top queries, top pages, and device distributions.
   */
  public static async getDimensions(params: PerformanceSummaryParams) {
    const { tenantId, brandId, locationId, context } = params;

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const { propertyIds, isDomainProperty, urlPrefixFilter } = await this.resolveReportingContext(tx, {
        tenantId,
        brandId,
        locationId,
        webSurfaceId: params.webSurfaceId,
        mode: params.mode,
        context,
      });

      if (propertyIds.length === 0) {
        return { queries: [], pages: [], devices: [] };
      }

      const start = new Date(params.startDate);
      const end = new Date(params.endDate);

      const queryMetrics = await tx.gscDailyQueryMetric.findMany({
        where: {
          tenantId,
          propertyId: { in: propertyIds },
          date: { gte: start, lte: end },
        },
        include: { query: true },
      });

      const queryMap = new Map<string, { clicks: number; impressions: number; sumPos: number }>();
      for (const q of queryMetrics) {
        const txt = q.query.queryText;
        const curr = queryMap.get(txt) || { clicks: 0, impressions: 0, sumPos: 0 };
        curr.clicks += q.clicks;
        curr.impressions += q.impressions;
        curr.sumPos += q.sumPositionImpressions;
        queryMap.set(txt, curr);
      }

      const queries: QueryDimensionRow[] = Array.from(queryMap.entries())
        .map(([queryText, stats]) => ({
          queryText,
          clicks: stats.clicks,
          impressions: stats.impressions,
          ctr: stats.impressions > 0 ? Math.round((stats.clicks / stats.impressions) * 10000) / 10000 : 0,
          position: stats.impressions > 0 ? Math.round((stats.sumPos / stats.impressions) * 10) / 10 : 0,
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      const pageMetrics = await tx.gscDailyPageMetric.findMany({
        where: {
          tenantId,
          propertyId: { in: propertyIds },
          date: { gte: start, lte: end },
          ...(isDomainProperty && urlPrefixFilter ? { page: { fullUrl: { startsWith: urlPrefixFilter } } } : {}),
        },
        include: { page: true },
      });

      const pageMap = new Map<string, { clicks: number; impressions: number; sumPos: number }>();
      for (const p of pageMetrics) {
        const url = p.page.fullUrl;
        const curr = pageMap.get(url) || { clicks: 0, impressions: 0, sumPos: 0 };
        curr.clicks += p.clicks;
        curr.impressions += p.impressions;
        curr.sumPos += p.sumPositionImpressions;
        pageMap.set(url, curr);
      }

      const pages: PageDimensionRow[] = Array.from(pageMap.entries())
        .map(([fullUrl, stats]) => ({
          fullUrl,
          clicks: stats.clicks,
          impressions: stats.impressions,
          ctr: stats.impressions > 0 ? Math.round((stats.clicks / stats.impressions) * 10000) / 10000 : 0,
          position: stats.impressions > 0 ? Math.round((stats.sumPos / stats.impressions) * 10) / 10 : 0,
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      const deviceMetrics = await tx.gscDailyDeviceMetric.findMany({
        where: {
          tenantId,
          propertyId: { in: propertyIds },
          date: { gte: start, lte: end },
        },
      });

      const deviceMap = new Map<string, { clicks: number; impressions: number }>();
      for (const d of deviceMetrics) {
        const dev = d.device;
        const curr = deviceMap.get(dev) || { clicks: 0, impressions: 0 };
        curr.clicks += d.clicks;
        curr.impressions += d.impressions;
        deviceMap.set(dev, curr);
      }

      const devices: DeviceDimensionRow[] = Array.from(deviceMap.entries())
        .map(([device, stats]) => ({
          device: device as 'DESKTOP' | 'MOBILE' | 'TABLET',
          clicks: stats.clicks,
          impressions: stats.impressions,
          ctr: stats.impressions > 0 ? Math.round((stats.clicks / stats.impressions) * 10000) / 10000 : 0,
        }))
        .sort((a, b) => b.clicks - a.clicks);

      return { queries, pages, devices };
    });
  }

  /**
   * Returns deep drill-down analytics for specified dimension with search, sort, and pagination.
   */
  public static async getDrilldownData(params: DrilldownParams) {
    const {
      tenantId,
      brandId,
      locationId,
      startDate,
      endDate,
      context,
      dimension,
      search = '',
      sortBy,
      sortOrder = 'desc',
      page = 1,
      pageSize = 50,
    } = params;

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {

      const { propertyIds, allowedLocationIds, isDomainProperty, urlPrefixFilter } = await this.resolveReportingContext(tx, {
        tenantId,
        brandId,
        locationId,
        webSurfaceId: params.webSurfaceId,
        mode: params.mode,
        context,
      });


      const start = new Date(startDate);
      const end = new Date(endDate);

      // Handle each dimension
      if (dimension === 'query') {
        if (propertyIds.length === 0) return { items: [], totalCount: 0, page, pageSize };
        const queryMetrics = await tx.gscDailyQueryMetric.findMany({
          where: {
            tenantId,
            propertyId: { in: propertyIds },
            date: { gte: start, lte: end },
            ...(search ? { query: { queryText: { contains: search, mode: 'insensitive' } } } : {}),
          },
          include: { query: true },
        });

        const queryMap = new Map<string, { clicks: number; impressions: number; sumPos: number }>();
        for (const q of queryMetrics) {
          const txt = q.query.queryText;
          const curr = queryMap.get(txt) || { clicks: 0, impressions: 0, sumPos: 0 };
          curr.clicks += q.clicks;
          curr.impressions += q.impressions;
          curr.sumPos += q.sumPositionImpressions;
          queryMap.set(txt, curr);
        }

        const items: QueryDimensionRow[] = Array.from(queryMap.entries()).map(([queryText, stats]) => ({
          queryText,
          clicks: stats.clicks,
          impressions: stats.impressions,
          ctr: stats.impressions > 0 ? Math.round((stats.clicks / stats.impressions) * 10000) / 10000 : 0,
          position: stats.impressions > 0 ? Math.round((stats.sumPos / stats.impressions) * 10) / 10 : 0,
        }));

        items.sort((a, b) => {
          const fieldA = a[sortBy as keyof QueryDimensionRow] ?? a.clicks;
          const fieldB = b[sortBy as keyof QueryDimensionRow] ?? b.clicks;
          if (typeof fieldA === 'number' && typeof fieldB === 'number') {
            return sortOrder === 'asc' ? fieldA - fieldB : fieldB - fieldA;
          }
          return sortOrder === 'asc' ? String(fieldA).localeCompare(String(fieldB)) : String(fieldB).localeCompare(String(fieldA));
        });

        const totalCount = items.length;
        const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
        return { items: paginatedItems, totalCount, page, pageSize };
      }

      if (dimension === 'page') {
        if (propertyIds.length === 0) return { items: [], totalCount: 0, page, pageSize };

        const pageWhere: any = {
          tenantId,
          propertyId: { in: propertyIds },
          date: { gte: start, lte: end },
        };

        const fullUrlFilter: any = {};
        if (isDomainProperty && urlPrefixFilter) {
          fullUrlFilter.startsWith = urlPrefixFilter;
        }
        if (search) {
          fullUrlFilter.contains = search;
          fullUrlFilter.mode = 'insensitive';
        }
        if (Object.keys(fullUrlFilter).length > 0) {
          pageWhere.page = { fullUrl: fullUrlFilter };
        }

        const pageMetrics = await tx.gscDailyPageMetric.findMany({
          where: pageWhere,
          include: { page: true },
        });

        const pageMap = new Map<string, { clicks: number; impressions: number; sumPos: number }>();
        for (const p of pageMetrics) {
          const url = p.page.fullUrl;
          const curr = pageMap.get(url) || { clicks: 0, impressions: 0, sumPos: 0 };
          curr.clicks += p.clicks;
          curr.impressions += p.impressions;
          curr.sumPos += p.sumPositionImpressions;
          pageMap.set(url, curr);
        }

        const items: PageDimensionRow[] = Array.from(pageMap.entries()).map(([fullUrl, stats]) => ({
          fullUrl,
          clicks: stats.clicks,
          impressions: stats.impressions,
          ctr: stats.impressions > 0 ? Math.round((stats.clicks / stats.impressions) * 10000) / 10000 : 0,
          position: stats.impressions > 0 ? Math.round((stats.sumPos / stats.impressions) * 10) / 10 : 0,
        }));

        items.sort((a, b) => {
          const fieldA = a[sortBy as keyof PageDimensionRow] ?? a.clicks;
          const fieldB = b[sortBy as keyof PageDimensionRow] ?? b.clicks;
          if (typeof fieldA === 'number' && typeof fieldB === 'number') {
            return sortOrder === 'asc' ? fieldA - fieldB : fieldB - fieldA;
          }
          return sortOrder === 'asc' ? String(fieldA).localeCompare(String(fieldB)) : String(fieldB).localeCompare(String(fieldA));
        });

        const totalCount = items.length;
        const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
        return { items: paginatedItems, totalCount, page, pageSize };
      }

      if (dimension === 'country') {
        const ISO_NAMES: Record<string, string> = {
          IND: 'India',
          USA: 'United States',
          GBR: 'United Kingdom',
          CAN: 'Canada',
          AUS: 'Australia',
          ARE: 'United Arab Emirates',
          SGP: 'Singapore',
          MYS: 'Malaysia',
          DEU: 'Germany',
          FRA: 'France',
        };

        if (propertyIds.length === 0) return { items: [], totalCount: 0, page, pageSize };
        const countryMetrics = await tx.gscDailyCountryMetric.findMany({
          where: {
            tenantId,
            propertyId: { in: propertyIds },
            date: { gte: start, lte: end },
          },
        });

        let items: CountryDimensionRow[] = [];

        if (countryMetrics.length > 0) {
          const countryMap = new Map<string, { clicks: number; impressions: number; sumPos: number }>();
          for (const c of countryMetrics) {
            const curr = countryMap.get(c.country) || { clicks: 0, impressions: 0, sumPos: 0 };
            curr.clicks += c.clicks;
            curr.impressions += c.impressions;
            curr.sumPos += c.sumPositionImpressions;
            countryMap.set(c.country, curr);
          }
          items = Array.from(countryMap.entries()).map(([code, stats]) => ({
            countryCode: code,
            countryName: ISO_NAMES[code] || code,
            clicks: stats.clicks,
            impressions: stats.impressions,
            ctr: stats.impressions > 0 ? Math.round((stats.clicks / stats.impressions) * 10000) / 10000 : 0,
            position: stats.impressions > 0 ? Math.round((stats.sumPos / stats.impressions) * 10) / 10 : 0,
          }));
        } else {
          items = [];
        }

        if (search) {
          items = items.filter((i) => i.countryName.toLowerCase().includes(search.toLowerCase()) || i.countryCode.toLowerCase().includes(search.toLowerCase()));
        }

        items.sort((a, b) => {
          const fieldA = a[sortBy as keyof CountryDimensionRow] ?? a.clicks;
          const fieldB = b[sortBy as keyof CountryDimensionRow] ?? b.clicks;
          if (typeof fieldA === 'number' && typeof fieldB === 'number') {
            return sortOrder === 'asc' ? fieldA - fieldB : fieldB - fieldA;
          }
          return sortOrder === 'asc' ? String(fieldA).localeCompare(String(fieldB)) : String(fieldB).localeCompare(String(fieldA));
        });

        const totalCount = items.length;
        const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
        return { items: paginatedItems, totalCount, page, pageSize };
      }

      if (dimension === 'device') {
        if (propertyIds.length === 0) return { items: [], totalCount: 0, page, pageSize };
        const deviceMetrics = await tx.gscDailyDeviceMetric.findMany({
          where: { tenantId, propertyId: { in: propertyIds }, date: { gte: start, lte: end } },
        });

        const deviceMap = new Map<string, { clicks: number; impressions: number; sumPos: number }>();
        for (const dm of deviceMetrics) {
          const key = dm.device;
          const curr = deviceMap.get(key) || { clicks: 0, impressions: 0, sumPos: 0 };
          curr.clicks += dm.clicks;
          curr.impressions += dm.impressions;
          curr.sumPos += dm.sumPositionImpressions;
          deviceMap.set(key, curr);
        }

        const items: DeviceDimensionRow[] = Array.from(deviceMap.entries()).map(([device, stats]) => ({
          device,
          clicks: stats.clicks,
          impressions: stats.impressions,
          ctr: stats.impressions > 0 ? Math.round((stats.clicks / stats.impressions) * 10000) / 10000 : 0,
          position: stats.impressions > 0 ? Math.round((stats.sumPos / stats.impressions) * 10) / 10 : 0,
        }));

        items.sort((a, b) => b.clicks - a.clicks);

        return { items, totalCount: items.length, page, pageSize };
      }

      if (dimension === 'date') {
        if (propertyIds.length === 0) return { items: [], totalCount: 0, page, pageSize };
        let items: DateDimensionRow[] = [];

        if (isDomainProperty && urlPrefixFilter) {
          const pageMetrics = await tx.gscDailyPageMetric.findMany({
            where: {
              tenantId,
              propertyId: { in: propertyIds },
              date: { gte: start, lte: end },
              page: { fullUrl: { startsWith: urlPrefixFilter } },
            },
          });

          const dateMap = new Map<string, { clicks: number; impressions: number; sumPos: number }>();
          for (const p of pageMetrics) {
            const d = p.date.toISOString().slice(0, 10);
            const curr = dateMap.get(d) || { clicks: 0, impressions: 0, sumPos: 0 };
            curr.clicks += p.clicks;
            curr.impressions += p.impressions;
            curr.sumPos += p.sumPositionImpressions;
            dateMap.set(d, curr);
          }

          items = Array.from(dateMap.entries()).map(([date, stats]) => ({
            date,
            clicks: stats.clicks,
            impressions: stats.impressions,
            ctr: stats.impressions > 0 ? Math.round((stats.clicks / stats.impressions) * 10000) / 10000 : 0,
            position: stats.impressions > 0 ? Math.round((stats.sumPos / stats.impressions) * 10) / 10 : 0,
            dataState: 'FINAL' as const,
          })).sort((a, b) => b.date.localeCompare(a.date));
        } else {
          const totals = await tx.gscDailyPropertyTotal.findMany({
            where: { tenantId, propertyId: { in: propertyIds }, date: { gte: start, lte: end } },
            orderBy: { date: 'desc' },
          });

          items = totals.map((t) => ({
            date: t.date.toISOString().slice(0, 10),
            clicks: t.clicks,
            impressions: t.impressions,
            ctr: t.impressions > 0 ? Math.round((t.clicks / t.impressions) * 10000) / 10000 : 0,
            position: t.impressions > 0 ? Math.round((t.sumPositionImpressions / t.impressions) * 10) / 10 : 0,
            dataState: (t.dataState as 'FINAL' | 'FRESH') || 'FINAL',
          }));
        }

        const totalCount = items.length;
        const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
        return { items: paginatedItems, totalCount, page, pageSize };
      }

      if (dimension === 'location') {
        const locations = await tx.location.findMany({
          where: { tenantId, brandId, isArchived: false, ...(locationId ? { id: locationId } : {}) },
        });

        const allowedLocs = locations.filter((l) => allowedLocationIds.includes(l.id));
        let items: GbpLocationBreakdownRow[] = [];

        if (allowedLocs.length > 0) {
          // Single batched query for all allowed locations (replaces N+1 per-location loop)
          const allMetrics = await tx.gbpDailyMetric.findMany({
            where: {
              tenantId,
              locationId: { in: allowedLocs.map((l) => l.id) },
              date: { gte: start, lte: end },
            },
          });

          // Group metrics by locationId in memory
          const metricsByLocation = new Map<string, typeof allMetrics>();
          for (const m of allMetrics) {
            if (!metricsByLocation.has(m.locationId)) {
              metricsByLocation.set(m.locationId, []);
            }
            metricsByLocation.get(m.locationId)!.push(m);
          }

          items = allowedLocs.map((loc) => {
            const locMetrics = metricsByLocation.get(loc.id) ?? [];
            let searchViews = 0;
            let mapsViews = 0;
            let websiteClicks = 0;
            let callClicks = 0;
            let directionRequests = 0;

            for (const m of locMetrics) {
              const val = Number(m.value);
              if (m.metricType.includes('SEARCH')) searchViews += val;
              else if (m.metricType.includes('MAPS')) mapsViews += val;
              else if (m.metricType === 'WEBSITE_CLICKS') websiteClicks += val;
              else if (m.metricType === 'CALL_CLICKS') callClicks += val;
              else if (m.metricType === 'BUSINESS_DIRECTION_REQUESTS') directionRequests += val;
            }

            return {
              locationId: loc.id,
              locationName: loc.name,
              storeCode: loc.storeCode,
              city: loc.city,
              searchViews,
              mapsViews,
              totalViews: searchViews + mapsViews,
              callClicks,
              websiteClicks,
              directionRequests,
            };
          });
        }

        if (search) {
          items = items.filter(
            (i) =>
              i.locationName.toLowerCase().includes(search.toLowerCase()) ||
              i.city.toLowerCase().includes(search.toLowerCase())
          );
        }

        items.sort((a, b) => {
          const fieldA = a[sortBy as keyof GbpLocationBreakdownRow] ?? a.totalViews;
          const fieldB = b[sortBy as keyof GbpLocationBreakdownRow] ?? b.totalViews;
          if (typeof fieldA === 'number' && typeof fieldB === 'number') {
            return sortOrder === 'asc' ? fieldA - fieldB : fieldB - fieldA;
          }
          return sortOrder === 'asc'
            ? String(fieldA).localeCompare(String(fieldB))
            : String(fieldB).localeCompare(String(fieldA));
        });

        return { items, totalCount: items.length, page, pageSize };
      }


      if (dimension === 'search-keywords') {
        return { items: [], totalCount: 0, page, pageSize };
      }

      return { items: [], totalCount: 0, page, pageSize };
    });
  }

  /**
   * Returns specific location identity, connected GBP resource status, and performance summary.
   */
  public static async getLocationDetail(params: {
    tenantId: string;
    locationId: string;
    context: AuthorizedContext;
  }) {
    const { tenantId, locationId, context } = params;

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const loc = await tx.location.findUnique({
        where: { uq_location_tenant_id: { tenantId, id: locationId } },
        include: { brand: true },
      });

      if (!loc || loc.isArchived) {
        throw createResourceNotFoundError('Location', locationId);
      }

      await this.assertReportingAccess(tx, tenantId, loc.brandId, locationId, context);

      // Check GBP mapping
      const mapping = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId,
          internalType: 'LOCATION',
          internalId: locationId,
        },
        include: { resource: true },
      });

      // Fetch 30-day GBP metrics
      const now = new Date();
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 30);

      const metrics = await tx.gbpDailyMetric.findMany({
        where: {
          tenantId,
          locationId,
          date: { gte: past30, lte: now },
        },
        orderBy: { date: 'asc' },
      });

      let searchViews = 0;
      let mapsViews = 0;
      let websiteClicks = 0;
      let callClicks = 0;
      let directionRequests = 0;

      for (const m of metrics) {
        const val = Number(m.value);
        if (m.metricType.includes('SEARCH')) searchViews += val;
        else if (m.metricType.includes('MAPS')) mapsViews += val;
        else if (m.metricType === 'WEBSITE_CLICKS') websiteClicks += val;
        else if (m.metricType === 'CALL_CLICKS') callClicks += val;
        else if (m.metricType === 'BUSINESS_DIRECTION_REQUESTS') directionRequests += val;
      }

      return {
        location: {
          id: loc.id,
          name: loc.name,
          storeCode: loc.storeCode,
          addressLine1: loc.addressLine1,
          city: loc.city,
          state: loc.state,
          postalCode: loc.postalCode,
          country: loc.country,
          timezone: loc.timezone,
          brandName: loc.brand.name,
          brandId: loc.brandId,
        },
        mapping: mapping
          ? {
              isMapped: true,
              resourceName: mapping.resource.resourceName,
              externalResourceId: mapping.resource.externalResourceId,
              verified: true,
            }
          : {
              isMapped: false,
              resourceName: null,
              externalResourceId: null,
              verified: false,
            },
        metricsSummary: {
          searchViews,
          mapsViews,
          totalViews: searchViews + mapsViews,
          callClicks,
          websiteClicks,
          directionRequests,
        },
      };
    });
  }

  private static async assertReportingAccess(
    tx: import('@prisma/client').Prisma.TransactionClient,
    tenantId: string,
    brandId: string,
    locationId: string | undefined,
    context: AuthorizedContext
  ): Promise<void> {
    if (context.scopeMode === ScopeMode.ALL) {
      return;
    }

    // If specific location requested
    if (locationId) {
      const loc = await tx.location.findUnique({
        where: { uq_location_tenant_brand_id: { tenantId, brandId, id: locationId } },
      });
      if (!loc || loc.isArchived) {
        throw createResourceNotFoundError('Location', locationId);
      }

      // Check if location is granted
      if (context.grantedLocationIds.size > 0 && !context.grantedLocationIds.has(locationId)) {
        throw createLocationAccessDeniedError(locationId);
      }
      if (!context.grantedBrandIds.has(brandId) && !context.grantedLocationIds.has(locationId)) {
        throw createLocationAccessDeniedError(locationId);
      }
      return;
    }

    // No specific location requested: verify user has either brand access or at least one location under this brand
    if (context.grantedBrandIds.has(brandId)) {
      return;
    }

    const brandLocations = await tx.location.findMany({
      where: { tenantId, brandId, isArchived: false },
      select: { id: true },
    });

    const hasAnyGrantedLocation = brandLocations.some((l) => context.grantedLocationIds.has(l.id));
    if (!hasAnyGrantedLocation) {
      throw createBrandAccessDeniedError(brandId);
    }
  }

  private static async resolvePermittedLocationIds(
    tx: import('@prisma/client').Prisma.TransactionClient,
    tenantId: string,
    brandId: string,
    requestedLocationId: string | undefined,
    context: AuthorizedContext
  ): Promise<string[]> {
    if (requestedLocationId) {
      return [requestedLocationId];
    }

    const allLocations = await tx.location.findMany({
      where: { tenantId, brandId, isArchived: false },
      select: { id: true },
    });

    if (context.scopeMode === ScopeMode.ALL) {
      return allLocations.map((l) => l.id);
    }

    // If user has specific location grants, strictly filter to granted locations
    if (context.grantedLocationIds.size > 0) {
      return allLocations
        .map((l) => l.id)
        .filter((locId) => context.grantedLocationIds.has(locId));
    }

    // If user has brand grant without specific location limits
    if (context.grantedBrandIds.has(brandId)) {
      return allLocations.map((l) => l.id);
    }

    return [];
  }

  /**
   * Resolves the reporting context (brand, GSC propertyIds, allowedLocationIds) for a given
   * tenant+brand+location combination, with access enforcement.
   *
   * Previously this 4-step sequence (brand lookup → mapping lookup → property lookup →
   * location resolution) was duplicated in every public reporting method. Centralizing it:
   * - Eliminates 12–16 redundant DB queries per dashboard page load
   * - Parallelizes internal lookups for lower latency
   */
  private static async resolveReportingContext(
    tx: import('@prisma/client').Prisma.TransactionClient,
    params: {
      tenantId: string;
      brandId: string;
      locationId: string | undefined;
      webSurfaceId?: string | undefined;
      mode?: 'LOCALBI' | 'ORIGINAL' | 'COMPARE' | undefined;
      context: AuthorizedContext;
    }
  ): Promise<{
    propertyIds: string[];
    allowedLocationIds: string[];
    targetSurface: any | null;
    isDomainProperty: boolean;
    urlPrefixFilter: string | null;
  }> {
    const { tenantId, brandId, locationId, webSurfaceId, mode, context } = params;

    // Fetch brand and permitted locations in parallel
    const [brand, allowedLocationIds] = await Promise.all([
      tx.brand.findUnique({
        where: { uq_brand_tenant_id: { tenantId, id: brandId } },
      }),
      this.resolvePermittedLocationIds(tx, tenantId, brandId, locationId, context),
    ]);

    if (!brand || brand.isArchived) {
      throw createResourceNotFoundError('Brand', brandId);
    }

    await this.assertReportingAccess(tx, tenantId, brandId, locationId, context);

    // Resolve target surface: explicit webSurfaceId or default to LOCALBI surface
    let targetSurface = null;
    if (webSurfaceId) {
      targetSurface = await tx.webSurface.findFirst({
        where: { tenantId, id: webSurfaceId, brandId },
        include: { domains: true },
      });
    } else {
      const surfaceType = mode === 'ORIGINAL' ? 'ORIGINAL' : 'LOCALBI';
      targetSurface = await tx.webSurface.findFirst({
        where: { tenantId, brandId, type: surfaceType },
        include: { domains: true },
      });
    }

    // 1. Check WEBSURFACE mapping for GSC
    let gscMapping = null;
    if (targetSurface) {
      gscMapping = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId,
          internalType: 'WEBSURFACE',
          internalId: targetSurface.id,
          resource: { provider: 'GOOGLE_SEARCH_CONSOLE' },
        },
        include: { resource: true },
      });
    }

    // 2. Fallback to legacy BRAND mapping
    if (!gscMapping) {
      gscMapping = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId,
          internalType: 'BRAND',
          internalId: brandId,
          resource: { provider: 'GOOGLE_SEARCH_CONSOLE' },
        },
        include: { resource: true },
      });
    }

    if (!gscMapping || !gscMapping.resource) {
      return {
        propertyIds: [],
        allowedLocationIds,
        targetSurface,
        isDomainProperty: false,
        urlPrefixFilter: null,
      };
    }

    const gscPropertyUrl = gscMapping.resource.externalResourceId;
    const isDomainProperty = gscPropertyUrl.startsWith('sc-domain:');

    // Fetch matching GscProperty
    const gscProp = await tx.gscProperty.findFirst({
      where: { tenantId, propertyUrl: gscPropertyUrl },
    });

    // Derive urlPrefixFilter
    let urlPrefixFilter: string | null = gscMapping.urlPrefixFilter || null;
    if (!urlPrefixFilter && targetSurface) {
      const primDomain = targetSurface.domains?.find((d: any) => d.isPrimary) || targetSurface.domains?.[0];
      if (primDomain) {
        urlPrefixFilter = AnalyticsUrlNormalizer.toCanonicalUrlPrefix(primDomain.hostname);
      } else if (targetSurface.type === 'LOCALBI') {
        urlPrefixFilter = AnalyticsUrlNormalizer.toCanonicalUrlPrefix(`locate.${brand.slug}.com`);
      }
    }

    return {
      propertyIds: gscProp ? [gscProp.id] : [],
      allowedLocationIds,
      targetSurface,
      isDomainProperty,
      urlPrefixFilter,
    };
  }
}
