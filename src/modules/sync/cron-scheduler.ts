import { Queue, QueueOptions } from 'bullmq';
import { getConfig } from '@/shared/config';
import { logger } from '@/shared/observability/logger';
import { GscPeriodicSyncJob } from './jobs/gsc-periodic-sync-job';
import { Ga4PeriodicSyncJob } from './jobs/ga4-periodic-sync-job';
import { RankSchedulerJob } from './jobs/rank-scheduler-job';
import { MerchantPeriodicSyncJob } from './jobs/merchant-periodic-sync-job';
import { ListingPeriodicSyncJob } from './jobs/listing-periodic-sync-job';

// ---------------------------------------------------------------------------
// Cron-based recurring job names (stored in a dedicated BullMQ queue)
// ---------------------------------------------------------------------------
export const CRON_QUEUE_NAME = 'localbi-cron-queue';

export interface CronJobDefinition {
  name: string;
  /** Standard cron expression (UTC) */
  cron: string;
  handler: () => Promise<unknown>;
}

const CRON_JOBS: CronJobDefinition[] = [
  {
    name: 'gsc-periodic-sync',
    cron: '0 2 * * *',      // daily at 02:00 UTC
    handler: () => GscPeriodicSyncJob.execute(),
  },
  {
    name: 'ga4-periodic-sync',
    cron: '0 3 * * *',      // daily at 03:00 UTC
    handler: () => Ga4PeriodicSyncJob.execute(),
  },
  {
    name: 'rank-scheduler',
    cron: '0 4 * * *',      // daily at 04:00 UTC
    handler: () => RankSchedulerJob.execute(),
  },
  {
    name: 'merchant-periodic-sync',
    cron: '0 */6 * * *',    // every 6 hours
    handler: () => MerchantPeriodicSyncJob.execute(),
  },
  {
    name: 'listing-periodic-sync',
    cron: '0 */12 * * *',   // every 12 hours
    handler: () => ListingPeriodicSyncJob.execute(),
  },
];

// ---------------------------------------------------------------------------
// CronSchedulerService — starts / stops all recurring sync jobs
// ---------------------------------------------------------------------------

let cronQueueInstance: Queue | null = null;

function getRedisConnection() {
  const config = getConfig();
  const parsedUrl = new URL(config.REDIS_QUEUE_URL);
  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port) || 6379,
    password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
    maxRetriesPerRequest: null,
  };
}

export class CronSchedulerService {
  /**
   * Registers all periodic sync jobs into BullMQ with their cron expressions.
   * Call once at server startup (e.g. in a Next.js instrumentation.ts hook).
   */
  public static async start(): Promise<void> {
    if (cronQueueInstance) {
      logger.warn('CronSchedulerService: already started, skipping');
      return;
    }

    logger.info('CronSchedulerService: starting');

    const connection = getRedisConnection();
    const queueOptions: QueueOptions = {
      connection,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    };

    cronQueueInstance = new Queue(CRON_QUEUE_NAME, queueOptions);

    // Register each job as a repeatable BullMQ job
    for (const job of CRON_JOBS) {
      await cronQueueInstance.add(job.name, { jobName: job.name }, {
        repeat: { pattern: job.cron },
        jobId: `cron:${job.name}`,
      } as any);

      logger.info({ name: job.name, cron: job.cron }, 'CronSchedulerService: registered job');
    }

    // Process cron queue jobs by dispatching to the correct handler
    const { Worker } = await import('bullmq');
    new Worker(
      CRON_QUEUE_NAME,
      async (job) => {
        const definition = CRON_JOBS.find((j) => j.name === job.data.jobName);
        if (!definition) {
          logger.warn({ jobName: job.data.jobName }, 'CronSchedulerService: unknown cron job name');
          return;
        }

        logger.info({ jobName: job.data.jobName }, 'CronSchedulerService: executing cron job');
        try {
          const result = await definition.handler();
          logger.info(
            { jobName: job.data.jobName, result },
            'CronSchedulerService: cron job completed'
          );
          return result;
        } catch (err) {
          logger.error({ jobName: job.data.jobName, err }, 'CronSchedulerService: cron job failed');
          throw err;
        }
      },
      { connection, concurrency: 1 }
    );

    logger.info(
      { jobCount: CRON_JOBS.length },
      'CronSchedulerService: all cron jobs registered and worker started'
    );
  }

  /**
   * Gracefully shuts down the cron queue and scheduler.
   * Call on process SIGTERM / SIGINT.
   */
  public static async stop(): Promise<void> {
    if (cronQueueInstance) {
      await cronQueueInstance.close();
      cronQueueInstance = null;
    }
    logger.info('CronSchedulerService: stopped gracefully');
  }

  /**
   * Manually triggers a named cron job immediately (useful for admin/test purposes).
   */
  public static async triggerNow(jobName: string): Promise<unknown> {
    const definition = CRON_JOBS.find((j) => j.name === jobName);
    if (!definition) {
      throw new Error(`Unknown cron job: ${jobName}`);
    }
    logger.info({ jobName }, 'CronSchedulerService: manual trigger');
    return definition.handler();
  }

  /**
   * Returns metadata about all registered cron jobs.
   */
  public static getJobDefinitions(): Array<{ name: string; cron: string }> {
    return CRON_JOBS.map((j) => ({ name: j.name, cron: j.cron }));
  }
}
