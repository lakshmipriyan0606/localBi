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

export interface PerformanceSummaryParams {
  tenantId: string;
  brandId: string;
  locationId?: string | undefined;
  startDate: string;
  endDate: string;
  context: AuthorizedContext;
}

export interface PerformanceSummaryDto {
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
      // 1. Verify Brand exists under this tenant
      const brand = await tx.brand.findUnique({
        where: {
          uq_brand_tenant_id: {
            tenantId,
            id: brandId,
          },
        },
      });

      if (!brand || brand.isArchived) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      // 2. Validate Brand & Location permissions
      await this.assertReportingAccess(tx, tenantId, brandId, locationId, context);

      // 3. Resolve GSC properties mapped to this Brand
      const brandMappings = await tx.internalResourceMapping.findMany({
        where: {
          tenantId,
          internalType: 'BRAND',
          internalId: brandId,
        },
        include: { resource: true },
      });

      const gscPropertyUrls = brandMappings.map((m) => m.resource.externalResourceId);

      const gscProperties = await tx.gscProperty.findMany({
        where: {
          tenantId,
          propertyUrl: { in: gscPropertyUrls },
        },
      });
      const propertyIds = gscProperties.map((p) => p.id);

      // 4. Resolve GBP locations permitted for this context
      const allowedLocationIds = await this.resolvePermittedLocationIds(tx, tenantId, brandId, locationId, context);

      const start = new Date(startDate);
      const end = new Date(endDate);

      // 5. Aggregate GSC Metrics
      let totalClicks = 0;
      let totalImpressions = 0;
      let sumPositionImpressions = 0;

      if (propertyIds.length > 0) {
        const gscTotals = await tx.gscDailyPropertyTotal.findMany({
          where: {
            tenantId,
            propertyId: { in: propertyIds },
            date: { gte: start, lte: end },
          },
        });

        for (const row of gscTotals) {
          totalClicks += row.clicks;
          totalImpressions += row.impressions;
          sumPositionImpressions += row.sumPositionImpressions;
        }
      }

      const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      const averagePosition = totalImpressions > 0 ? sumPositionImpressions / totalImpressions : 0;

      // 6. Aggregate GBP Metrics
      let searchViews = 0;
      let mapsViews = 0;
      let websiteClicks = 0;
      let callClicks = 0;
      let directionRequests = 0;

      if (allowedLocationIds.length > 0) {
        const gbpMetrics = await tx.gbpDailyMetric.findMany({
          where: {
            tenantId,
            locationId: { in: allowedLocationIds },
            date: { gte: start, lte: end },
          },
        });

        for (const m of gbpMetrics) {
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
      }

      // 7. Query Previous Period Telemetry for real growth deltas
      const durationMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - durationMs);
      const prevEnd = new Date(start.getTime());

      let prevGscClicks = 0;
      let prevGscImpressions = 0;
      if (propertyIds.length > 0) {
        const prevGscTotals = await tx.gscDailyPropertyTotal.findMany({
          where: {
            tenantId,
            propertyId: { in: propertyIds },
            date: { gte: prevStart, lte: prevEnd },
          },
        });
        for (const row of prevGscTotals) {
          prevGscClicks += row.clicks;
          prevGscImpressions += row.impressions;
        }
      }

      let prevSearchViews = 0;
      let prevMapsViews = 0;
      let prevWebsiteClicks = 0;
      let prevCallClicks = 0;
      let prevDirectionRequests = 0;

      if (allowedLocationIds.length > 0) {
        const prevGbpMetrics = await tx.gbpDailyMetric.findMany({
          where: {
            tenantId,
            locationId: { in: allowedLocationIds },
            date: { gte: prevStart, lte: prevEnd },
          },
        });

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
      }

      const totalViews = searchViews + mapsViews;
      const prevTotalViews = prevSearchViews + prevMapsViews;

      const calcGrowth = (curr: number, prev: number): number | undefined => {
        if (prev === 0) {
          return curr > 0 ? 100 : undefined;
        }
        return Math.round(((curr - prev) / prev) * 1000) / 10;
      };

      return {
        period: { startDate, endDate },
        gsc: {
          totalClicks,
          totalImpressions,
          ctr: Math.round(ctr * 10000) / 10000,
          averagePosition: Math.round(averagePosition * 10) / 10,
        },
        gbp: {
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
      const brand = await tx.brand.findUnique({
        where: { uq_brand_tenant_id: { tenantId, id: brandId } },
      });
      if (!brand || brand.isArchived) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      await this.assertReportingAccess(tx, tenantId, brandId, locationId, context);

      const brandMappings = await tx.internalResourceMapping.findMany({
        where: { tenantId, internalType: 'BRAND', internalId: brandId },
        include: { resource: true },
      });
      const gscPropertyUrls = brandMappings.map((m) => m.resource.externalResourceId);
      const gscProperties = await tx.gscProperty.findMany({
        where: { tenantId, propertyUrl: { in: gscPropertyUrls } },
      });
      const propertyIds = gscProperties.map((p) => p.id);

      const allowedLocationIds = await this.resolvePermittedLocationIds(tx, tenantId, brandId, locationId, context);

      const start = new Date(startDate);
      const end = new Date(endDate);

      const gscTotals = propertyIds.length > 0
        ? await tx.gscDailyPropertyTotal.findMany({
            where: { tenantId, propertyId: { in: propertyIds }, date: { gte: start, lte: end } },
            orderBy: { date: 'asc' },
          })
        : [];

      const gbpRows = allowedLocationIds.length > 0
        ? await tx.gbpDailyMetric.findMany({
            where: { tenantId, locationId: { in: allowedLocationIds }, date: { gte: start, lte: end } },
            orderBy: { date: 'asc' },
          })
        : [];

      const dailyMap = new Map<string, TimeseriesPoint>();

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
      const brand = await tx.brand.findUnique({
        where: { uq_brand_tenant_id: { tenantId, id: brandId } },
      });
      if (!brand || brand.isArchived) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      await this.assertReportingAccess(tx, tenantId, brandId, locationId, context);

      const brandMappings = await tx.internalResourceMapping.findMany({
        where: { tenantId, internalType: 'BRAND', internalId: brandId },
        include: { resource: true },
      });
      const gscPropertyUrls = brandMappings.map((m) => m.resource.externalResourceId);
      const gscProperties = await tx.gscProperty.findMany({
        where: { tenantId, propertyUrl: { in: gscPropertyUrls } },
      });
      const propertyIds = gscProperties.map((p) => p.id);

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
      const brand = await tx.brand.findUnique({
        where: { uq_brand_tenant_id: { tenantId, id: brandId } },
      });
      if (!brand || brand.isArchived) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      await this.assertReportingAccess(tx, tenantId, brandId, locationId, context);

      const brandMappings = await tx.internalResourceMapping.findMany({
        where: { tenantId, internalType: 'BRAND', internalId: brandId },
        include: { resource: true },
      });
      const gscPropertyUrls = brandMappings.map((m) => m.resource.externalResourceId);
      const gscProperties = await tx.gscProperty.findMany({
        where: { tenantId, propertyUrl: { in: gscPropertyUrls } },
      });
      const propertyIds = gscProperties.map((p) => p.id);

      const allowedLocationIds = await this.resolvePermittedLocationIds(tx, tenantId, brandId, locationId, context);

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

        let items: QueryDimensionRow[] = Array.from(queryMap.entries()).map(([queryText, stats]) => ({
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
        const pageMetrics = await tx.gscDailyPageMetric.findMany({
          where: {
            tenantId,
            propertyId: { in: propertyIds },
            date: { gte: start, lte: end },
            ...(search ? { page: { fullUrl: { contains: search, mode: 'insensitive' } } } : {}),
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

        let items: PageDimensionRow[] = Array.from(pageMap.entries()).map(([fullUrl, stats]) => ({
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
          where: { tenantId, propertyId: { in: propertyIds } },
        });

        const items: DeviceDimensionRow[] = deviceMetrics.map((dm) => ({
          device: dm.device,
          clicks: dm.clicks,
          impressions: dm.impressions,
          ctr: dm.impressions > 0 ? Math.round((dm.clicks / dm.impressions) * 10000) / 10000 : 0,
        }));

        return { items, totalCount: items.length, page, pageSize };
      }

      if (dimension === 'date') {
        if (propertyIds.length === 0) return { items: [], totalCount: 0, page, pageSize };
        const totals = await tx.gscDailyPropertyTotal.findMany({
          where: { tenantId, propertyId: { in: propertyIds }, date: { gte: start, lte: end } },
          orderBy: { date: 'desc' },
        });

        const items: DateDimensionRow[] = totals.map((t) => ({
          date: t.date.toISOString().slice(0, 10),
          clicks: t.clicks,
          impressions: t.impressions,
          ctr: t.impressions > 0 ? Math.round((t.clicks / t.impressions) * 10000) / 10000 : 0,
          position: t.impressions > 0 ? Math.round((t.sumPositionImpressions / t.impressions) * 10) / 10 : 0,
          dataState: (t.dataState as 'FINAL' | 'FRESH') || 'FINAL',
        }));

        return { items, totalCount: items.length, page, pageSize };
      }

      if (dimension === 'location') {
        const locations = await tx.location.findMany({
          where: { tenantId, brandId, isArchived: false, ...(locationId ? { id: locationId } : {}) },
        });

        const allowedLocs = locations.filter((l) => allowedLocationIds.includes(l.id));
        let items: GbpLocationBreakdownRow[] = [];

        for (const loc of allowedLocs) {
          const metrics = await tx.gbpDailyMetric.findMany({
            where: { tenantId, locationId: loc.id, date: { gte: start, lte: end } },
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

          items.push({
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
          });
        }

        if (search) {
          items = items.filter((i) => i.locationName.toLowerCase().includes(search.toLowerCase()) || i.city.toLowerCase().includes(search.toLowerCase()));
        }

        items.sort((a, b) => {
          const fieldA = a[sortBy as keyof GbpLocationBreakdownRow] ?? a.totalViews;
          const fieldB = b[sortBy as keyof GbpLocationBreakdownRow] ?? b.totalViews;
          if (typeof fieldA === 'number' && typeof fieldB === 'number') {
            return sortOrder === 'asc' ? fieldA - fieldB : fieldB - fieldA;
          }
          return sortOrder === 'asc' ? String(fieldA).localeCompare(String(fieldB)) : String(fieldB).localeCompare(String(fieldA));
        });

        return { items, totalCount: items.length, page, pageSize };
      }

      if (dimension === 'search-keywords') {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
        const isDemo = tenant?.slug === 'abc-dental' || tenant?.slug?.startsWith('abc-dental');
        if (isDemo) {
          const sampleKeywords: GbpSearchKeywordRow[] = [
            { keyword: 'dentist near me', month: '2026-08', impressions: 340, impressionsText: '340', isThreshold: false },
            { keyword: 'dental clinic anna nagar', month: '2026-08', impressions: 185, impressionsText: '185', isThreshold: false },
            { keyword: 'teeth cleaning cost', month: '2026-08', impressions: 72, impressionsText: '72', isThreshold: false },
            { keyword: 'emergency dental hospital', month: '2026-08', impressions: 45, impressionsText: '45', isThreshold: false },
            { keyword: 'pediatric dentist salem', month: '2026-08', impressions: 10, impressionsText: '< 15', isThreshold: true },
            { keyword: 'root canal specialist nearby', month: '2026-08', impressions: 10, impressionsText: '< 15', isThreshold: true },
            { keyword: 'braces price list fairlands', month: '2026-08', impressions: 10, impressionsText: '< 15', isThreshold: true },
          ];

          let items = sampleKeywords;
          if (search) {
            items = items.filter((i) => i.keyword.toLowerCase().includes(search.toLowerCase()));
          }

          return { items, totalCount: items.length, page, pageSize };
        }

        // Real Client: Query actual search queries mapped to this brand
        if (propertyIds.length > 0) {
          const queryMetrics = await tx.gscDailyQueryMetric.findMany({
            where: {
              tenantId,
              propertyId: { in: propertyIds },
              date: { gte: start, lte: end },
              ...(search ? { query: { queryText: { contains: search, mode: 'insensitive' } } } : {}),
            },
            include: { query: true },
          });

          const keywordMap = new Map<string, number>();
          for (const q of queryMetrics) {
            const kw = q.query.queryText;
            keywordMap.set(kw, (keywordMap.get(kw) || 0) + q.impressions);
          }

          const currentMonthStr = `${startDate.slice(0, 7)}`;
          let items: GbpSearchKeywordRow[] = Array.from(keywordMap.entries()).map(([keyword, impressions]) => {
            const isThreshold = impressions < 15;
            return {
              keyword,
              month: currentMonthStr,
              impressions,
              impressionsText: isThreshold ? '< 15' : String(impressions),
              isThreshold,
            };
          });

          items.sort((a, b) => b.impressions - a.impressions);
          const totalCount = items.length;
          const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
          return { items: paginatedItems, totalCount, page, pageSize };
        }

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
}
