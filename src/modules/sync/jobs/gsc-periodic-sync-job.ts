import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { SyncQueueService } from '../sync-queue';
import { logger } from '@/shared/observability/logger';

const SYNC_LOOKBACK_DAYS = 3; // overlap window to catch late-arriving data
const MAX_HISTORICAL_DAYS = 90; // first-ever sync window cap

/**
 * GSC Periodic Sync Job
 *
 * Enqueues incremental GSC_SYNC BullMQ jobs for every tenant that has:
 *   1. An ACTIVE Google integration connection
 *   2. At least one mapped GscProperty
 *
 * Date range strategy:
 *   - If a SyncCursor exists for a property → sync from (cursor − lookback) to today
 *   - If no cursor (first sync) → sync last MAX_HISTORICAL_DAYS days
 *
 * Intended to be called by the cron-scheduler (e.g. daily at 02:00).
 */
export class GscPeriodicSyncJob {
  public static async execute(): Promise<{
    tenantsProcessed: number;
    propertiesQueued: number;
    errors: number;
  }> {
    logger.info('GscPeriodicSyncJob: starting run');

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const activeTenants = await prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
        connections: { some: { status: 'ACTIVE', provider: 'GOOGLE' } },
        gscProperties: { some: {} },
      },
      select: { id: true, slug: true },
    });

    logger.info({ count: activeTenants.length }, 'GscPeriodicSyncJob: tenants to process');

    let propertiesQueued = 0;
    let errors = 0;

    for (const tenant of activeTenants) {
      try {
        const properties = await TenantContextService.withTenantContext(
          prisma,
          tenant.id,
          async (tx) => tx.gscProperty.findMany({ where: { tenantId: tenant.id } })
        );

        for (const property of properties) {
          try {
            const cursor = await TenantContextService.withTenantContext(
              prisma,
              tenant.id,
              async (tx) =>
                tx.syncCursor.findFirst({
                  where: {
                    tenantId: tenant.id,
                    provider: 'GSC',
                    resourceId: property.id,
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

            await SyncQueueService.scheduleGscSync({
              tenantId: tenant.id,
              propertyId: property.id,
              propertyUrl: property.propertyUrl,
              startDate,
              endDate: todayStr,
              searchType: 'WEB',
            });

            propertiesQueued++;
            logger.info(
              { tenantId: tenant.id, propertyId: property.id, startDate, endDate: todayStr },
              'GscPeriodicSyncJob: queued GSC sync'
            );
          } catch (err) {
            errors++;
            logger.error(
              { err, tenantId: tenant.id, propertyId: property.id },
              'GscPeriodicSyncJob: failed to queue property'
            );
          }
        }
      } catch (err) {
        errors++;
        logger.error({ err, tenantId: tenant.id }, 'GscPeriodicSyncJob: failed to process tenant');
      }
    }

    const result = { tenantsProcessed: activeTenants.length, propertiesQueued, errors };
    logger.info(result, 'GscPeriodicSyncJob: run complete');
    return result;
  }
}
