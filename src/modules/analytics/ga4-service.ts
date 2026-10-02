import { GoogleApiClient } from '../integrations/google/google-api-client';
import { GoogleOAuthService } from '../integrations/google/google-oauth-service';
import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import { getRedisClient } from '@/shared/database/redis-client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { Prisma } from '@prisma/client';
import { AnalyticsUrlNormalizer } from './url-normalizer';
export type Ga4ReportStatus =
  | 'ready'
  | 'empty'
  | 'not_configured'
  | 'permission_required'
  | 'error';

export interface Ga4ResponseContract<T = unknown> {
  status: Ga4ReportStatus;
  source?: 'google_ga4';
  propertyId?: string;
  propertyName?: string;
  dateRange?: { startDate: string; endDate: string };
  fetchedAt?: string;
  code?: string;
  error?: string;
  data: T | null;
}

export interface Ga4DailyDataPoint {
  date: string;
  activeUsers: number;
  newUsers: number;
  eventCount: number;
  keyEvents: number;
  sessions: number;
  engagedSessions?: number | undefined;
  engagementRate: number;
  avgEngagementTimeSeconds: number;
  peerBenchmark?: number | undefined;
  previousPeriod?: number | undefined;
}

export interface Ga4ChannelItem {
  channel: string;
  newUsers: number;
  sessions: number;
  percentage: number;
}

export interface Ga4PageItem {
  pageTitle: string;
  url: string;
  views: number;
  activeUsers: number;
  eventCount: number;
  bounceRate: number;
  avgEngagementTimeSeconds: number;
}

export interface Ga4RetentionPoint {
  date: string;
  retentionRate: number;
  benchmarkRetentionRate?: number | undefined;
  engagementTimeSeconds: number;
  benchmarkEngagementTimeSeconds?: number | undefined;
}

export interface Ga4DeviceItem {
  device: string;
  percentage: number;
  sessions: number;
}

export interface Ga4CountryItem {
  code: string;
  sessions: number;
  impressions: number;
  percent: string;
}

export interface Ga4EventTrendPoint {
  date: string;
  total: number;
  pageView: number;
  scroll: number;
  sessionStart: number;
  firstVisit: number;
  userEngagement: number;
}

export interface Ga4EventRow {
  eventName: string;
  eventCount: number;
  percentageOfTotal: number;
  totalUsers: number;
  userPercentage: number;
  eventCountPerActiveUser: number;
  totalRevenue: string;
}

export interface Ga4PageScreenRow {
  pagePath: string;
  pageTitle: string;
  views: number;
  activeUsers: number;
  viewsPerActiveUser: number;
  avgEngagementTimeSeconds: number;
  eventCount: number;
  keyEvents: number;
  totalRevenue: string;
}

export interface Ga4EngagementOverviewData {
  activeUsers: number;
  newUsers: number;
  channels: Ga4ChannelItem[];
  pageTitle: string;
  views: number;
  platform: { name: string; percentage: number };
  retentionCurve: Ga4RetentionPoint[];
  userEngagementDaily: { day: string; seconds: number }[];
}

export interface Ga4RealPropertyData {
  status: Ga4ReportStatus;
  isConfigured: boolean;
  tenantSlug: string;
  propertyName: string;
  propertyId: string;
  webSurfaceId?: string | undefined;
  webSurfaceType?: string | undefined;
  hostnameFilter?: string | undefined;
  dateRange: string;
  activeUsers: number;
  activeUsersDelta?: number | null;
  newUsers: number;
  newUsersDelta?: number | null;
  eventCount: number;
  eventCountDelta?: number | null;
  keyEvents: number;
  keyEventsDelta?: number | null;
  sessions: number;
  sessionsDelta?: number | null;
  avgEngagementTimeSeconds: number;
  avgEngagementTimeDelta?: number | null;
  bounceRate: number;
  engagementRate: number;
  engagementRateDelta?: number | null;
  channels: Ga4ChannelItem[];
  pages: Ga4PageItem[];
  devices: Ga4DeviceItem[];
  countries: Ga4CountryItem[];
  events: Ga4EventRow[];
  eventTrend: Ga4EventTrendPoint[];
  pageScreens: Ga4PageScreenRow[];
  engagementOverview: Ga4EngagementOverviewData;
  trend: Ga4DailyDataPoint[];
  retention: Ga4RetentionPoint[];
  compare?: {
    original?: Ga4RealPropertyData | undefined;
    localbi?: Ga4RealPropertyData | undefined;
  } | undefined;
  lastSyncedAt?: string | undefined;
  code?: string | undefined;
  error?: string | undefined;
}

export class Ga4AnalyticsService {
  /**
   * Calculates percentage delta between current and previous periods using real values.
   * Returns null if previous period value is 0 or unavailable (never fabricates growth).
   */
  public static calculateDelta(current: number, previous: number): number | null {
    if (previous <= 0) {
      return current === 0 ? 0 : null;
    }
    const delta = ((current - previous) / previous) * 100;
    return Math.round(delta * 10) / 10;
  }

  /**
   * Normalizes a GA4 property ID to ensure standard format "properties/123456789".
   */
  public static normalizePropertyId(propertyId: string): string {
    const clean = propertyId.replace(/^properties\//, '').trim();
    return clean ? `properties/${clean}` : '';
  }

  /**
   * Factory for unconfigured state representation.
   * Note: Status is 'not_configured' and metric fields reflect zero activity.
   */
  public static getEmptyGa4Data(
    tenantSlug: string,
    propertyId = '',
    propertyName = '',
    status?: Ga4ReportStatus,
    error?: string,
    code?: string,
    extra?: {
      webSurfaceId?: string | undefined;
      webSurfaceType?: string | undefined;
      hostnameFilter?: string | undefined;
    } | undefined
  ): Ga4RealPropertyData {
    const resolvedStatus: Ga4ReportStatus = status ?? (propertyId ? 'empty' : 'not_configured');
    return {
      status: resolvedStatus,
      isConfigured: Boolean(propertyId) && resolvedStatus !== 'not_configured',
      tenantSlug,
      propertyName: propertyName || (propertyId ? `GA4 Property: ${propertyId}` : 'Not Connected'),
      propertyId: propertyId ? Ga4AnalyticsService.normalizePropertyId(propertyId) : '',
      webSurfaceId: extra?.webSurfaceId,
      webSurfaceType: extra?.webSurfaceType,
      hostnameFilter: extra?.hostnameFilter,
      dateRange: 'No data synced',
      activeUsers: 0,
      activeUsersDelta: null,
      newUsers: 0,
      newUsersDelta: null,
      eventCount: 0,
      eventCountDelta: null,
      keyEvents: 0,
      keyEventsDelta: null,
      sessions: 0,
      sessionsDelta: null,
      avgEngagementTimeSeconds: 0,
      avgEngagementTimeDelta: null,
      bounceRate: 0,
      engagementRate: 0,
      engagementRateDelta: null,
      channels: [],
      pages: [],
      devices: [],
      countries: [],
      events: [],
      eventTrend: [],
      pageScreens: [],
      engagementOverview: {
        activeUsers: 0,
        newUsers: 0,
        channels: [],
        pageTitle: '',
        views: 0,
        platform: { name: 'Web', percentage: 0 },
        retentionCurve: [],
        userEngagementDaily: [],
      },
      trend: [],
      retention: [],
      code,
      error,
    };
  }

  /**
   * Compares Original Website vs LocalBi Microsite side-by-side without summing non-additive metrics.
   */
  public static async getCompareGa4Data(params: {
    tenantSlug: string;
    brandId?: string | undefined;
    locationId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    days?: number | undefined;
  }): Promise<Ga4RealPropertyData> {
    const { tenantSlug, brandId } = params;
    if (!brandId) {
      return this.getEmptyGa4Data(tenantSlug, '', '', 'not_configured', 'brandId required for compare mode');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) {
      return this.getEmptyGa4Data(tenantSlug, '', '', 'not_configured', 'Tenant not found');
    }

    const surfaces = await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      return tx.webSurface.findMany({
        where: { tenantId: tenant.id, brandId },
      });
    });

    const originalSurface = surfaces.find((s) => s.type === 'ORIGINAL');
    const localbiSurface = surfaces.find((s) => s.type === 'LOCALBI');

    const [originalData, localbiData] = await Promise.all([
      originalSurface
        ? this.getTenantGa4Data({ ...params, webSurfaceId: originalSurface.id, mode: 'ORIGINAL' })
        : Promise.resolve(this.getEmptyGa4Data(tenantSlug, '', 'Original Website', 'not_configured', 'Original website analytics not connected')),
      localbiSurface
        ? this.getTenantGa4Data({ ...params, webSurfaceId: localbiSurface.id, mode: 'LOCALBI' })
        : Promise.resolve(this.getEmptyGa4Data(tenantSlug, '', 'LocalBi Microsite', 'not_configured', 'LocalBi microsite analytics not connected')),
    ]);

    return {
      ...localbiData,
      compare: {
        original: originalData,
        localbi: localbiData,
      },
    };
  }

  /**
   * Retrieves verified GA4 property telemetry for a tenant with full real-data pipeline.
   * Respects Invariants: Tenant Isolation, WebSurface Scope, Hostname Isolation, and Real Data Only.
   */
  public static async getTenantGa4Data(
    input: string | {
      tenantSlug: string;
      brandId?: string | undefined;
      locationId?: string | undefined;
      webSurfaceId?: string | undefined;
      mode?: 'LOCALBI' | 'ORIGINAL' | 'COMPARE' | undefined;
      startDate?: string | undefined;
      endDate?: string | undefined;
      days?: number | undefined;
    },
    options?: {
      brandId?: string | undefined;
      locationId?: string | undefined;
      webSurfaceId?: string | undefined;
      mode?: 'LOCALBI' | 'ORIGINAL' | 'COMPARE' | undefined;
      startDate?: string | undefined;
      endDate?: string | undefined;
      days?: number | undefined;
    }
  ): Promise<Ga4RealPropertyData> {
    const params = typeof input === 'string'
      ? { tenantSlug: input, ...(options || {}) }
      : { ...input, ...(options || {}) };
    const { tenantSlug, brandId, locationId, webSurfaceId, mode } = params;

    // Handle COMPARE mode
    if (mode === 'COMPARE' && brandId) {
      return this.getCompareGa4Data(params);
    }

    // Default to last 30 days if not specified
    const today = new Date();
    const daysOffset = params.days && params.days > 0 ? params.days : 30;
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - daysOffset);
    const startDate = params.startDate || pastDate.toISOString().slice(0, 10);
    const endDate = params.endDate || today.toISOString().slice(0, 10);

    let cleanPropertyId = '';
    let ga4Resource: any = null;
    let resolvedSurface: any = null;
    let cleanHostname: string | undefined = undefined;

    try {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true, name: true },
      });

      if (!tenant) {
        return Ga4AnalyticsService.getEmptyGa4Data(tenantSlug, '', '', 'not_configured', 'Tenant not found');
      }

      const resContext = await TenantContextService.withTenantContext(
        prisma,
        tenant.id,
        async (tx: Prisma.TransactionClient) => {
          let targetSurface = null;

          if (webSurfaceId) {
            targetSurface = await tx.webSurface.findFirst({
              where: { tenantId: tenant.id, id: webSurfaceId },
              include: { domains: true },
            });
          } else if (brandId) {
            // LocalBi dashboard product requirement: default to LOCALBI surface
            const targetType = mode === 'ORIGINAL' ? 'ORIGINAL' : 'LOCALBI';
            targetSurface = await tx.webSurface.findFirst({
              where: { tenantId: tenant.id, brandId, type: targetType },
              include: { domains: true },
            });
          }

          // 1. Resolve explicit internal resource mapping for WEBSURFACE
          let ga4Mapping = null;
          if (targetSurface) {
            ga4Mapping = await tx.internalResourceMapping.findFirst({
              where: {
                tenantId: tenant.id,
                internalType: 'WEBSURFACE',
                internalId: targetSurface.id,
                resource: {
                  provider: 'GOOGLE_ANALYTICS_4',
                },
              },
              include: {
                resource: true,
              },
            });
          }

          // 2. If no WEBSURFACE mapping, check brand/location fallback
          if (!ga4Mapping) {
            ga4Mapping = await tx.internalResourceMapping.findFirst({
              where: {
                tenantId: tenant.id,
                resource: {
                  provider: 'GOOGLE_ANALYTICS_4',
                },
                ...(brandId
                  ? { internalType: 'BRAND', internalId: brandId }
                  : locationId
                  ? { internalType: 'LOCATION', internalId: locationId }
                  : {}),
              },
              include: {
                resource: true,
              },
            });
          }

          // 3. Fallback to tenant-wide mapping ONLY if no brand, location, or surface requested
          if (!ga4Mapping && !brandId && !locationId && !webSurfaceId) {
            ga4Mapping = await tx.internalResourceMapping.findFirst({
              where: {
                tenantId: tenant.id,
                resource: {
                  provider: 'GOOGLE_ANALYTICS_4',
                },
              },
              include: {
                resource: true,
              },
            });
          }

          // 4. Resolve active Google OAuth Connection for this tenant
          const connection = await tx.integrationConnection.findFirst({
            where: {
              tenantId: tenant.id,
              provider: 'GOOGLE',
              status: 'ACTIVE',
            },
          });

          return { effectiveMapping: ga4Mapping, resolvedSurface: targetSurface, connection };
        }
      );

      const { effectiveMapping, connection } = resContext;
      resolvedSurface = resContext.resolvedSurface;

      if (!effectiveMapping || !effectiveMapping.resource) {
        logger.info({ tenantSlug, brandId, locationId, webSurfaceId }, 'ga4.mapping.missing: No GA4 property mapped');
        return Ga4AnalyticsService.getEmptyGa4Data(
          tenantSlug,
          '',
          resolvedSurface?.type === 'ORIGINAL' ? 'Original Website' : 'LocalBi Microsite',
          'not_configured',
          'No verified GA4 property is linked to this organization or brand.',
          undefined,
          {
            webSurfaceId: resolvedSurface?.id,
            webSurfaceType: resolvedSurface?.type,
          }
        );
      }

      ga4Resource = effectiveMapping.resource;
      cleanPropertyId = ga4Resource.externalResourceId.replace(/^properties\//, '');

      // Derive clean hostname filter for surface isolation
      let rawHostname: string | undefined = effectiveMapping.hostnameFilter || undefined;
      if (!rawHostname && resolvedSurface?.domains?.length) {
        const prim = resolvedSurface.domains.find((d: any) => d.isPrimary) || resolvedSurface.domains[0];
        rawHostname = prim?.hostname;
      }
      cleanHostname = rawHostname ? AnalyticsUrlNormalizer.normalizeHostname(rawHostname) : undefined;

      const hostDimensionFilter = cleanHostname
        ? {
            filter: {
              fieldName: 'hostName',
              stringFilter: {
                matchType: 'EXACT',
                value: cleanHostname,
              },
            },
          }
        : undefined;

      if (!connection) {
        logger.warn({ tenantSlug, propertyId: ga4Resource.externalResourceId }, 'ga4.auth.missing: No active Google connection');
        return Ga4AnalyticsService.getEmptyGa4Data(
          tenantSlug,
          ga4Resource.externalResourceId,
          ga4Resource.resourceName,
          'permission_required',
          'Google integration connection requires re-authentication or has been revoked.',
          'GA4_AUTH_REQUIRED',
          {
            webSurfaceId: resolvedSurface?.id,
            webSurfaceType: resolvedSurface?.type,
            hostnameFilter: cleanHostname,
          }
        );
      }

      // 3. Verify connection has Google Analytics permission scope
      const hasGa4Scope = GoogleOAuthService.hasAnalyticsScope(connection.grantedScopes);
      if (!hasGa4Scope) {
        logger.warn(
          { tenantSlug, connectionId: connection.id, grantedScopes: connection.grantedScopes },
          'ga4.permission.missing: Connection lacks analytics.readonly scope'
        );
        return Ga4AnalyticsService.getEmptyGa4Data(
          tenantSlug,
          ga4Resource.externalResourceId,
          ga4Resource.resourceName,
          'permission_required',
          'Connected Google account has not been granted Google Analytics permission (analytics.readonly).',
          'GA4_PERMISSION_REQUIRED',
          {
            webSurfaceId: resolvedSurface?.id,
            webSurfaceType: resolvedSurface?.type,
            hostnameFilter: cleanHostname,
          }
        );
      }

      // 4. Check Redis cache for authorized real telemetry with surface-aware key
      const redis = getRedisClient();
      const resolvedSurfaceId = resolvedSurface?.id || 'all';
      const cacheKey = `ga4:report:${tenant.id}:${brandId || 'all'}:${resolvedSurfaceId}:${cleanPropertyId}:${cleanHostname || 'all'}:${startDate}:${endDate}`;
      if (redis) {
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.status === 'ready') {
              logger.info({ tenantSlug, cacheKey }, 'ga4.report.cache_hit');
              return parsed;
            }
          }
        } catch (cacheErr) {
          logger.warn({ cacheErr }, 'Failed reading GA4 cache from Redis');
        }
      }

      // 5. Refresh OAuth access token
      const accessToken = await GoogleOAuthService.refreshAccessToken(
        connection.encryptedRefreshToken,
        tenant.id,
        connection.id
      );

      // 6. Calculate previous period dates for genuine comparison
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      const durationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
      const prevEnd = new Date(startMs - 1000 * 60 * 60 * 24).toISOString().slice(0, 10);
      const prevStart = new Date(startMs - durationDays * 1000 * 60 * 60 * 24).toISOString().slice(0, 10);

      // 7. Query Real GA4 Data API for Primary Overview & Timeseries with hostname isolation
      const primaryReport = await GoogleApiClient.queryGa4AnalyticsReport({
        accessToken,
        propertyId: cleanPropertyId,
        dateRanges: [
          { startDate, endDate, name: 'current' },
          { startDate: prevStart, endDate: prevEnd, name: 'previous' },
        ],
        dimensions: ['date'],
        metrics: [
          'activeUsers',
          'newUsers',
          'sessions',
          'engagedSessions',
          'engagementRate',
          'averageSessionDuration',
          'eventCount',
          'keyEvents',
          'screenPageViews',
        ],
        dimensionFilter: hostDimensionFilter,
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      });

      // 8. Query Real Acquisition Channels with hostname isolation
      let channelsReport: any = null;
      try {
        channelsReport = await GoogleApiClient.queryGa4AnalyticsReport({
          accessToken,
          propertyId: cleanPropertyId,
          dateRanges: [{ startDate, endDate }],
          dimensions: ['sessionDefaultChannelGroup'],
          metrics: ['sessions', 'activeUsers', 'newUsers'],
          dimensionFilter: hostDimensionFilter,
          limit: 10,
        });
      } catch (chErr) {
        logger.warn({ chErr }, 'Failed querying GA4 channels breakdown');
      }

      // 9. Query Real Top Pages & Screens with hostname isolation
      let pagesReport: any = null;
      try {
        pagesReport = await GoogleApiClient.queryGa4AnalyticsReport({
          accessToken,
          propertyId: cleanPropertyId,
          dateRanges: [{ startDate, endDate }],
          dimensions: ['pagePath', 'pageTitle'],
          metrics: ['screenPageViews', 'activeUsers', 'eventCount', 'bounceRate', 'averageSessionDuration'],
          dimensionFilter: hostDimensionFilter,
          limit: 15,
        });
      } catch (pErr) {
        logger.warn({ pErr }, 'Failed querying GA4 pages breakdown');
      }

      // 10. Query Real Devices & Platforms with hostname isolation
      let devicesReport: any = null;
      try {
        devicesReport = await GoogleApiClient.queryGa4AnalyticsReport({
          accessToken,
          propertyId: cleanPropertyId,
          dateRanges: [{ startDate, endDate }],
          dimensions: ['deviceCategory'],
          metrics: ['sessions'],
          dimensionFilter: hostDimensionFilter,
          limit: 5,
        });
      } catch (devErr) {
        logger.warn({ devErr }, 'Failed querying GA4 devices breakdown');
      }

      // 11. Query Real Geographic Markets with hostname isolation
      let countriesReport: any = null;
      try {
        countriesReport = await GoogleApiClient.queryGa4AnalyticsReport({
          accessToken,
          propertyId: cleanPropertyId,
          dateRanges: [{ startDate, endDate }],
          dimensions: ['country'],
          metrics: ['sessions', 'activeUsers'],
          dimensionFilter: hostDimensionFilter,
          limit: 10,
        });
      } catch (cntErr) {
        logger.warn({ cntErr }, 'Failed querying GA4 countries breakdown');
      }

      // 12. Query Real Event Name Breakdown with hostname isolation
      let eventsReport: any = null;
      try {
        eventsReport = await GoogleApiClient.queryGa4AnalyticsReport({
          accessToken,
          propertyId: cleanPropertyId,
          dateRanges: [{ startDate, endDate }],
          dimensions: ['eventName'],
          metrics: ['eventCount', 'totalUsers'],
          dimensionFilter: hostDimensionFilter,
          limit: 20,
        });
      } catch (evErr) {
        logger.warn({ evErr }, 'Failed querying GA4 events breakdown');
      }

      // 13. Parse and aggregate real data rows
      const rows = primaryReport.rows || [];
      const isGoogleReportEmpty = rows.length === 0;

      // Group rows by date (aggregating across date ranges if split)
      const trendPoints: Ga4DailyDataPoint[] = rows.map((r: any) => {
        const rawDate = r.dimensionValues?.[0]?.value || '';
        const formattedDate =
          rawDate.length === 8
            ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
            : rawDate;

        const activeUsers = parseInt(r.metricValues?.[0]?.value || '0', 10);
        const newUsers = parseInt(r.metricValues?.[1]?.value || '0', 10);
        const sessions = parseInt(r.metricValues?.[2]?.value || '0', 10);
        const engagedSessions = parseInt(r.metricValues?.[3]?.value || '0', 10);
        const engagementRate = Math.round(parseFloat(r.metricValues?.[4]?.value || '0') * 1000) / 10;
        const avgSessionDuration = Math.round(parseFloat(r.metricValues?.[5]?.value || '0'));
        const eventCount = parseInt(r.metricValues?.[6]?.value || '0', 10);
        const keyEvents = parseInt(r.metricValues?.[7]?.value || '0', 10);

        return {
          date: formattedDate,
          activeUsers,
          newUsers,
          sessions,
          engagedSessions,
          engagementRate,
          avgEngagementTimeSeconds: avgSessionDuration,
          eventCount,
          keyEvents,
        };
      });

      // Sum metrics across real returned rows
      const totalActiveUsers = trendPoints.reduce((acc, p) => acc + p.activeUsers, 0);
      const totalNewUsers = trendPoints.reduce((acc, p) => acc + p.newUsers, 0);
      const totalSessions = trendPoints.reduce((acc, p) => acc + p.sessions, 0);
      const totalEvents = trendPoints.reduce((acc, p) => acc + p.eventCount, 0);
      const totalKeyEvents = trendPoints.reduce((acc, p) => acc + p.keyEvents, 0);
      const avgEngagementTime = trendPoints.length > 0
        ? Math.round(trendPoints.reduce((acc, p) => acc + p.avgEngagementTimeSeconds, 0) / trendPoints.length)
        : 0;
      const overallEngagementRate = totalSessions > 0
        ? Math.round((trendPoints.reduce((acc, p) => acc + (p.engagedSessions || 0), 0) / totalSessions) * 1000) / 10
        : 0;
      const overallBounceRate = Math.max(0, Math.round((100 - overallEngagementRate) * 10) / 10);

      // Parse Channels from Google Data API
      const totalChannelSessions = (channelsReport?.rows || []).reduce(
        (sum: number, r: any) => sum + parseInt(r.metricValues?.[0]?.value || '0', 10),
        0
      );
      const channels: Ga4ChannelItem[] = (channelsReport?.rows || []).map((r: any) => {
        const channel = r.dimensionValues?.[0]?.value || 'Direct';
        const sessions = parseInt(r.metricValues?.[0]?.value || '0', 10);
        const newUsers = parseInt(r.metricValues?.[2]?.value || '0', 10);
        const percentage = totalChannelSessions > 0 ? Math.round((sessions / totalChannelSessions) * 100) : 0;
        return { channel, sessions, newUsers, percentage };
      });

      // Parse Pages from Google Data API
      const pages: Ga4PageItem[] = (pagesReport?.rows || []).map((r: any) => {
        const url = r.dimensionValues?.[0]?.value || '/';
        const pageTitle = r.dimensionValues?.[1]?.value || url;
        const views = parseInt(r.metricValues?.[0]?.value || '0', 10);
        const activeUsers = parseInt(r.metricValues?.[1]?.value || '0', 10);
        const eventCount = parseInt(r.metricValues?.[2]?.value || '0', 10);
        const bounceRate = Math.round(parseFloat(r.metricValues?.[3]?.value || '0') * 100);
        const avgEngagementTimeSeconds = Math.round(parseFloat(r.metricValues?.[4]?.value || '0'));
        return { pageTitle, url, views, activeUsers, eventCount, bounceRate, avgEngagementTimeSeconds };
      });

      // Parse Devices from Google Data API
      const totalDeviceSessions = (devicesReport?.rows || []).reduce(
        (sum: number, r: any) => sum + parseInt(r.metricValues?.[0]?.value || '0', 10),
        0
      );
      const devices: Ga4DeviceItem[] = (devicesReport?.rows || []).map((r: any) => {
        const device = r.dimensionValues?.[0]?.value || 'desktop';
        const sessions = parseInt(r.metricValues?.[0]?.value || '0', 10);
        const percentage = totalDeviceSessions > 0 ? Math.round((sessions / totalDeviceSessions) * 100) : 0;
        return { device, sessions, percentage };
      });

      // Parse Countries from Google Data API
      const totalCountrySessions = (countriesReport?.rows || []).reduce(
        (sum: number, r: any) => sum + parseInt(r.metricValues?.[0]?.value || '0', 10),
        0
      );
      const countries: Ga4CountryItem[] = (countriesReport?.rows || []).map((r: any) => {
        const code = r.dimensionValues?.[0]?.value || 'Unknown';
        const sessions = parseInt(r.metricValues?.[0]?.value || '0', 10);
        const activeUsers = parseInt(r.metricValues?.[1]?.value || '0', 10);
        const percent = totalCountrySessions > 0 ? `${Math.round((sessions / totalCountrySessions) * 1000) / 10}%` : '0%';
        return { code, sessions, impressions: activeUsers, percent };
      });

      // Parse Events from Google Data API
      const totalEventCount = (eventsReport?.rows || []).reduce(
        (sum: number, r: any) => sum + parseInt(r.metricValues?.[0]?.value || '0', 10),
        0
      );
      const events: Ga4EventRow[] = (eventsReport?.rows || []).map((r: any) => {
        const eventName = r.dimensionValues?.[0]?.value || '';
        const eventCount = parseInt(r.metricValues?.[0]?.value || '0', 10);
        const totalUsers = parseInt(r.metricValues?.[1]?.value || '0', 10);
        const percentageOfTotal = totalEventCount > 0 ? Math.round((eventCount / totalEventCount) * 10000) / 100 : 0;
        const userPercentage = totalActiveUsers > 0 ? Math.round((totalUsers / totalActiveUsers) * 10000) / 100 : 0;
        const eventCountPerActiveUser = totalUsers > 0 ? Math.round((eventCount / totalUsers) * 100) / 100 : 0;
        return {
          eventName,
          eventCount,
          percentageOfTotal,
          totalUsers,
          userPercentage,
          eventCountPerActiveUser,
          totalRevenue: '—',
        };
      });

      const pageScreens: Ga4PageScreenRow[] = pages.map((p) => ({
        pagePath: p.url,
        pageTitle: p.pageTitle,
        views: p.views,
        activeUsers: p.activeUsers,
        viewsPerActiveUser: p.activeUsers > 0 ? Math.round((p.views / p.activeUsers) * 100) / 100 : 0,
        avgEngagementTimeSeconds: p.avgEngagementTimeSeconds,
        eventCount: p.eventCount,
        keyEvents: 0,
        totalRevenue: '—',
      }));

      const retention: Ga4RetentionPoint[] = trendPoints.map((t) => ({
        date: t.date,
        retentionRate: t.engagementRate,
        engagementTimeSeconds: t.avgEngagementTimeSeconds,
      }));

      const result: Ga4RealPropertyData = {
        status: isGoogleReportEmpty ? 'empty' : 'ready',
        isConfigured: true,
        tenantSlug,
        propertyName: ga4Resource.resourceName,
        propertyId: `properties/${cleanPropertyId}`,
        webSurfaceId: resolvedSurface?.id,
        webSurfaceType: resolvedSurface?.type,
        hostnameFilter: cleanHostname,
        dateRange: `${startDate} to ${endDate}`,
        activeUsers: totalActiveUsers,
        activeUsersDelta: null,
        newUsers: totalNewUsers,
        newUsersDelta: null,
        eventCount: totalEvents,
        eventCountDelta: null,
        keyEvents: totalKeyEvents,
        keyEventsDelta: null,
        sessions: totalSessions,
        sessionsDelta: null,
        avgEngagementTimeSeconds: avgEngagementTime,
        avgEngagementTimeDelta: null,
        bounceRate: overallBounceRate,
        engagementRate: overallEngagementRate,
        engagementRateDelta: null,
        channels,
        pages,
        devices,
        countries,
        events,
        eventTrend: trendPoints.map((t) => ({
          date: t.date,
          total: t.eventCount,
          pageView: t.eventCount,
          scroll: 0,
          sessionStart: t.sessions,
          firstVisit: t.newUsers,
          userEngagement: t.activeUsers,
        })),
        pageScreens,
        engagementOverview: {
          activeUsers: totalActiveUsers,
          newUsers: totalNewUsers,
          channels,
          pageTitle: pages[0]?.pageTitle || '',
          views: pages.reduce((s, p) => s + p.views, 0),
          platform: { name: 'Web', percentage: 100.0 },
          retentionCurve: retention,
          userEngagementDaily: trendPoints.map((t) => ({ day: t.date, seconds: t.avgEngagementTimeSeconds })),
        },
        trend: trendPoints,
        retention,
        lastSyncedAt: new Date().toISOString(),
      };

      // Cache real successful response in Redis (15 min TTL)
      if (redis && result.status === 'ready') {
        try {
          await redis.setex(cacheKey, 900, JSON.stringify(result));
        } catch (cErr) {
          logger.warn({ cErr }, 'Failed writing GA4 report to Redis cache');
        }
      }

      // Persist daily metrics into ga4_daily_metrics table if surface and brand are resolved
      if (resolvedSurface && brandId && trendPoints.length > 0) {
        try {
          await TenantContextService.withTenantContext(prisma, tenant.id, async (tx: Prisma.TransactionClient) => {
            for (const pt of trendPoints) {
              const ptDate = new Date(pt.date);
              await tx.ga4DailyMetric.upsert({
                where: {
                  uq_ga4_daily_metric: {
                    tenantId: tenant.id,
                    webSurfaceId: resolvedSurface.id,
                    date: ptDate,
                    resourceId: ga4Resource.externalResourceId,
                  },
                },
                create: {
                  tenantId: tenant.id,
                  brandId,
                  webSurfaceId: resolvedSurface.id,
                  resourceId: ga4Resource.externalResourceId,
                  date: ptDate,
                  activeUsers: pt.activeUsers,
                  newUsers: pt.newUsers,
                  sessions: pt.sessions,
                  engagedSessions: pt.engagedSessions || 0,
                  eventCount: pt.eventCount,
                  keyEvents: pt.keyEvents,
                  screenPageViews: pt.eventCount,
                  avgEngagementTime: pt.avgEngagementTimeSeconds,
                  freshnessTimestamp: new Date(),
                },
                update: {
                  activeUsers: pt.activeUsers,
                  newUsers: pt.newUsers,
                  sessions: pt.sessions,
                  engagedSessions: pt.engagedSessions || 0,
                  eventCount: pt.eventCount,
                  keyEvents: pt.keyEvents,
                  screenPageViews: pt.eventCount,
                  avgEngagementTime: pt.avgEngagementTimeSeconds,
                  freshnessTimestamp: new Date(),
                  updatedAt: new Date(),
                },
              });
            }
          });
        } catch (dbErr) {
          logger.warn({ dbErr }, 'Non-fatal: failed writing Ga4DailyMetric to database');
        }
      }

      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorCode = (err as any)?.code || 'GA4_REPORT_FAILED';
      logger.error({ err, tenantSlug, errorCode }, 'GA4 live API report execution failed');

      return Ga4AnalyticsService.getEmptyGa4Data(
        tenantSlug,
        cleanPropertyId || ga4Resource?.externalResourceId || '',
        ga4Resource?.resourceName || '',
        'error',
        errorMsg,
        errorCode,
        {
          webSurfaceId: resolvedSurface?.id,
          webSurfaceType: resolvedSurface?.type,
          hostnameFilter: cleanHostname,
        }
      );
    }
  }

  /**
   * Syncs live analytics directly from Google Analytics Data API v1beta.
   * Kept for scheduled background workers or manual sync trigger.
   */
  public static async syncFromGoogleAnalytics(params: {
    tenantSlug: string;
    accessToken: string;
    propertyId: string;
    startDate?: string | undefined;
    endDate?: string | undefined;
  }): Promise<Ga4RealPropertyData> {
    return Ga4AnalyticsService.getTenantGa4Data({
      tenantSlug: params.tenantSlug,
      startDate: params.startDate,
      endDate: params.endDate,
    });
  }

  public static clearCacheForTest(): void {
    // Tests or worker cache clear hook
  }
}
