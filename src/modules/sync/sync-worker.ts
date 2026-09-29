import { Worker, Job } from 'bullmq';
import crypto from 'node:crypto';
import { getConfig } from '@/shared/config';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { GoogleApiClient, GbpDailyMetricEntry } from '../integrations/google/google-api-client';
import { GoogleOAuthService } from '../integrations/google/google-oauth-service';
import { SYNC_QUEUE_NAME, SyncJobData, GscSyncJobData, GbpSyncJobData, GbpReviewSyncJobData } from './sync-queue';
import { GbpReviewSyncJob } from './jobs/gbp-review-sync-job';
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

    // 1. Cooperative cancellation check: has this syncRun already been marked ABORTED_ORPHAN?
    const existingRun = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.syncRun.findUnique({
        where: { uq_sync_run_business_key: { tenantId, businessKey } },
        select: { status: true },
      });
    });

    if (existingRun && existingRun.status === 'ABORTED_ORPHAN') {
      logger.info({ tenantId, businessKey }, 'Aborting job: sync run was cancelled while queued');
      return { aborted: true, reason: 'ABORTED_ORPHAN' };
    }

    // 2. Verify target connection is still ACTIVE for this tenant. Disconnected resources must stop work.
    const activeConnection = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        if (data.connectionId) {
          return tx.integrationConnection.findUnique({
            where: { id: data.connectionId },
          });
        }
        return tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
        });
      }
    );

    if (!activeConnection || activeConnection.status !== 'ACTIVE' || activeConnection.tenantId !== tenantId) {
      logger.warn(
        { tenantId, connectionId: data.connectionId, businessKey },
        'Aborting job: target Google connection is not active or has been revoked'
      );
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
      let accessToken: string;
      if (activeConnection.encryptedRefreshToken && activeConnection.encryptedRefreshToken !== 'service-account-mock-token') {
        try {
          accessToken = await GoogleOAuthService.refreshAccessToken(
            activeConnection.encryptedRefreshToken,
            tenantId,
            activeConnection.id
          );
        } catch (err) {
          logger.error({ err, tenantId }, 'Failed to refresh access token for background sync');
          throw err;
        }
      } else {
        const { getAuthenticatedGoogleClient } = await import('@/shared/lib/google-auth');
        const auth = getAuthenticatedGoogleClient();
        const token = await auth.getAccessToken();
        if (!token) throw new Error('Failed to get access token from service account');
        accessToken = token;
      }

      let rowsIngested = 0;

      if (data.type === 'GSC_SYNC') {
        rowsIngested = await this.processGscJob(data, accessToken);
      } else if (data.type === 'GBP_SYNC') {
        rowsIngested = await this.processGbpJob(data, accessToken);
      } else if (data.type === 'GBP_REVIEW_SYNC') {
        const result = await GbpReviewSyncJob.execute(accessToken, data as GbpReviewSyncJobData);
        rowsIngested = result.processed;
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

    let metrics: GbpDailyMetricEntry[] = [];
    try {
      metrics = await GoogleApiClient.queryGbpPerformanceMetrics(
        accessToken,
        locationResourceName,
        startDate,
        endDate
      );
    } catch (err: unknown) {
      logger.warn(
        { err, locationResourceName },
        "GBP Performance query failed or quota restricted; retaining existing store telemetry"
      );
      return 0;
    }

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

  /**
   * Directly synchronizes mapped GSC properties (and GBP if enabled) for a tenant
   * without requiring an asynchronous background worker process.
   */
  public static async syncTenantDirect(tenantId: string): Promise<{ gscRows: number; gbpRows: number }> {
    const { activeConnection, properties, locations } = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        const conn = await tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
        });

        const props = await tx.gscProperty.findMany({
          where: { tenantId },
        });

        const locMappings = await tx.internalResourceMapping.findMany({
          where: { tenantId, internalType: 'LOCATION' },
          include: { resource: true },
        });

        return { activeConnection: conn, properties: props, locations: locMappings };
      }
    );

    if (!activeConnection) {
      return { gscRows: 0, gbpRows: 0 };
    }

    let accessToken: string;
    if (activeConnection.encryptedRefreshToken && activeConnection.encryptedRefreshToken !== 'service-account-mock-token') {
      try {
        accessToken = await GoogleOAuthService.refreshAccessToken(
          activeConnection.encryptedRefreshToken,
          tenantId,
          activeConnection.id
        );
      } catch (err) {
        logger.error({ err, tenantId }, 'Failed to refresh access token for direct sync');
        throw err;
      }
    } else {
      const { getAuthenticatedGoogleClient } = await import('@/shared/lib/google-auth');
      const auth = getAuthenticatedGoogleClient();
      const token = await auth.getAccessToken();
      if (!token) throw new Error('Failed to get access token from service account');
      accessToken = token;
    }

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    let gscRows = 0;
    for (const prop of properties) {
      try {
        const rows = await this.processGscJob({
          type: 'GSC_SYNC',
          tenantId,
          propertyId: prop.id,
          propertyUrl: prop.propertyUrl,
          startDate,
          endDate,
          searchType: 'WEB',
          businessKey: `${tenantId}:gsc:${prop.id}:${startDate}:${endDate}:WEB`,
        }, accessToken);
        gscRows += rows;
      } catch (err) {
        logger.error({ err, propertyUrl: prop.propertyUrl }, 'Direct GSC sync error');
      }
    }

    let gbpRows = 0;
    const config = getConfig();
    if (config.ENABLE_GBP_SYNC) {
      for (const loc of locations) {
        try {
          const rows = await this.processGbpJob({
            type: 'GBP_SYNC',
            tenantId,
            locationId: loc.internalId,
            locationResourceName: loc.resource.externalResourceId,
            startDate,
            endDate,
            businessKey: `${tenantId}:gbp:${loc.internalId}:${startDate}:${endDate}`,
          }, accessToken);
          gbpRows += rows;
        } catch (err) {
          logger.warn({ err, locationId: loc.internalId }, 'Direct GBP sync failed or disabled');
        }
      }
    }

    return { gscRows, gbpRows };
  }
}
