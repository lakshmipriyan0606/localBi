import { Queue, QueueOptions } from 'bullmq';
import crypto from 'node:crypto';
import { getConfig } from '@/shared/config';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { logger } from '@/shared/observability/logger';
import { GoogleConnectionResolver } from '@/modules/integrations/google/google-connection-resolver';

export const SYNC_QUEUE_NAME = 'localbi-sync-queue';

export interface GscSyncJobData {
  type: 'GSC_SYNC';
  tenantId: string;
  connectionId?: string | undefined;
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
  connectionId?: string | undefined;
  locationId: string;
  locationResourceName: string; // e.g. locations/293847192837
  startDate: string;
  endDate: string;
  businessKey: string;
}

export interface GbpReviewSyncJobData {
  type: 'GBP_REVIEW_SYNC';
  tenantId: string;
  connectionId?: string | undefined;
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
    connectionId?: string | undefined;
    propertyId: string;
    propertyUrl: string;
    startDate: string;
    endDate: string;
    searchType?: string | undefined;
  }) {
    const queue = getSyncQueue();
    const searchType = params.searchType || 'WEB';
    const businessKey = `${params.tenantId}:gsc:${params.propertyId}:${params.startDate}:${params.endDate}:${searchType}`;
    const { jobId } = this.generateJobId('gsc-sync', businessKey);

    let resolvedConnectionId = params.connectionId;
    if (!resolvedConnectionId) {
      const activeConn = await TenantContextService.withTenantContext(prisma, params.tenantId, async (tx) => {
        return tx.integrationConnection.findFirst({
          where: { tenantId: params.tenantId, status: 'ACTIVE' },
          select: { id: true },
        });
      });
      resolvedConnectionId = activeConn?.id;
    }

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
        connectionId: resolvedConnectionId,
        propertyId: params.propertyId,
        propertyUrl: params.propertyUrl,
        startDate: params.startDate,
        endDate: params.endDate,
        searchType,
        businessKey,
      },
      { jobId }
    );

    logger.info({ jobId, businessKey, connectionId: resolvedConnectionId }, 'Enqueued GSC synchronization job');
    return { jobId, businessKey, id: job.id };
  }

  /**
   * Schedules a GBP synchronization job for a location and date range.
   */
  public static async scheduleGbpSync(params: {
    tenantId: string;
    connectionId?: string | undefined;
    locationId: string;
    locationResourceName: string;
    startDate: string;
    endDate: string;
  }) {
    const queue = getSyncQueue();
    const businessKey = `${params.tenantId}:gbp:${params.locationId}:${params.startDate}:${params.endDate}`;
    const { jobId } = this.generateJobId('gbp-sync', businessKey);

    let resolvedConnectionId = params.connectionId;
    if (!resolvedConnectionId) {
      try {
        const resolved = await TenantContextService.withTenantContext(prisma, params.tenantId, async (tx) => {
          return GoogleConnectionResolver.resolveForLocation(tx, params.tenantId, params.locationId);
        });
        resolvedConnectionId = resolved.connectionId;
      } catch (err) {
        logger.warn({ err, locationId: params.locationId }, 'Could not resolve specific Google connection for GBP sync');
      }
    }

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
        connectionId: resolvedConnectionId,
        locationId: params.locationId,
        locationResourceName: params.locationResourceName,
        startDate: params.startDate,
        endDate: params.endDate,
        businessKey,
      },
      { jobId }
    );

    logger.info({ jobId, businessKey, connectionId: resolvedConnectionId }, 'Enqueued GBP synchronization job');
    return { jobId, businessKey, id: job.id };
  }

  /**
   * Schedules a GBP Review synchronization job for a location.
   */
  public static async scheduleGbpReviewSync(params: {
    tenantId: string;
    connectionId?: string | undefined;
    locationId: string;
    locationResourceName: string;
    accountId: string;
  }) {
    const queue = getSyncQueue();
    const businessKey = `${params.tenantId}:gbp_reviews:${params.locationId}`;
    const { jobId } = this.generateJobId('gbp-review-sync', businessKey);

    let resolvedConnectionId = params.connectionId;
    if (!resolvedConnectionId) {
      try {
        const resolved = await TenantContextService.withTenantContext(prisma, params.tenantId, async (tx) => {
          return GoogleConnectionResolver.resolveForLocation(tx, params.tenantId, params.locationId);
        });
        resolvedConnectionId = resolved.connectionId;
      } catch (err) {
        logger.warn({ err, locationId: params.locationId }, 'Could not resolve specific Google connection for GBP review sync');
      }
    }

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
        connectionId: resolvedConnectionId,
        locationId: params.locationId,
        locationResourceName: params.locationResourceName,
        accountId: params.accountId,
        businessKey,
      },
      { jobId }
    );

    logger.info({ jobId, businessKey, connectionId: resolvedConnectionId }, 'Enqueued GBP Review synchronization job');
    return { jobId, businessKey, id: job.id };
  }

  /**
   * Enqueues initial or manual synchronization for all mapped resources of a tenant.
   */
  public static async scheduleTenantFullSync(tenantId: string) {
    const { properties, locations, accounts, activeConnection } = await TenantContextService.withTenantContext(
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

        const conn = await tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
          select: { id: true },
        });

        return { properties: props, locations: locMappings, accounts: extAccounts, activeConnection: conn };
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
        connectionId: activeConnection?.id,
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
