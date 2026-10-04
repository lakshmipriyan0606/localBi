import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ListingService } from '@/modules/listings/listing-service';
import { logger } from '@/shared/observability/logger';

const AUDIT_INTERVAL_HOURS = 48; // re-audit each store's listings every 48 hours
const MAX_STORES_PER_RUN = 50;   // cap to avoid overwhelming the listing providers

/**
 * Listing Periodic Sync Job
 *
 * For every active tenant that has directory listings, this job:
 *   1. Finds stores whose listing audit is overdue (based on SyncCursor)
 *   2. Calls ListingService.auditAllStoreListings for each store
 *   3. Advances the SyncCursor per store on success
 *
 * This refreshes NAP consistency scores, detects new duplicates, and
 * surfaces listing opportunities for the Listings dashboard.
 *
 * Intended to be called by the cron-scheduler (e.g. every 12 hours).
 */
export class ListingPeriodicSyncJob {
  public static async execute(): Promise<{
    tenantsProcessed: number;
    storesAudited: number;
    storesSkipped: number;
    errors: number;
  }> {
    logger.info('ListingPeriodicSyncJob: starting run');

    const now = new Date();

    const activeTenants = await prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
        directoryListings: { some: {} },
      },
      select: { id: true, slug: true },
    });

    logger.info({ count: activeTenants.length }, 'ListingPeriodicSyncJob: tenants to process');

    let storesAudited = 0;
    let storesSkipped = 0;
    let errors = 0;

    for (const tenant of activeTenants) {
      try {
        // Get all stores for this tenant that have at least one listing
        const stores = await TenantContextService.withTenantContext(
          prisma,
          tenant.id,
          async (tx) =>
            tx.location.findMany({
              where: {
                tenantId: tenant.id,
                directoryListings: { some: {} },
              },
              select: { id: true, name: true },
              take: MAX_STORES_PER_RUN,
            })
        );

        for (const store of stores) {
          try {
            // Check the last audit time from SyncCursor
            const cursor = await TenantContextService.withTenantContext(
              prisma,
              tenant.id,
              async (tx) =>
                tx.syncCursor.findFirst({
                  where: {
                    tenantId: tenant.id,
                    provider: 'LISTINGS',
                    resourceId: store.id,
                    cursorKey: 'last_audit_time',
                  },
                })
            );

            const lastAuditTime = cursor?.cursorValue
              ? new Date(cursor.cursorValue).getTime()
              : 0;

            const auditOverdue =
              now.getTime() - lastAuditTime > AUDIT_INTERVAL_HOURS * 60 * 60 * 1000;

            if (!auditOverdue) {
              storesSkipped++;
              logger.debug(
                { tenantId: tenant.id, storeId: store.id },
                'ListingPeriodicSyncJob: store audit not due yet, skipping'
              );
              continue;
            }

            // Run the listing audit for this store
            await ListingService.auditAllStoreListings(tenant.id, store.id);

            // Advance the SyncCursor
            await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
              const existingCursor = await tx.syncCursor.findFirst({
                where: {
                  tenantId: tenant.id,
                  provider: 'LISTINGS',
                  resourceId: store.id,
                  cursorKey: 'last_audit_time',
                },
              });

              if (existingCursor) {
                await tx.syncCursor.update({
                  where: { id: existingCursor.id },
                  data: { cursorValue: now.toISOString() },
                });
              } else {
                await tx.syncCursor.create({
                  data: {
                    tenantId: tenant.id,
                    provider: 'LISTINGS',
                    resourceId: store.id,
                    cursorKey: 'last_audit_time',
                    cursorValue: now.toISOString(),
                  },
                });
              }
            });

            storesAudited++;
            logger.info(
              { tenantId: tenant.id, storeId: store.id, storeName: store.name },
              'ListingPeriodicSyncJob: audited store listings'
            );
          } catch (err) {
            errors++;
            logger.error(
              { err, tenantId: tenant.id, storeId: store.id },
              'ListingPeriodicSyncJob: failed to audit store'
            );
          }
        }
      } catch (err) {
        errors++;
        logger.error({ err, tenantId: tenant.id }, 'ListingPeriodicSyncJob: failed to process tenant');
      }
    }

    const result = {
      tenantsProcessed: activeTenants.length,
      storesAudited,
      storesSkipped,
      errors,
    };
    logger.info(result, 'ListingPeriodicSyncJob: run complete');
    return result;
  }
}
