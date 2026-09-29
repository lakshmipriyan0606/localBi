import { Queue, QueueOptions } from 'bullmq';
import crypto from 'node:crypto';
import { getConfig } from '@/shared/config';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { logger } from '@/shared/observability/logger';

export const SYNC_QUEUE_NAME = 'localbi-sync-queue';

export interface GscSyncJobData {
  type: 'GSC_SYNC';
  tenantId: string;
  propertyId: string; // GscProperty id
  propertyUrl: string;
  startDate: string;
  endDate: string;
  searchType: string;
  businessKey: string;
}

export interface GbpSyncJobData {
  type: 'GBP_SYNC';
  tenantId: string;
  locationId: string;
  locationResourceName: string; // e.g. locations/293847192837
  startDate: string;
  endDate: string;
  businessKey: string;
}

export interface GbpReviewSyncJobData {
  type: 'GBP_REVIEW_SYNC';
  tenantId: string;
  locationId: string;
  locationResourceName: string;
  accountId: string; // Needed for v4 GBP API
  businessKey: string;
}

export type SyncJobData = GscSyncJobData | GbpSyncJobData | GbpReviewSyncJobData;

let syncQueueInstance: Queue<SyncJobData> | null = null;

export function getSyncQueue(): Queue<SyncJobData> {
  if (!syncQueueInstance) {
    const config = getConfig();
    const parsedUrl = new URL(config.REDIS_QUEUE_URL);
    const queueOptions: QueueOptions = {
      connection: {
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port) || 6379,
        password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    };
    syncQueueInstance = new Queue<SyncJobData>(SYNC_QUEUE_NAME, queueOptions);
  }
  return syncQueueInstance;
}

export class SyncQueueService {
  /**
   * Generates a safe, bounded BullMQ job ID containing zero colons.
   */
  public static generateJobId(prefix: string, businessKey: string): { jobId: string; businessKey: string } {
    const hash = crypto.createHash('sha256').update(businessKey).digest('hex').slice(0, 24);
    const jobId = `${prefix}_${hash}`;
    return { jobId, businessKey };
  }

  /**
   * Schedules a GSC synchronization job for a property and date range.
   */
  public static async scheduleGscSync(params: {
    tenantId: string;
    propertyId: string;
    propertyUrl: string;
    startDate: string;
    endDate: string;
    searchType?: string;
  }) {
    const queue = getSyncQueue();
    const searchType = params.searchType || 'WEB';
    const businessKey = `${params.tenantId}:gsc:${params.propertyId}:${params.startDate}:${params.endDate}:${searchType}`;
    const { jobId } = this.generateJobId('gsc-sync', businessKey);

    // Register SyncRun record in database
    await TenantContextService.withTenantContext(prisma, params.tenantId, async (tx) => {
      await tx.syncRun.upsert({
        where: {
          uq_sync_run_business_key: {
            tenantId: params.tenantId,
            businessKey,
          },
        },
        create: {
          tenantId: params.tenantId,
          provider: 'GSC',
          resourceId: params.propertyId,
          businessKey,
          status: 'RUNNING',
          startedAt: new Date(),
        },
        update: {
          status: 'RUNNING',
          startedAt: new Date(),
          completedAt: null,
          errorCode: null,
        },
      });
    });

    const job = await queue.add(
      'gsc-sync',
      {
        type: 'GSC_SYNC',
        tenantId: params.tenantId,
        propertyId: params.propertyId,
        propertyUrl: params.propertyUrl,
        startDate: params.startDate,
        endDate: params.endDate,
        searchType,
        businessKey,
      },
      { jobId }
    );

    logger.info({ jobId, businessKey }, 'Enqueued GSC synchronization job');
    return { jobId, businessKey, id: job.id };
  }

  /**
   * Schedules a GBP synchronization job for a location and date range.
   */
  public static async scheduleGbpSync(params: {
    tenantId: string;
    locationId: string;
    locationResourceName: string;
    startDate: string;
    endDate: string;
  }) {
    const queue = getSyncQueue();
    const businessKey = `${params.tenantId}:gbp:${params.locationId}:${params.startDate}:${params.endDate}`;
    const { jobId } = this.generateJobId('gbp-sync', businessKey);

    await TenantContextService.withTenantContext(prisma, params.tenantId, async (tx) => {
      await tx.syncRun.upsert({
        where: {
          uq_sync_run_business_key: {
            tenantId: params.tenantId,
            businessKey,
          },
        },
        create: {
          tenantId: params.tenantId,
          provider: 'GBP',
          resourceId: params.locationId,
          businessKey,
          status: 'RUNNING',
          startedAt: new Date(),
        },
        update: {
          status: 'RUNNING',
          startedAt: new Date(),
          completedAt: null,
          errorCode: null,
        },
      });
    });

    const job = await queue.add(
      'gbp-sync',
      {
        type: 'GBP_SYNC',
        tenantId: params.tenantId,
        locationId: params.locationId,
        locationResourceName: params.locationResourceName,
        startDate: params.startDate,
        endDate: params.endDate,
        businessKey,
      },
      { jobId }
    );

    logger.info({ jobId, businessKey }, 'Enqueued GBP synchronization job');
    return { jobId, businessKey, id: job.id };
  }

  /**
   * Schedules a GBP Review synchronization job for a location.
   */
  public static async scheduleGbpReviewSync(params: {
    tenantId: string;
    locationId: string;
    locationResourceName: string;
    accountId: string;
  }) {
    const queue = getSyncQueue();
    const businessKey = `${params.tenantId}:gbp_reviews:${params.locationId}`;
    const { jobId } = this.generateJobId('gbp-review-sync', businessKey);

    await TenantContextService.withTenantContext(prisma, params.tenantId, async (tx) => {
      await tx.syncRun.upsert({
        where: {
          uq_sync_run_business_key: {
            tenantId: params.tenantId,
            businessKey,
          },
        },
        create: {
          tenantId: params.tenantId,
          provider: 'GBP_REVIEWS',
          resourceId: params.locationId,
          businessKey,
          status: 'RUNNING',
          startedAt: new Date(),
        },
        update: {
          status: 'RUNNING',
          startedAt: new Date(),
          completedAt: null,
          errorCode: null,
        },
      });
    });

    const job = await queue.add(
      'gbp-review-sync',
      {
        type: 'GBP_REVIEW_SYNC',
        tenantId: params.tenantId,
        locationId: params.locationId,
        locationResourceName: params.locationResourceName,
        accountId: params.accountId,
        businessKey,
      },
      { jobId }
    );

    logger.info({ jobId, businessKey }, 'Enqueued GBP Review synchronization job');
    return { jobId, businessKey, id: job.id };
  }

  /**
   * Enqueues initial or manual synchronization for all mapped resources of a tenant.
   */
  public static async scheduleTenantFullSync(tenantId: string) {
    const { properties, locations, accounts } = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        const props = await tx.gscProperty.findMany({
          where: { tenantId },
        });

        const locMappings = await tx.internalResourceMapping.findMany({
          where: { tenantId, internalType: 'LOCATION' },
          include: { resource: true },
        });

        const extAccounts = await tx.externalAccount.findMany({
          where: { tenantId },
        });

        return { properties: props, locations: locMappings, accounts: extAccounts };
      }
    );

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    const jobs: Array<{ jobId: string; businessKey: string }> = [];

    // Schedule GSC for each mapped property
    for (const prop of properties) {
      const scheduled = await this.scheduleGscSync({
        tenantId,
        propertyId: prop.id,
        propertyUrl: prop.propertyUrl,
        startDate,
        endDate,
      });
      jobs.push(scheduled);
    }

    // Schedule GBP for each mapped location
    const enableGbpSync = process.env['ENABLE_GBP_SYNC'] !== 'false';
    for (const mapping of locations) {
      if (enableGbpSync) {
        const scheduled = await this.scheduleGbpSync({
          tenantId,
          locationId: mapping.internalId,
          locationResourceName: mapping.resource.externalResourceId,
          startDate,
          endDate,
        });
        jobs.push(scheduled);
      }

      // Find associated account for Reviews Sync
      const account = accounts.find((a) => a.id === mapping.resource.accountId);
      if (account) {
        const scheduledReviews = await this.scheduleGbpReviewSync({
          tenantId,
          locationId: mapping.internalId,
          locationResourceName: mapping.resource.externalResourceId,
          accountId: account.externalAccountId.replace('accounts/', ''),
        });
        jobs.push(scheduledReviews);
      }
    }

    return {
      scheduledJobsCount: jobs.length,
      jobs,
    };
  }

  public static async closeQueue() {
    if (syncQueueInstance) {
      await syncQueueInstance.close();
      syncQueueInstance = null;
    }
  }
}
