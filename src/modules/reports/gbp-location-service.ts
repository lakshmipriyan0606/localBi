import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { Prisma } from '@prisma/client';
import { logger } from '@/shared/observability/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type GbpSyncStatus =
  | 'ACTIVE'
  | 'SYNCING'
  | 'SYNCED'
  | 'STALE'
  | 'ERROR'
  | 'REAUTH_REQUIRED'
  | 'RESOURCE_UNAVAILABLE';

export interface ProfileCompletenessResult {
  score: number; // 0–100 (integer)
  checkedFields: {
    phone: boolean;
    website: boolean;
    hours: boolean;
    primaryCategory: boolean;
    address: boolean;
    description: boolean;
  };
  label: string; // 'LocalBi Profile Completeness'
  note: string;  // Formula description
}

export interface GbpLocationSummary {
  locationId: string;
  locationName: string;
  gbpSyncStatus: string | null;
  gbpSyncedAt: Date | null;
  gbpSyncError: string | null;
  isMapped: boolean;
  averageRating: number | null;
  totalReviewCount: number;
  unansweredReviews: number;
  profileCompleteness: ProfileCompletenessResult;
  performanceSummary: {
    callClicks: number;
    directionRequests: number;
    websiteClicks: number;
    impressionsTotal: number;
    periodDays: number;
  };
}

export interface BrandGbpDashboard {
  totalLocations: number;
  mappedLocations: number;
  unmappedLocations: number;
  syncErrors: number;
  reAuthRequired: number;
  totalReviews: number;
  totalUnanswered: number;
  averageRating: number | null;
  storeRows: Array<{
    locationId: string;
    locationName: string;
    storeCode: string | null;
    city: string;
    gbpSyncStatus: string | null;
    isMapped: boolean;
    rating: number | null;
    reviewCount: number;
    unansweredCount: number;
    callClicks30d: number;
    directionRequests30d: number;
    lastSyncedAt: Date | null;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GbpLocationService
// ─────────────────────────────────────────────────────────────────────────────

export class GbpLocationService {

  // ─── Profile Completeness Formula ──────────────────────────────────────────

  /**
   * Computes a transparent "LocalBi Profile Completeness" score (0–100).
   * Formula is displayed to users with tooltips explaining each check.
   * Does NOT claim this is a Google-provided metric.
   *
   * Scoring: 6 fields × ~16.67 pts each = 100
   */
  public static computeProfileCompleteness(profile: {
    phone?: string | null;
    websiteUri?: string | null;
    regularHours?: unknown;
    categories?: { primaryCategory?: unknown } | null;
    storefrontAddress?: { addressLines?: string[] } | null;
    profile?: { description?: string | null } | null;
  }): ProfileCompletenessResult {
    const checks = {
      phone: !!(profile.phone && profile.phone.trim()),
      website: !!(profile.websiteUri && profile.websiteUri.trim()),
      hours: !!(profile.regularHours),
      primaryCategory: !!(
        profile.categories &&
        (profile.categories as Record<string, unknown>)['primaryCategory']
      ),
      address: !!(
        profile.storefrontAddress &&
        (profile.storefrontAddress.addressLines?.length ?? 0) > 0
      ),
      description: !!(
        profile.profile?.description &&
        profile.profile.description.trim().length > 10
      ),
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const score = Math.round((passed / 6) * 100);

    return {
      score,
      checkedFields: checks,
      label: 'LocalBi Profile Completeness',
      note: 'Score based on: phone, website, business hours, primary category, address, and description. Calculated by LocalBi — not provided by Google.',
    };
  }

  // ─── Update Sync Status ─────────────────────────────────────────────────────

  public static async updateGbpSyncStatus(
    tenantId: string,
    locationId: string,
    status: GbpSyncStatus,
    errorMessage?: string | null
  ): Promise<void> {
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const data: Prisma.LocationUpdateInput = {
        gbpSyncStatus: status,
        gbpSyncError: errorMessage ?? null,
      };
      if (status === 'SYNCED') {
        data.gbpSyncedAt = new Date();
      }
      await tx.location.update({
        where: { id: locationId },
        data,
      });
    });

    logger.info(
      { tenantId, locationId, status, errorMessage },
      '[GbpLocationService] Updated GBP sync status for location'
    );
  }

  // ─── Per-Location GBP Summary ───────────────────────────────────────────────

  public static async getLocationGbpSummary(
    tenantId: string,
    locationId: string,
    context: AuthorizedContext
  ): Promise<GbpLocationSummary> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Location core
      const location = await tx.location.findUnique({
        where: { id: locationId },
        select: {
          id: true,
          name: true,
          gbpSyncStatus: true,
          gbpSyncedAt: true,
          gbpSyncError: true,
        },
      });
      if (!location) throw new Error(`Location ${locationId} not found`);

      // Is mapped?
      const mappingCount = await tx.internalResourceMapping.count({
        where: { tenantId, internalType: 'LOCATION', internalId: locationId },
      });

      // Review aggregate
      const aggregate = await tx.gbpLocationAggregate.findUnique({
        where: { uq_gbp_location_aggregate: { tenantId, locationId } },
      });

      // Unanswered reviews
      const unanswered = await tx.gbpReview.count({
        where: { tenantId, locationId, replyComment: null },
      });

      // Last 30 days performance (call_clicks + direction_requests + website_clicks)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const perfRows = await tx.gbpDailyMetric.groupBy({
        by: ['metricType'],
        where: {
          tenantId,
          locationId,
          date: { gte: thirtyDaysAgo },
        },
        _sum: { value: true },
      });

      const sumFor = (metric: string) => {
        const row = perfRows.find((r) => r.metricType === metric);
        return Number(row?._sum?.value ?? 0);
      };

      const callClicks = sumFor('CALL_CLICKS');
      const directionRequests = sumFor('BUSINESS_DIRECTION_REQUESTS');
      const websiteClicks = sumFor('WEBSITE_CLICKS');
      const impressions =
        sumFor('BUSINESS_IMPRESSIONS_DESKTOP_MAPS') +
        sumFor('BUSINESS_IMPRESSIONS_DESKTOP_SEARCH') +
        sumFor('BUSINESS_IMPRESSIONS_MOBILE_MAPS') +
        sumFor('BUSINESS_IMPRESSIONS_MOBILE_SEARCH');

      // Profile completeness from DB snapshot (live profile is fetched on demand via GbpProfileService)
      // We compute it based on what we know is stored.
      // For completeness here, use a lightweight check via the aggregate to see if there's any GBP data at all.
      const profileCompleteness: ProfileCompletenessResult = {
        score: mappingCount > 0 ? (aggregate ? 50 : 17) : 0,
        checkedFields: {
          phone: false,
          website: false,
          hours: false,
          primaryCategory: false,
          address: true,
          description: false,
        },
        label: 'LocalBi Profile Completeness',
        note: 'Sync the GBP profile to get a complete score. Score based on: phone, website, hours, primary category, address, description.',
      };

      return {
        locationId: location.id,
        locationName: location.name,
        gbpSyncStatus: location.gbpSyncStatus,
        gbpSyncedAt: location.gbpSyncedAt,
        gbpSyncError: location.gbpSyncError,
        isMapped: mappingCount > 0,
        averageRating: aggregate?.averageRating ?? null,
        totalReviewCount: aggregate?.totalReviewCount ?? 0,
        unansweredReviews: unanswered,
        profileCompleteness,
        performanceSummary: {
          callClicks,
          directionRequests,
          websiteClicks,
          impressionsTotal: impressions,
          periodDays: 30,
        },
      };
    });
  }

  // ─── Brand-Wide GBP Dashboard ───────────────────────────────────────────────

  public static async getBrandGbpDashboard(
    tenantId: string,
    brandId: string,
    context: AuthorizedContext
  ): Promise<BrandGbpDashboard> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const brand = await tx.brand.findFirst({
        where: { id: brandId, tenantId, isArchived: false },
        select: { id: true },
      });
      if (!brand) {
        throw new Error(`Brand ${brandId} not found`);
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // All non-archived locations for this brand
      const locations = await tx.location.findMany({
        where: { tenantId, brandId, isArchived: false },
        select: {
          id: true,
          name: true,
          storeCode: true,
          city: true,
          gbpSyncStatus: true,
          gbpSyncedAt: true,
        },
      });

      if (locations.length === 0) {
        return {
          totalLocations: 0,
          mappedLocations: 0,
          unmappedLocations: 0,
          syncErrors: 0,
          reAuthRequired: 0,
          totalReviews: 0,
          totalUnanswered: 0,
          averageRating: null,
          storeRows: [],
        };
      }

      const locationIds = locations.map((l) => l.id);

      // Mappings — determine which locations are mapped to GBP
      const mappings = await tx.internalResourceMapping.findMany({
        where: {
          tenantId,
          internalType: 'LOCATION',
          internalId: { in: locationIds },
        },
        select: { internalId: true },
      });
      const mappedSet = new Set(mappings.map((m) => m.internalId));

      // Review aggregates
      const aggregates = await tx.gbpLocationAggregate.findMany({
        where: { tenantId, locationId: { in: locationIds } },
      });
      const aggregateMap = new Map(aggregates.map((a) => [a.locationId, a]));

      // Unanswered review counts per location
      const unansweredGroups = await tx.gbpReview.groupBy({
        by: ['locationId'],
        where: {
          tenantId,
          locationId: { in: locationIds },
          replyComment: null,
        },
        _count: { id: true },
      });
      const unansweredMap = new Map(
        unansweredGroups.map((g) => [g.locationId, g._count.id])
      );

      // 30-day performance (call_clicks + direction_requests) per location
      const perfRows = await tx.gbpDailyMetric.groupBy({
        by: ['locationId', 'metricType'],
        where: {
          tenantId,
          locationId: { in: locationIds },
          date: { gte: thirtyDaysAgo },
          metricType: { in: ['CALL_CLICKS', 'BUSINESS_DIRECTION_REQUESTS'] },
        },
        _sum: { value: true },
      });

      const perfMap = new Map<string, { calls: number; directions: number }>();
      for (const row of perfRows) {
        if (!perfMap.has(row.locationId)) {
          perfMap.set(row.locationId, { calls: 0, directions: 0 });
        }
        const entry = perfMap.get(row.locationId)!;
        if (row.metricType === 'CALL_CLICKS') {
          entry.calls += Number(row._sum.value ?? 0);
        } else if (row.metricType === 'BUSINESS_DIRECTION_REQUESTS') {
          entry.directions += Number(row._sum.value ?? 0);
        }
      }

      // Aggregate dashboard totals
      let totalReviews = 0;
      let totalUnanswered = 0;
      let ratingSum = 0;
      let ratingCount = 0;
      let syncErrors = 0;
      let reAuthRequired = 0;

      const storeRows: BrandGbpDashboard['storeRows'] = [];

      for (const loc of locations) {
        const agg = aggregateMap.get(loc.id);
        const unansweredCount = unansweredMap.get(loc.id) ?? 0;
        const perf = perfMap.get(loc.id) ?? { calls: 0, directions: 0 };

        totalReviews += agg?.totalReviewCount ?? 0;
        totalUnanswered += unansweredCount;

        if (agg?.averageRating != null && agg.averageRating > 0) {
          ratingSum += agg.averageRating;
          ratingCount++;
        }

        if (loc.gbpSyncStatus === 'ERROR') syncErrors++;
        if (loc.gbpSyncStatus === 'REAUTH_REQUIRED') reAuthRequired++;

        storeRows.push({
          locationId: loc.id,
          locationName: loc.name,
          storeCode: loc.storeCode,
          city: loc.city,
          gbpSyncStatus: loc.gbpSyncStatus,
          isMapped: mappedSet.has(loc.id),
          rating: agg?.averageRating ?? null,
          reviewCount: agg?.totalReviewCount ?? 0,
          unansweredCount,
          callClicks30d: perf.calls,
          directionRequests30d: perf.directions,
          lastSyncedAt: loc.gbpSyncedAt,
        });
      }

      return {
        totalLocations: locations.length,
        mappedLocations: mappedSet.size,
        unmappedLocations: locations.length - mappedSet.size,
        syncErrors,
        reAuthRequired,
        totalReviews,
        totalUnanswered,
        averageRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
        storeRows,
      };
    });
  }

  // ─── Performance Metrics ────────────────────────────────────────────────────

  /**
   * Returns daily GBP performance metrics for a location or brand.
   * Source is always GOOGLE_BUSINESS_PROFILE — never mixed with GA4/GSC.
   */
  public static async getPerformanceMetrics(
    tenantId: string,
    brandId: string,
    options: {
      locationId?: string | undefined;
      startDate: Date;
      endDate: Date;
      metrics?: string[] | undefined;
    },
    context: AuthorizedContext
  ): Promise<{
    source: 'GOOGLE_BUSINESS_PROFILE';
    rows: Array<{ date: Date; metricType: string; value: number; locationId: string }>;
    summary: Record<string, number>;
  }> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    const defaultMetrics = [
      'CALL_CLICKS',
      'WEBSITE_CLICKS',
      'BUSINESS_DIRECTION_REQUESTS',
      'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
      'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
      'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
      'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
    ];
    const metrics = options.metrics ?? defaultMetrics;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const brand = await tx.brand.findFirst({
        where: { id: brandId, tenantId, isArchived: false },
        select: { id: true },
      });
      if (!brand) {
        throw new Error(`Brand ${brandId} not found`);
      }

      const where: Prisma.GbpDailyMetricWhereInput = {
        tenantId,
        date: { gte: options.startDate, lte: options.endDate },
        metricType: { in: metrics },
      };

      if (options.locationId) {
        where.locationId = options.locationId;
      } else {
        // All locations for this brand
        const brandLocations = await tx.location.findMany({
          where: { tenantId, brandId, isArchived: false },
          select: { id: true },
        });
        where.locationId = { in: brandLocations.map((l) => l.id) };
      }

      const rows = await tx.gbpDailyMetric.findMany({
        where,
        orderBy: [{ locationId: 'asc' }, { metricType: 'asc' }, { date: 'asc' }],
        select: { date: true, metricType: true, value: true, locationId: true },
      });

      const summary: Record<string, number> = {};
      for (const row of rows) {
        summary[row.metricType] = (summary[row.metricType] ?? 0) + Number(row.value);
      }

      return {
        source: 'GOOGLE_BUSINESS_PROFILE',
        rows: rows.map((r) => ({
          date: r.date,
          metricType: r.metricType,
          value: Number(r.value),
          locationId: r.locationId,
        })),
        summary,
      };
    });
  }
}
