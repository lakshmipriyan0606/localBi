import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { SyncQueueService } from '../sync-queue';
import { logger } from '@/shared/observability/logger';

const RECONCILE_INTERVAL_HOURS = 24; // reconcile full brand catalog once per day
const INVENTORY_INTERVAL_HOURS = 6;  // re-sync store inventory every 6 hours

/**
 * Merchant Periodic Sync Job
 *
 * For every tenant that has at least one configured MerchantBrandConfig:
 *   1. Enqueues a MERCHANT_RECONCILE job per brand if the last reconcile was
 *      more than RECONCILE_INTERVAL_HOURS ago (or never ran)
 *   2. Enqueues MERCHANT_INVENTORY_SYNC jobs per store for brands that have
 *      local inventory enabled, rate-limited by INVENTORY_INTERVAL_HOURS
 *
 * Intended to be called by the cron-scheduler (e.g. every 6 hours).
 */
export class MerchantPeriodicSyncJob {
  public static async execute(): Promise<{
    tenantsProcessed: number;
    reconcileJobsQueued: number;
    inventoryJobsQueued: number;
    errors: number;
  }> {
    logger.info('MerchantPeriodicSyncJob: starting run');

    const now = new Date();

    const activeTenants = await prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
        merchantBrandConfigs: { some: {} },
      },
      select: { id: true, slug: true },
    });

    logger.info({ count: activeTenants.length }, 'MerchantPeriodicSyncJob: tenants to process');

    let reconcileJobsQueued = 0;
    let inventoryJobsQueued = 0;
    let errors = 0;

    for (const tenant of activeTenants) {
      try {
        const brandConfigs = await TenantContextService.withTenantContext(
          prisma,
          tenant.id,
          async (tx) =>
            tx.merchantBrandConfig.findMany({
              where: { tenantId: tenant.id, autoSyncEnabled: true },
            })
        );

        for (const config of brandConfigs) {
          try {
            // ── Catalog Reconcile ────────────────────────────────────────────
            const lastReconciled = config.lastReconciledAt;
            const reconcileOverdue =
              !lastReconciled ||
              now.getTime() - lastReconciled.getTime() > RECONCILE_INTERVAL_HOURS * 60 * 60 * 1000;

            if (reconcileOverdue) {
              await SyncQueueService.scheduleMerchantReconcile({
                tenantId: tenant.id,
                brandId: config.brandId,
              });
              reconcileJobsQueued++;
              logger.info(
                { tenantId: tenant.id, brandId: config.brandId },
                'MerchantPeriodicSyncJob: queued merchant reconcile'
              );
            }

            // ── Store Inventory Sync ─────────────────────────────────────────
            const locations = await TenantContextService.withTenantContext(
              prisma,
              tenant.id,
              async (tx) =>
                tx.location.findMany({
                  where: { tenantId: tenant.id, brandId: config.brandId },
                  select: { id: true },
                })
            );

            for (const location of locations) {
                try {
                  // Check when the last inventory sync ran for this store
                  const lastInventoryRun = await TenantContextService.withTenantContext(
                    prisma,
                    tenant.id,
                    async (tx) =>
                      tx.syncRun.findFirst({
                        where: {
                          tenantId: tenant.id,
                          provider: 'GOOGLE_MERCHANT_CENTER',
                          resourceId: location.id,
                          status: { in: ['SUCCESS', 'RUNNING'] },
                        },
                        orderBy: { startedAt: 'desc' },
                        select: { startedAt: true },
                      })
                  );

                  const inventoryOverdue =
                    !lastInventoryRun?.startedAt ||
                    now.getTime() - lastInventoryRun.startedAt.getTime() >
                      INVENTORY_INTERVAL_HOURS * 60 * 60 * 1000;

                  if (inventoryOverdue) {
                    await SyncQueueService.scheduleMerchantInventorySync({
                      tenantId: tenant.id,
                      brandId: config.brandId,
                      storeId: location.id,
                    });
                    inventoryJobsQueued++;
                    logger.info(
                      { tenantId: tenant.id, brandId: config.brandId, storeId: location.id },
                      'MerchantPeriodicSyncJob: queued inventory sync'
                    );
                  }
                } catch (err) {
                  errors++;
                  logger.error(
                    { err, tenantId: tenant.id, storeId: location.id },
                    'MerchantPeriodicSyncJob: failed to queue inventory sync for store'
                  );
                }
              }
          } catch (err) {
            errors++;
            logger.error(
              { err, tenantId: tenant.id, brandId: config.brandId },
              'MerchantPeriodicSyncJob: failed to process brand config'
            );
          }
        }
      } catch (err) {
        errors++;
        logger.error({ err, tenantId: tenant.id }, 'MerchantPeriodicSyncJob: failed to process tenant');
      }
    }

    const result = {
      tenantsProcessed: activeTenants.length,
      reconcileJobsQueued,
      inventoryJobsQueued,
      errors,
    };
    logger.info(result, 'MerchantPeriodicSyncJob: run complete');
    return result;
  }
}
