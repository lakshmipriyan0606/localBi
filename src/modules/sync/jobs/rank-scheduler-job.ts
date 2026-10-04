import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { SyncQueueService } from '../sync-queue';
import { logger } from '@/shared/observability/logger';

/**
 * Rank Scheduler Job
 *
 * Iterates all active tenants and enqueues a RANK_SCAN BullMQ job for
 * every (store, keyword) pair that hasn't been scanned today.
 *
 * Idempotent: the underlying RankRunService enforces (tenant, store, keyword,
 * gridConfig, scheduledDate) uniqueness so duplicate jobs are safely ignored.
 *
 * Intended to be called by the cron-scheduler (e.g. daily at 04:00).
 */
export class RankSchedulerJob {
  public static async execute(): Promise<{
    tenantsProcessed: number;
    scansQueued: number;
    scansSkipped: number;
    errors: number;
  }> {
    logger.info('RankSchedulerJob: starting run');

    const todayStr = new Date().toISOString().split('T')[0]!;

    const activeTenants = await prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
        storeKeywords: { some: { trackingEnabled: true } },
      },
      select: { id: true, slug: true },
    });

    logger.info({ count: activeTenants.length }, 'RankSchedulerJob: tenants to process');

    let scansQueued = 0;
    let scansSkipped = 0;
    let errors = 0;

    for (const tenant of activeTenants) {
      try {
        // Fetch all active store-keyword pairs for this tenant
        const storeKeywords = await TenantContextService.withTenantContext(
          prisma,
          tenant.id,
          async (tx) =>
            tx.storeKeyword.findMany({
              where: {
                tenantId: tenant.id,
                trackingEnabled: true,
                keyword: { status: 'ACTIVE' },
              },
              include: {
                store: { select: { name: true } },
                keyword: { select: { term: true } },
              },
            })
        );

        for (const sk of storeKeywords) {
          try {
            // Check if a rank run already completed (or is running) for today
            const existingRun = await TenantContextService.withTenantContext(
              prisma,
              tenant.id,
              async (tx) =>
                tx.rankRun.findFirst({
                  where: {
                    tenantId: tenant.id,
                    storeId: sk.storeId,
                    keywordId: sk.keywordId,
                    scheduledDate: new Date(`${todayStr}T00:00:00.000Z`),
                    status: { in: ['SUCCESS', 'RUNNING', 'PENDING'] },
                  },
                  select: { id: true, status: true },
                })
            );

            if (existingRun) {
              scansSkipped++;
              logger.debug(
                {
                  tenantId: tenant.id,
                  storeId: sk.storeId,
                  keywordId: sk.keywordId,
                  status: existingRun.status,
                },
                'RankSchedulerJob: scan already exists for today, skipping'
              );
              continue;
            }

            await SyncQueueService.scheduleRankScan({
              tenantId: tenant.id,
              storeId: sk.storeId,
              keywordId: sk.keywordId,
              force: false,
            });

            scansQueued++;
            logger.info(
              {
                tenantId: tenant.id,
                storeId: sk.storeId,
                keywordId: sk.keywordId,
                storeName: sk.store.name,
                keyword: sk.keyword.term,
              },
              'RankSchedulerJob: queued rank scan'
            );
          } catch (err) {
            errors++;
            logger.error(
              { err, tenantId: tenant.id, storeId: sk.storeId, keywordId: sk.keywordId },
              'RankSchedulerJob: failed to queue rank scan'
            );
          }
        }
      } catch (err) {
        errors++;
        logger.error({ err, tenantId: tenant.id }, 'RankSchedulerJob: failed to process tenant');
      }
    }

    const result = {
      tenantsProcessed: activeTenants.length,
      scansQueued,
      scansSkipped,
      errors,
    };
    logger.info(result, 'RankSchedulerJob: run complete');
    return result;
  }
}
