import { Worker, Job } from 'bullmq';
import crypto from 'node:crypto';
import { getConfig } from '@/shared/config';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { GoogleApiClient } from '../integrations/google/google-api-client';
import { GoogleOAuthService } from '../integrations/google/google-oauth-service';
import { SYNC_QUEUE_NAME, SyncJobData, GscSyncJobData, GbpSyncJobData } from './sync-queue';
import { logger } from '@/shared/observability/logger';

export class SyncWorkerService {
  private static workerInstance: Worker<SyncJobData> | null = null;

  public static getWorker(): Worker<SyncJobData> {
    if (!this.workerInstance) {
      const config = getConfig();
      const parsedUrl = new URL(config.REDIS_QUEUE_URL);
      const connectionOptions = {
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port) || 6379,
        password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
        maxRetriesPerRequest: null,
      };

      this.workerInstance = new Worker<SyncJobData>(
        SYNC_QUEUE_NAME,
        async (job: Job<SyncJobData>) => {
          return this.processJob(job);
        },
        {
          connection: connectionOptions,
          concurrency: 5,
        }
      );

      this.workerInstance.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err }, 'Sync background job failed');
      });

      this.workerInstance.on('completed', (job) => {
        logger.info({ jobId: job.id }, 'Sync background job completed successfully');
      });
    }

    return this.workerInstance;
  }

  /**
   * Gracefully closes the BullMQ worker, waiting for in-progress jobs to complete.
   * Must be called on process SIGTERM / SIGINT to prevent job data loss.
   */
  public static async closeWorker(): Promise<void> {
    if (this.workerInstance) {
      await this.workerInstance.close();
      this.workerInstance = null;
      logger.info('BullMQ sync worker closed gracefully');
    }
  }

  /**
   * Processes a single synchronization job with strict tenant isolation.
   */
  public static async processJob(job: Job<SyncJobData>) {
    const data = job.data;
    const { tenantId, businessKey } = data;

    // 1. Verify connection is still ACTIVE for this tenant. Disconnected resources must stop work.
    const activeConnection = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        return tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
        });
      }
    );

    if (!activeConnection) {
      logger.warn({ tenantId, businessKey }, 'Aborting job: active Google connection no longer exists');
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        await tx.syncRun.update({
          where: { uq_sync_run_business_key: { tenantId, businessKey } },
          data: {
            status: 'ABORTED_ORPHAN',
            completedAt: new Date(),
            errorCode: 'CONNECTION_REVOKED_OR_MISSING',
          },
        });
      });
      return { aborted: true, reason: 'CONNECTION_REVOKED_OR_MISSING' };
    }

    try {
      // 2. Refresh or resolve valid access token
      const accessToken = await GoogleOAuthService.refreshAccessToken(
        activeConnection.encryptedRefreshToken,
        tenantId,
        activeConnection.id
      );

      let rowsIngested = 0;

      if (data.type === 'GSC_SYNC') {
        rowsIngested = await this.processGscJob(data, accessToken);
      } else if (data.type === 'GBP_SYNC') {
        rowsIngested = await this.processGbpJob(data, accessToken);
      }

      // 3. Mark SyncRun SUCCESS
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        await tx.syncRun.update({
          where: { uq_sync_run_business_key: { tenantId, businessKey } },
          data: {
            status: 'SUCCESS',
            completedAt: new Date(),
            rowsIngested,
            errorCode: null,
          },
        });
      });

      return { status: 'SUCCESS', rowsIngested };
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || 'Unknown ingestion error';
      logger.error({ tenantId, businessKey, err }, 'Sync ingestion job encountered error');

      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        await tx.syncRun.update({
          where: { uq_sync_run_business_key: { tenantId, businessKey } },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorCode: 'INGESTION_FAILED',
            errorDetails: { message: errorMsg },
          },
        });
      });

      throw err; // Allow BullMQ retry / backoff
    }
  }

  private static async processGscJob(data: GscSyncJobData, accessToken: string): Promise<number> {
    const { tenantId, propertyId, propertyUrl, startDate, endDate, searchType } = data;
    let totalRows = 0;

    // Fetch all 5 GSC dimension grains in parallel — they are independent and share the same access token
    const [dateRows, queryRows, pageRows, deviceRows, countryRows] = await Promise.all([
      // Daily property totals (for timeseries trend charts)
      GoogleApiClient.queryGscSearchAnalytics(accessToken, propertyUrl, startDate, endDate, ['date'], searchType),
      // Top search queries
      GoogleApiClient.queryGscSearchAnalytics(accessToken, propertyUrl, startDate, endDate, ['query'], searchType),
      // Top pages
      GoogleApiClient.queryGscSearchAnalytics(accessToken, propertyUrl, startDate, endDate, ['page'], searchType),
      // Device breakdown
      GoogleApiClient.queryGscSearchAnalytics(accessToken, propertyUrl, startDate, endDate, ['device'], searchType),
      // Country breakdown
      GoogleApiClient.queryGscSearchAnalytics(accessToken, propertyUrl, startDate, endDate, ['country'], searchType),
    ]);


    // Ingest all grains inside a single PostgreSQL transaction
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Daily Property Totals
      for (const row of dateRows) {
        const dateStr = row.keys?.[0] || startDate;
        const rowDate = new Date(dateStr);
        const clicks = row.clicks;
        const impressions = row.impressions;
        const sumPositionImpressions = (row.position || 0) * impressions;

        await tx.gscDailyPropertyTotal.upsert({
          where: {
            uq_gsc_property_total: {
              tenantId,
              propertyId,
              date: rowDate,
              searchType,
            },
          },
          create: {
            tenantId,
            propertyId,
            date: rowDate,
            searchType,
            dataState: 'FINAL',
            clicks,
            impressions,
            sumPositionImpressions,
            freshnessTimestamp: new Date(),
          },
          update: {
            clicks,
            impressions,
            sumPositionImpressions,
            freshnessTimestamp: new Date(),
          },
        });
        totalRows++;
      }

      // 2. Query Metrics
      for (const row of queryRows) {
        const queryText = (row.keys?.[0] || '').trim();
        if (!queryText) continue;

        const queryHash = crypto.createHash('sha256').update(queryText).digest('hex');

        const gscQuery = await tx.gscQuery.upsert({
          where: {
            uq_gsc_query_hash: {
              tenantId,
              propertyId,
              queryHash,
            },
          },
          create: {
            tenantId,
            propertyId,
            queryHash,
            queryText,
          },
          update: {},
        });

        const latestDate = new Date(endDate);
        await tx.gscDailyQueryMetric.upsert({
          where: {
            uq_gsc_query_metric: {
              tenantId,
              propertyId,
              date: latestDate,
              searchType,
              queryId: gscQuery.id,
            },
          },
          create: {
            tenantId,
            propertyId,
            date: latestDate,
            searchType,
            queryId: gscQuery.id,
            clicks: row.clicks,
            impressions: row.impressions,
            sumPositionImpressions: row.position * row.impressions,
          },
          update: {
            clicks: row.clicks,
            impressions: row.impressions,
            sumPositionImpressions: row.position * row.impressions,
          },
        });
        totalRows++;
      }

      // 3. Page Metrics
      for (const row of pageRows) {
        const fullUrl = (row.keys?.[0] || '').trim();
        if (!fullUrl) continue;

        const pageHash = crypto.createHash('sha256').update(fullUrl).digest('hex');

        const gscPage = await tx.gscPage.upsert({
          where: {
            uq_gsc_page_hash: {
              tenantId,
              propertyId,
              pageHash,
            },
          },
          create: {
            tenantId,
            propertyId,
            pageHash,
            fullUrl,
          },
          update: {},
        });

        const latestDate = new Date(endDate);
        await tx.gscDailyPageMetric.upsert({
          where: {
            uq_gsc_page_metric: {
              tenantId,
              propertyId,
              date: latestDate,
              searchType,
              pageId: gscPage.id,
            },
          },
          create: {
            tenantId,
            propertyId,
            date: latestDate,
            searchType,
            pageId: gscPage.id,
            clicks: row.clicks,
            impressions: row.impressions,
            sumPositionImpressions: row.position * row.impressions,
          },
          update: {
            clicks: row.clicks,
            impressions: row.impressions,
            sumPositionImpressions: row.position * row.impressions,
          },
        });
        totalRows++;
      }

      // 4. Device Metrics
      for (const row of deviceRows) {
        const device = (row.keys?.[0] || 'DESKTOP').toUpperCase();
        const latestDate = new Date(endDate);

        await tx.gscDailyDeviceMetric.upsert({
          where: {
            uq_gsc_device_metric: {
              tenantId,
              propertyId,
              date: latestDate,
              searchType,
              device,
            },
          },
          create: {
            tenantId,
            propertyId,
            date: latestDate,
            searchType,
            device,
            clicks: row.clicks,
            impressions: row.impressions,
            sumPositionImpressions: row.position * row.impressions,
          },
          update: {
            clicks: row.clicks,
            impressions: row.impressions,
            sumPositionImpressions: row.position * row.impressions,
          },
        });
        totalRows++;
      }

      // 5. Country Metrics
      for (const row of countryRows) {
        const country = (row.keys?.[0] || 'ZZZ').toUpperCase();
        if (country.length > 3) continue; // Safety check
        const latestDate = new Date(endDate);

        await tx.gscDailyCountryMetric.upsert({
          where: {
            uq_gsc_country_metric: {
              tenantId,
              propertyId,
              date: latestDate,
              searchType,
              country,
            },
          },
          create: {
            tenantId,
            propertyId,
            date: latestDate,
            searchType,
            country,
            clicks: row.clicks,
            impressions: row.impressions,
            sumPositionImpressions: row.position * row.impressions,
          },
          update: {
            clicks: row.clicks,
            impressions: row.impressions,
            sumPositionImpressions: row.position * row.impressions,
          },
        });
        totalRows++;
      }

      // 6. Update SyncCursor
      await tx.syncCursor.upsert({
        where: {
          uq_sync_cursor: {
            tenantId,
            provider: 'GSC',
            resourceId: propertyId,
            cursorKey: 'last_synced_date',
          },
        },
        create: {
          tenantId,
          provider: 'GSC',
          resourceId: propertyId,
          cursorKey: 'last_synced_date',
          cursorValue: endDate,
        },
        update: {
          cursorValue: endDate,
        },
      });
    });

    return totalRows;
  }

  private static async processGbpJob(data: GbpSyncJobData, accessToken: string): Promise<number> {
    const { tenantId, locationId, locationResourceName, startDate, endDate } = data;

    const metrics = await GoogleApiClient.queryGbpPerformanceMetrics(
      accessToken,
      locationResourceName,
      startDate,
      endDate
    );

    let rowsIngested = 0;

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      for (const entry of metrics) {
        const rowDate = new Date(entry.date);

        await tx.gbpDailyMetric.upsert({
          where: {
            uq_gbp_metric: {
              tenantId,
              locationId,
              date: rowDate,
              metricType: entry.metricType,
            },
          },
          create: {
            tenantId,
            locationId,
            date: rowDate,
            metricType: entry.metricType,
            value: BigInt(entry.value),
          },
          update: {
            value: BigInt(entry.value),
          },
        });
        rowsIngested++;
      }

      await tx.syncCursor.upsert({
        where: {
          uq_sync_cursor: {
            tenantId,
            provider: 'GBP',
            resourceId: locationId,
            cursorKey: 'last_synced_date',
          },
        },
        create: {
          tenantId,
          provider: 'GBP',
          resourceId: locationId,
          cursorKey: 'last_synced_date',
          cursorValue: endDate,
        },
        update: {
          cursorValue: endDate,
        },
      });
    });

    return rowsIngested;
  }
}
