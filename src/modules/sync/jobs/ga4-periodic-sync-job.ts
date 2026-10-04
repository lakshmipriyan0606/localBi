import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { GoogleApiClient } from '@/modules/integrations/google/google-api-client';
import { logger } from '@/shared/observability/logger';

const SYNC_LOOKBACK_DAYS = 2;   // overlap window for late-arriving GA4 events
const MAX_HISTORICAL_DAYS = 90; // back-fill window for first sync

/**
 * GA4 Periodic Sync Job
 *
 * For every tenant that has an ACTIVE Google connection and at least one
 * GA4 resource mapping (WEBSURFACE → GOOGLE_ANALYTICS_4), this job:
 *   1. Resolves the GA4 property ID from the InternalResourceMapping
 *   2. Determines incremental date range via SyncCursor
 *   3. Fetches daily metrics from Google Analytics Data API (runReport)
 *   4. Upserts into Ga4DailyMetric table
 *   5. Advances the SyncCursor
 *
 * Intended to be called by the cron-scheduler (e.g. daily at 03:00).
 */
export class Ga4PeriodicSyncJob {
  public static async execute(): Promise<{
    tenantsProcessed: number;
    surfacesQueued: number;
    rowsIngested: number;
    errors: number;
  }> {
    logger.info('Ga4PeriodicSyncJob: starting run');

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Find all tenants with an active Google connection and a GA4 mapping
    const activeTenants = await prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
        connections: { some: { status: 'ACTIVE', provider: 'GOOGLE' } },
        resourceMappings: {
          some: { resource: { provider: 'GOOGLE_ANALYTICS_4' } },
        },
      },
      select: { id: true, slug: true },
    });

    logger.info({ count: activeTenants.length }, 'Ga4PeriodicSyncJob: tenants to process');

    let surfacesQueued = 0;
    let totalRowsIngested = 0;
    let errors = 0;

    for (const tenant of activeTenants) {
      try {
        // Resolve all GA4 mappings + active connection for this tenant
        const { ga4Mappings, connection } = await TenantContextService.withTenantContext(
          prisma,
          tenant.id,
          async (tx) => {
            const mappings = await tx.internalResourceMapping.findMany({
              where: {
                tenantId: tenant.id,
                resource: { provider: 'GOOGLE_ANALYTICS_4' },
              },
              include: { resource: true },
            });
            const conn = await tx.integrationConnection.findFirst({
              where: { tenantId: tenant.id, status: 'ACTIVE', provider: 'GOOGLE' },
            });
            return { ga4Mappings: mappings, connection: conn };
          }
        );

        if (!connection?.encryptedRefreshToken) {
          logger.warn({ tenantId: tenant.id }, 'Ga4PeriodicSyncJob: no active connection, skipping');
          continue;
        }

        // Refresh access token once per tenant
        let accessToken: string;
        try {
          accessToken = await GoogleOAuthService.refreshAccessToken(
            connection.encryptedRefreshToken,
            tenant.id,
            connection.id
          );
        } catch (err) {
          errors++;
          logger.error({ err, tenantId: tenant.id }, 'Ga4PeriodicSyncJob: token refresh failed');
          continue;
        }

        for (const mapping of ga4Mappings) {
          try {
            const ga4PropertyId = mapping.resource.externalResourceId; // e.g. "123456789"

            // Resolve incremental date range via SyncCursor
            const cursor = await TenantContextService.withTenantContext(
              prisma,
              tenant.id,
              async (tx) =>
                tx.syncCursor.findFirst({
                  where: {
                    tenantId: tenant.id,
                    provider: 'GA4',
                    resourceId: ga4PropertyId,
                    cursorKey: 'last_synced_date',
                  },
                })
            );

            let startDate: string;
            if (cursor?.cursorValue) {
              const cursorDate = new Date(cursor.cursorValue);
              cursorDate.setDate(cursorDate.getDate() - SYNC_LOOKBACK_DAYS);
              startDate = cursorDate.toISOString().slice(0, 10);
            } else {
              const historical = new Date();
              historical.setDate(today.getDate() - MAX_HISTORICAL_DAYS);
              startDate = historical.toISOString().slice(0, 10);
            }

            // Fetch daily metrics from Google Analytics Data API
            const rows = await (GoogleApiClient as any).queryGa4DailyMetrics(
              accessToken,
              ga4PropertyId,
              startDate,
              todayStr
            );

            let rowsIngested = 0;

            await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
              for (const row of rows) {
                const rowDate = new Date(row.date);
                await tx.ga4DailyMetric.upsert({
                  where: {
                    uq_ga4_daily_metric: {
                      tenantId: tenant.id,
                      webSurfaceId: (row as any).webSurfaceId || '',
                      date: rowDate,
                      resourceId: ga4PropertyId,
                    },
                  },
                  create: {
                    tenantId: tenant.id,
                    brandId: (row as any).brandId || '',
                    webSurfaceId: (row as any).webSurfaceId || '',
                    resourceId: ga4PropertyId,
                    date: rowDate,
                    activeUsers: row.activeUsers ?? 0,
                    newUsers: row.newUsers ?? 0,
                    sessions: row.sessions ?? 0,
                    engagedSessions: row.engagedSessions ?? 0,
                    eventCount: row.eventCount ?? 0,
                    keyEvents: row.keyEvents ?? 0,
                    avgEngagementTime: row.avgEngagementTimeSec ?? 0,
                  },
                  update: {
                    activeUsers: row.activeUsers ?? 0,
                    newUsers: row.newUsers ?? 0,
                    sessions: row.sessions ?? 0,
                    engagedSessions: row.engagedSessions ?? 0,
                    eventCount: row.eventCount ?? 0,
                    keyEvents: row.keyEvents ?? 0,
                    avgEngagementTime: row.avgEngagementTimeSec ?? 0,
                  },
                });
                rowsIngested++;
              }

              // Advance the sync cursor
              const existingCursor = await tx.syncCursor.findFirst({
                where: {
                  tenantId: tenant.id,
                  provider: 'GA4',
                  resourceId: ga4PropertyId,
                  cursorKey: 'last_synced_date',
                },
              });
              if (existingCursor) {
                await tx.syncCursor.update({
                  where: { id: existingCursor.id },
                  data: { cursorValue: todayStr },
                });
              } else {
                await tx.syncCursor.create({
                  data: {
                    tenantId: tenant.id,
                    provider: 'GA4',
                    resourceId: ga4PropertyId,
                    cursorKey: 'last_synced_date',
                    cursorValue: todayStr,
                  },
                });
              }
            });

            totalRowsIngested += rowsIngested;
            surfacesQueued++;

            logger.info(
              { tenantId: tenant.id, ga4PropertyId, startDate, rowsIngested },
              'Ga4PeriodicSyncJob: synced GA4 property'
            );
          } catch (err) {
            errors++;
            logger.error(
              { err, tenantId: tenant.id, resourceId: mapping.resource.externalResourceId },
              'Ga4PeriodicSyncJob: failed to sync GA4 property'
            );
          }
        }
      } catch (err) {
        errors++;
        logger.error({ err, tenantId: tenant.id }, 'Ga4PeriodicSyncJob: failed to process tenant');
      }
    }

    const result = {
      tenantsProcessed: activeTenants.length,
      surfacesQueued,
      rowsIngested: totalRowsIngested,
      errors,
    };
    logger.info(result, 'Ga4PeriodicSyncJob: run complete');
    return result;
  }
}
