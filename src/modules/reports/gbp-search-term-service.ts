import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { Prisma } from '@prisma/client';
import { logger } from '@/shared/observability/logger';

/**
 * GbpSearchTermService
 *
 * Manages GBP keyword impression data from the Business Profile Performance API.
 *
 * CRITICAL PROVENANCE RULE:
 * GBP search terms (from Google Business Profile Performance API) are ALWAYS
 * stored with source = 'GOOGLE_BUSINESS_PROFILE' and NEVER mixed with GSC queries
 * (which originate from Google Search Console). Dashboards must label them distinctly.
 *
 * Note: As of Phase 6, GBP does not expose raw keyword impression terms via the
 * Performance API (fetchMultiDailyMetricsTimeSeries). The table and service are
 * built ready for when/if Google exposes this data. Current sync method is a no-op
 * placeholder that stores nothing rather than inventing data.
 */

export interface GbpSearchTermRow {
  id: string;
  locationId: string;
  term: string;
  impressions: number;
  periodStart: Date;
  periodEnd: Date;
  source: string;
  syncedAt: Date;
}

export interface GetSearchTermsOptions {
  locationId?: string | undefined;
  periodStart?: Date | undefined;
  periodEnd?: Date | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export class GbpSearchTermService {
  /**
   * Lists persisted GBP search terms from the local database.
   * Returns GOOGLE_BUSINESS_PROFILE sourced data only — never GSC queries.
   */
  public static async getSearchTerms(
    tenantId: string,
    brandId: string,
    options: GetSearchTermsOptions,
    context: AuthorizedContext
  ): Promise<{
    items: GbpSearchTermRow[];
    totalCount: number;
    source: 'GOOGLE_BUSINESS_PROFILE';
    note: string;
  }> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const brand = await tx.brand.findFirst({
        where: { id: brandId, tenantId, isArchived: false },
        select: { id: true },
      });
      if (!brand) {
        throw new Error(`Brand ${brandId} not found`);
      }

      const where: Prisma.GbpSearchTermWhereInput = {
        tenantId,
        source: 'GOOGLE_BUSINESS_PROFILE',
      };

      if (options.locationId) {
        where.locationId = options.locationId;
      } else {
        // Scope to all locations for this brand
        const brandLocations = await tx.location.findMany({
          where: { tenantId, brandId, isArchived: false },
          select: { id: true },
        });
        where.locationId = { in: brandLocations.map((l) => l.id) };
      }

      if (options.periodStart || options.periodEnd) {
        where.periodStart = {};
        if (options.periodStart) where.periodStart.gte = options.periodStart;
        if (options.periodEnd) where.periodStart.lte = options.periodEnd;
      }

      const [items, totalCount] = await Promise.all([
        tx.gbpSearchTerm.findMany({
          where,
          orderBy: [{ impressions: 'desc' }, { periodStart: 'desc' }],
          take: options.limit ?? 100,
          skip: options.offset ?? 0,
          select: {
            id: true,
            locationId: true,
            term: true,
            impressions: true,
            periodStart: true,
            periodEnd: true,
            source: true,
            syncedAt: true,
          },
        }),
        tx.gbpSearchTerm.count({ where }),
      ]);

      return {
        items: items.map((row) => ({
          ...row,
          impressions: Number(row.impressions),
        })),
        totalCount,
        source: 'GOOGLE_BUSINESS_PROFILE',
        note: 'Search terms are sourced from Google Business Profile Performance API. Distinct from Google Search Console queries.',
      };
    });
  }

  /**
   * Syncs GBP search keyword impressions for a location.
   *
   * As of the current GBP Performance API (businessprofileperformance.googleapis.com/v1),
   * keyword-level impressions are NOT exposed via fetchMultiDailyMetricsTimeSeries.
   * The available metrics are impression counts by surface/device only.
   *
   * This method is a safe no-op placeholder. It logs the attempt and returns without
   * creating data. It will be activated when Google exposes keyword impression data.
   *
   * @returns { synced: 0, reason: 'GBP_SEARCH_TERMS_NOT_AVAILABLE_IN_API' }
   */
  public static async syncSearchTerms(
    tenantId: string,
    locationId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _accessToken?: string
  ): Promise<{ synced: number; reason?: string }> {
    logger.info(
      { tenantId, locationId },
      '[GbpSearchTermService] GBP keyword impression sync called. ' +
        'The Business Profile Performance API does not currently expose keyword-level impressions. ' +
        'Skipping without creating data (zero-mock policy).'
    );

    return {
      synced: 0,
      reason: 'GBP_SEARCH_TERMS_NOT_AVAILABLE_IN_API',
    };
  }

  /**
   * Upserts GBP search term records (for future use when API exposes the data).
   * Maintains provenance: source is always 'GOOGLE_BUSINESS_PROFILE'.
   */
  public static async upsertSearchTerms(
    tenantId: string,
    locationId: string,
    terms: Array<{
      term: string;
      impressions: number;
      periodStart: Date;
      periodEnd: Date;
    }>
  ): Promise<{ upserted: number }> {
    if (terms.length === 0) return { upserted: 0 };

    let upserted = 0;
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      for (const t of terms) {
        await tx.gbpSearchTerm.upsert({
          where: {
            uq_gbp_search_term: {
              tenantId,
              locationId,
              term: t.term,
              periodStart: t.periodStart,
            },
          },
          create: {
            tenantId,
            locationId,
            term: t.term,
            impressions: t.impressions,
            periodStart: t.periodStart,
            periodEnd: t.periodEnd,
            source: 'GOOGLE_BUSINESS_PROFILE',
            syncedAt: new Date(),
          },
          update: {
            impressions: t.impressions,
            syncedAt: new Date(),
          },
        });
        upserted++;
      }
    });

    return { upserted };
  }
}
