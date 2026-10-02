import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { prisma } from '../src/shared/database/client';
import { TenantService } from '../src/modules/tenancy/tenant-service';
import { BrandService } from '../src/modules/brands/brand-service';
import { LocationService } from '../src/modules/locations/location-service';
import { SyncQueueService } from '../src/modules/sync/sync-queue';
import { SyncWorkerService } from '../src/modules/sync/sync-worker';
import { CryptoEnvelopeService } from '../src/shared/crypto/envelope';
import { GoogleOAuthService } from '../src/modules/integrations/google/google-oauth-service';
import { GoogleApiClient } from '../src/modules/integrations/google/google-api-client';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role, ScopeMode, AuthorizedContext } from '../src/shared/authorization/policy';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';
import { Job } from 'bullmq';
import crypto from 'node:crypto';

describe('Background Sync Pipeline, Multi-Grain Ingestion & Idempotency', () => {
  let tenantId: string;
  let brandId: string;
  let locationId: string;
  let connectionId: string;
  let propertyId: string;
  let adminContext: AuthorizedContext;

  beforeEach(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');

    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(`sync-owner-${idSuffix}@example.com`),
        fullName: 'Sync Owner',
        status: 'ACTIVE',
      },
    });

    const tenant = await TenantService.createTenant(
      { name: `Sync Org ${idSuffix}`, slug: `sync-org-${idSuffix}`, timezone: 'Asia/Kolkata' },
      user.id
    );
    tenantId = tenant.id;

    adminContext = {
      userId: user.id,
      tenantId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    const brand = await BrandService.createBrand(
      tenantId,
      { name: 'ABC Dental', slug: 'abc-dental' },
      adminContext
    );
    brandId = brand.id;

    const loc = await LocationService.createLocation(
      tenantId,
      {
        brandId,
        name: 'Chennai - Anna Nagar',
        storeCode: 'CHN-AN-01',
        addressLine1: '12 2nd Avenue, Anna Nagar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600040',
        country: 'IN',
        timezone: 'Asia/Kolkata',
      },
      adminContext
    );
    locationId = loc.id;

    // Seed Active Connection & Mapped GscProperty
    const connId = `conn_${idSuffix}`;
    const envelope = CryptoEnvelopeService.encrypt({
      plaintext: 'mock_refresh_token_secret',
      tenantId,
      connectionId: connId,
    });

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const conn = await tx.integrationConnection.create({
        data: {
          id: connId,
          tenantId,
          provider: 'GOOGLE',
          externalSubjectId: `sub_${idSuffix}`,
          externalEmail: 'operator@example.com',
          encryptedRefreshToken: JSON.stringify(envelope),
          grantedScopes: ['business.manage', 'webmasters.readonly'],
          status: 'ACTIVE',
        },
      });
      connectionId = conn.id;

      const acc = await tx.externalAccount.create({
        data: {
          tenantId,
          connectionId: conn.id,
          provider: 'GOOGLE_SEARCH_CONSOLE',
          externalAccountId: 'gsc_default',
          accountName: 'GSC Account',
        },
      });

      const res = await tx.externalResource.create({
        data: {
          tenantId,
          accountId: acc.id,
          provider: 'GOOGLE_SEARCH_CONSOLE',
          externalResourceId: 'sc-domain:abcdental.example',
          resourceType: 'PROPERTY',
          resourceName: 'sc-domain:abcdental.example',
        },
      });

      const prop = await tx.gscProperty.create({
        data: {
          tenantId,
          resourceId: res.id,
          propertyUrl: 'sc-domain:abcdental.example',
          propertyType: 'DOMAIN',
        },
      });
      propertyId = prop.id;
    });
  });

  afterAll(async () => {
    await SyncQueueService.closeQueue();
    await SyncWorkerService.closeWorker();
  });

  it('generates colon-free, deterministic job IDs for idempotency', () => {
    const key = `${tenantId}:gsc:${propertyId}:2026-09-01:2026-09-15:WEB`;
    const { jobId } = SyncQueueService.generateJobId('gsc-sync', key);

    expect(jobId).not.toContain(':');
    expect(jobId).toMatch(/^gsc-sync_[a-f0-9]{24}$/);

    const second = SyncQueueService.generateJobId('gsc-sync', key);
    expect(second.jobId).toBe(jobId);
  });

  it('enqueues GSC sync job and creates SyncRun record in RUNNING state', async () => {
    const res = await SyncQueueService.scheduleGscSync({
      tenantId,
      propertyId,
      propertyUrl: 'sc-domain:abcdental.example',
      startDate: '2026-09-01',
      endDate: '2026-09-05',
    });

    expect(res.jobId).toBeDefined();

    const run = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.syncRun.findUnique({
        where: { uq_sync_run_business_key: { tenantId, businessKey: res.businessKey } },
      });
    });

    expect(run).not.toBeNull();
    expect(run?.status).toBe('RUNNING');
    expect(run?.provider).toBe('GSC');
  });

  it('processes GSC sync job and ingests multi-grain metrics into PostgreSQL', async () => {
    const businessKey = `${tenantId}:gsc:${propertyId}:2026-09-01:2026-09-05:WEB`;
    const { jobId } = SyncQueueService.generateJobId('gsc-sync', businessKey);

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.syncRun.create({
        data: {
          tenantId,
          provider: 'GSC',
          resourceId: propertyId,
          businessKey,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });
    });

    const mockJob = {
      id: jobId,
      data: {
        type: 'GSC_SYNC' as const,
        tenantId,
        propertyId,
        propertyUrl: 'sc-domain:abcdental.example',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        searchType: 'WEB',
        businessKey,
      },
    } as Job<import('../src/modules/sync/sync-queue').SyncJobData>;

    vi.spyOn(GoogleOAuthService, 'refreshAccessToken').mockResolvedValue('mock_access_token');
    vi.spyOn(GoogleApiClient, 'queryGscSearchAnalytics').mockImplementation(async (_token, _url, _start, _end, dims = []) => {
      const dim = dims[0];
      if (dim === 'date') {
        return [{ keys: ['2026-09-02'], clicks: 5, impressions: 50, ctr: 0.1, position: 2.1 }];
      } else if (dim === 'query') {
        return [{ keys: ['dentist chennai'], clicks: 3, impressions: 30, ctr: 0.1, position: 1.5 }];
      } else if (dim === 'page') {
        return [{ keys: ['https://abcdental.example/chennai'], clicks: 4, impressions: 40, ctr: 0.1, position: 1.8 }];
      } else if (dim === 'device') {
        return [{ keys: ['DESKTOP'], clicks: 3, impressions: 35, ctr: 0.08, position: 2.0 }];
      } else if (dim === 'country') {
        return [{ keys: ['IND'], clicks: 5, impressions: 50, ctr: 0.1, position: 2.1 }];
      }
      return [];
    });

    const result = await SyncWorkerService.processJob(mockJob);
    expect(result.status).toBe('SUCCESS');
    expect(result.rowsIngested).toBeGreaterThan(0);

    // Verify database ingestion
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const totals = await tx.gscDailyPropertyTotal.findMany({
        where: { tenantId, propertyId },
      });
      expect(totals.length).toBeGreaterThanOrEqual(1);
      expect(totals[0]?.clicks).toBeGreaterThanOrEqual(0);
      expect(totals[0]?.impressions).toBeGreaterThanOrEqual(1);

      // Verify Queries
      const queries = await tx.gscQuery.findMany({ where: { tenantId, propertyId } });
      expect(queries.length).toBeGreaterThanOrEqual(1);

      // Verify Devices
      const devices = await tx.gscDailyDeviceMetric.findMany({ where: { tenantId, propertyId } });
      expect(devices.length).toBeGreaterThanOrEqual(1);

      // Verify SyncRun updated to SUCCESS
      const syncRun = await tx.syncRun.findUnique({
        where: { uq_sync_run_business_key: { tenantId, businessKey } },
      });
      expect(syncRun?.status).toBe('SUCCESS');
      expect(syncRun?.rowsIngested).toBe(result.rowsIngested);
    });
  });

  it('processes GBP sync job and ingests daily metrics into PostgreSQL', async () => {
    const businessKey = `${tenantId}:gbp:${locationId}:2026-09-01:2026-09-05`;
    const { jobId } = SyncQueueService.generateJobId('gbp-sync', businessKey);

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.syncRun.create({
        data: {
          tenantId,
          provider: 'GBP',
          resourceId: locationId,
          businessKey,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });
    });

    const mockJob = {
      id: jobId,
      data: {
        type: 'GBP_SYNC' as const,
        tenantId,
        connectionId,
        locationId,
        locationResourceName: 'locations/293847192837',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        businessKey,
      },
    } as Job<import('../src/modules/sync/sync-queue').SyncJobData>;

    vi.spyOn(GoogleOAuthService, 'refreshAccessToken').mockResolvedValue('mock_access_token');
    vi.spyOn(GoogleApiClient, 'queryGbpPerformanceMetrics').mockResolvedValue([
      { date: '2026-09-02', metricType: 'CALL_CLICKS', value: 3 },
      { date: '2026-09-02', metricType: 'WEBSITE_CLICKS', value: 7 },
    ]);

    const result = await SyncWorkerService.processJob(mockJob);
    expect(result.status).toBe('SUCCESS');

    // Verify GBP metrics stored
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const gbpRows = await tx.gbpDailyMetric.findMany({
        where: { tenantId, locationId },
      });
      expect(gbpRows.length).toBeGreaterThanOrEqual(1);

      // Must include CALL_CLICKS, WEBSITE_CLICKS, etc.
      const metricTypes = new Set(gbpRows.map((r) => r.metricType));
      expect(metricTypes.has('CALL_CLICKS')).toBe(true);
      expect(metricTypes.has('WEBSITE_CLICKS')).toBe(true);
    });
  });

  it('aborts job as ABORTED_ORPHAN if Google connection has been revoked or removed', async () => {
    // Revoke connection
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.integrationConnection.update({
        where: { id: connectionId },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
    });

    const businessKey = `${tenantId}:gsc:${propertyId}:2026-09-06:2026-09-10:WEB`;
    const { jobId } = SyncQueueService.generateJobId('gsc-sync', businessKey);

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.syncRun.create({
        data: {
          tenantId,
          provider: 'GSC',
          resourceId: propertyId,
          businessKey,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });
    });

    const mockJob = {
      id: jobId,
      data: {
        type: 'GSC_SYNC' as const,
        tenantId,
        propertyId,
        propertyUrl: 'sc-domain:abcdental.example',
        startDate: '2026-09-06',
        endDate: '2026-09-10',
        searchType: 'WEB',
        businessKey,
      },
    } as Job<import('../src/modules/sync/sync-queue').SyncJobData>;

    const result = await SyncWorkerService.processJob(mockJob);
    expect(result.aborted).toBe(true);

    const run = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.syncRun.findUnique({
        where: { uq_sync_run_business_key: { tenantId, businessKey } },
      });
    });
    expect(run?.status).toBe('ABORTED_ORPHAN');
  });
});
