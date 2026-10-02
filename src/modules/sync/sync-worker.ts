import { Worker, Job } from 'bullmq';
import crypto from 'node:crypto';
import { getConfig } from '@/shared/config';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { GoogleApiClient, GbpDailyMetricEntry } from '../integrations/google/google-api-client';
import { GoogleOAuthService } from '../integrations/google/google-oauth-service';
import { GoogleConnectionResolver } from '../integrations/google/google-connection-resolver';
import { SYNC_QUEUE_NAME, SyncJobData, GscSyncJobData, GbpSyncJobData, GbpReviewSyncJobData, GbpProfileSyncJobData } from './sync-queue';
import { GbpReviewSyncJob } from './jobs/gbp-review-sync-job';
import { GbpWriteClient } from '../integrations/google/gbp-write-client';
import { GbpLocationService } from '../reports/gbp-location-service';
import { logger } from '@/shared/observability/logger';
import { AuthorizedContext, Role, ScopeMode } from '@/shared/authorization/policy';
import { RankRunService } from '../rank/rank-run-service';

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

    // 1b. Rank scans do not rely on Google OAuth connections
    if (data.type === 'RANK_SCAN') {
      const systemContext: AuthorizedContext = {
        userId: 'system-sync-worker',
        tenantId,
        role: Role.PLATFORM_SUPER_ADMIN,
        scopeMode: ScopeMode.ALL,
        grantedBrandIds: new Set(),
        grantedLocationIds: new Set(),
      };

      try {
        const rankRun = await RankRunService.triggerRankRun(
          tenantId,
          data.storeId,
          data.keywordId,
          { force: data.force ?? false },
          systemContext
        );

        await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
          await tx.syncRun.updateMany({
            where: { tenantId, businessKey },
            data: {
              status: rankRun.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
              completedAt: new Date(),
              rowsIngested: rankRun.summary?.validCheckedPoints ?? 0,
              errorCode: rankRun.errorCode,
            },
          });
        });

        return { status: rankRun.status, rankRunId: rankRun.id };
      } catch (err: any) {
        logger.error({ err, tenantId, businessKey }, 'Rank scan background job failed');
        await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
          await tx.syncRun.updateMany({
            where: { tenantId, businessKey },
            data: {
              status: 'FAILED',
              completedAt: new Date(),
              errorCode: 'RANK_SCAN_FAILED',
            },
          });
        });
        throw err;
      }
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
        if ((data as any).locationId) {
          try {
            const resolved = await GoogleConnectionResolver.resolveForLocation(
              tx,
              tenantId,
              (data as any).locationId
            );
            return tx.integrationConnection.findUnique({
              where: { id: resolved.connectionId },
            });
          } catch {
            return null;
          }
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
      if (activeConnection.encryptedRefreshToken) {
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
        if (!token) throw new Error('Failed to get access token from Google credentials');
        accessToken = String(token);
      }

      let rowsIngested = 0;

      if (data.type === 'GSC_SYNC') {
        rowsIngested = await this.processGscJob(data, accessToken);
      } else if (data.type === 'GBP_SYNC') {
        rowsIngested = await this.processGbpJob(data, accessToken);
      } else if (data.type === 'GBP_REVIEW_SYNC') {
        const result = await GbpReviewSyncJob.execute(accessToken, data as GbpReviewSyncJobData);
        rowsIngested = result.processed;
      } else if (data.type === 'GBP_PROFILE_SYNC') {
        rowsIngested = await this.processGbpProfileJob(data as GbpProfileSyncJobData, accessToken);
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
        const sumPositionImpressions = Number(((row.position || 0) * (row.impressions || 0)).toFixed(2)) || 0;

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
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            sumPositionImpressions,
          },
          update: {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            sumPositionImpressions,
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
        const sumPositionImpressions = Number(((row.position || 0) * (row.impressions || 0)).toFixed(2)) || 0;

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
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            sumPositionImpressions,
          },
          update: {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            sumPositionImpressions,
          },
        });
        totalRows++;
      }

      // 4. Device Metrics
      for (const row of deviceRows) {
        const device = (row.keys?.[0] || 'DESKTOP').toUpperCase();
        const latestDate = new Date(endDate);
        const sumPositionImpressions = Number(((row.position || 0) * (row.impressions || 0)).toFixed(2)) || 0;

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
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            sumPositionImpressions,
          },
          update: {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            sumPositionImpressions,
          },
        });
        totalRows++;
      }

      // 5. Country Metrics
      for (const row of countryRows) {
        const country = (row.keys?.[0] || 'ZZZ').toUpperCase();
        if (country.length > 3) continue; // Safety check
        const latestDate = new Date(endDate);
        const sumPositionImpressions = Number(((row.position || 0) * (row.impressions || 0)).toFixed(2)) || 0;

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
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            sumPositionImpressions,
          },
          update: {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            sumPositionImpressions,
          },
        });
        totalRows++;
      }

      // 6. Update SyncCursor safely (avoids Postgres 42P10 constraint mismatch)
      const existingCursor = await tx.syncCursor.findFirst({
        where: {
          tenantId,
          provider: 'GSC',
          resourceId: propertyId,
          cursorKey: 'last_synced_date',
        },
      });

      if (existingCursor) {
        await tx.syncCursor.update({
          where: { id: existingCursor.id },
          data: { cursorValue: endDate },
        });
      } else {
        await tx.syncCursor.create({
          data: {
            tenantId,
            provider: 'GSC',
            resourceId: propertyId,
            cursorKey: 'last_synced_date',
            cursorValue: endDate,
          },
        });
      }
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

      // Safe cursor update for GBP (avoids Postgres 42P10 constraint mismatch)
      const existingCursor = await tx.syncCursor.findFirst({
        where: {
          tenantId,
          provider: 'GBP',
          resourceId: locationId,
          cursorKey: 'last_synced_date',
        },
      });

      if (existingCursor) {
        await tx.syncCursor.update({
          where: { id: existingCursor.id },
          data: { cursorValue: endDate },
        });
      } else {
        await tx.syncCursor.create({
          data: {
            tenantId,
            provider: 'GBP',
            resourceId: locationId,
            cursorKey: 'last_synced_date',
            cursorValue: endDate,
          },
        });
      }
    });

    return rowsIngested;
  }

  /**
   * Directly synchronizes mapped GSC properties (and GBP if enabled) for a tenant
   * without requiring an asynchronous background worker process.
   */
  public static async syncTenantDirect(
    tenantId: string,
    provider: 'GSC' | 'GBP' | 'ALL' = 'ALL'
  ): Promise<{ gscRows: number; gbpRows: number }> {
    const shouldSyncGsc = provider === 'GSC' || provider === 'ALL';
    const shouldSyncGbp = provider === 'GBP' || provider === 'ALL';

    const { activeConnection, properties, locations } = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        const conn = await tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
        });

        let props: any[] = [];
        if (shouldSyncGsc) {
          props = await tx.gscProperty.findMany({
            where: { tenantId },
          });

          // Ensure any mapped GSC resources from internal mappings have corresponding GscProperty rows
          const brandMappings = await tx.internalResourceMapping.findMany({
            where: {
              tenantId,
              internalType: 'BRAND',
              resource: { provider: 'GOOGLE_SEARCH_CONSOLE' },
            },
            include: { resource: true },
          });

          for (const bm of brandMappings) {
            const propertyUrl = bm.resource.externalResourceId;
            const propertyType = propertyUrl.startsWith('sc-domain:') ? 'DOMAIN' : 'URL_PREFIX';
            const upserted = await tx.gscProperty.upsert({
              where: {
                uq_gsc_property_url: {
                  tenantId,
                  propertyUrl,
                },
              },
              create: {
                tenantId,
                resourceId: bm.resourceId,
                propertyUrl,
                propertyType,
              },
              update: {
                resourceId: bm.resourceId,
                propertyType,
              },
            });
            if (!props.some((p) => p.id === upserted.id)) {
              props.push(upserted);
            }
          }
        }

        let locMappings: any[] = [];
        if (shouldSyncGbp) {
          locMappings = await tx.internalResourceMapping.findMany({
            where: { tenantId, internalType: 'LOCATION' },
            include: { resource: true },
          });
        }

        return { activeConnection: conn, properties: props, locations: locMappings };
      }
    );

    if (!activeConnection) {
      return { gscRows: 0, gbpRows: 0 };
    }

    let accessToken: string;
    if (activeConnection.encryptedRefreshToken) {
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
      if (!token) throw new Error('Failed to get access token from Google credentials');
      accessToken = String(token);
    }

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    let gscRows = 0;
    if (shouldSyncGsc) {
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
          throw err;
        }
      }
    }

    let gbpRows = 0;
    const config = getConfig();
    if (config.ENABLE_GBP_SYNC && shouldSyncGbp) {
      for (const loc of locations) {
        try {
          const resolved = await TenantContextService.withTenantContext(
            prisma,
            tenantId,
            async (tx) => GoogleConnectionResolver.resolveForLocation(tx, tenantId, loc.internalId)
          );

          const locToken = await GoogleOAuthService.refreshAccessToken(
            resolved.encryptedRefreshToken,
            tenantId,
            resolved.connectionId
          );

          const rows = await this.processGbpJob({
            type: 'GBP_SYNC',
            tenantId,
            locationId: loc.internalId,
            locationResourceName: resolved.externalResourceId,
            startDate,
            endDate,
            businessKey: `${tenantId}:gbp:${loc.internalId}:${startDate}:${endDate}`,
          }, locToken);
          gbpRows += rows;
        } catch (err) {
          logger.warn({ err, locationId: loc.internalId }, 'Direct GBP sync failed or disabled');
        }
      }
    }

    return { gscRows, gbpRows };
  }

  /**
   * Processes a GBP_PROFILE_SYNC job.
   *
   * Direction: Google → LocalBi (READ-ONLY snapshot).
   * Never pushes LocalBi fields back to Google.
   * On success: updates Location.gbpSyncStatus = 'SYNCED'.
   * On failure: updates Location.gbpSyncStatus = 'ERROR'.
   */
  private static async processGbpProfileJob(
    data: GbpProfileSyncJobData,
    accessToken: string
  ): Promise<number> {
    const { tenantId, locationId, locationResourceName } = data;

    // Mark location as SYNCING before calling Google
    await GbpLocationService.updateGbpSyncStatus(tenantId, locationId, 'SYNCING');

    try {
      const profile = await GbpWriteClient.getProfile(accessToken, locationResourceName);

      // Compute profile completeness from the live profile data
      const completeness = GbpLocationService.computeProfileCompleteness(profile);

      logger.info(
        {
          tenantId,
          locationId,
          locationResourceName,
          completenessScore: completeness.score,
          operation: 'gbp.profile_sync.success',
        },
        'GBP profile sync completed successfully'
      );

      // Mark location as SYNCED
      await GbpLocationService.updateGbpSyncStatus(tenantId, locationId, 'SYNCED');

      // Return 1 row ingested (the profile snapshot counts as 1 unit)
      return 1;
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string; statusCode?: number };
      const isReAuth =
        errObj.code === 'GBP_CONNECTION_REVOKED' ||
        errObj.code === 'GOOGLE_AUTH_REQUIRED' ||
        errObj.statusCode === 401 ||
        errObj.statusCode === 403;

      const newStatus = isReAuth ? 'REAUTH_REQUIRED' : 'ERROR';
      const errorMessage = errObj.message?.slice(0, 500) ?? 'Unknown GBP profile sync error';

      logger.error(
        { tenantId, locationId, locationResourceName, err, operation: 'gbp.profile_sync.failed', newStatus },
        'GBP profile sync failed'
      );

      await GbpLocationService.updateGbpSyncStatus(tenantId, locationId, newStatus, errorMessage);
      throw err; // Allow BullMQ retry
    }
  }
}
