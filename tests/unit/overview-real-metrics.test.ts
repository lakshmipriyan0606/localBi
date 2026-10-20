import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { TenantService } from '@/modules/tenancy/tenant-service';
import { BrandService } from '@/modules/brands/brand-service';
import { LocationService } from '@/modules/locations/location-service';
import { SurfaceService } from '@/modules/page-builder/surface-service';
import { OverviewService } from '@/modules/overview/overview-service';
import { Role, ScopeMode, AuthorizedContext } from '@/shared/authorization/policy';
import { normalizeEmail } from '@/modules/auth/email-normalizer';

describe('Phase 1B: Real Overview Metrics, Honest Zeroes & Deduplication', () => {
  let tenantId: string;
  let tenantSlug: string;
  let userContext: AuthorizedContext;
  let brand1Id: string;
  let brand2Id: string;
  let location1Id: string;

  beforeEach(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(`metrics-owner-${idSuffix}@localbi.test`),
        fullName: 'Metrics Owner',
        status: 'ACTIVE',
      },
    });

    tenantSlug = `metrics-corp-${idSuffix}`;
    const tenant = await TenantService.createTenant(
      { name: `Metrics Corp ${idSuffix}`, slug: tenantSlug, timezone: 'America/Chicago' },
      user.id
    );
    tenantId = tenant.id;

    userContext = {
      userId: user.id,
      tenantId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    const brand1 = await BrandService.createBrand(
      tenantId,
      { name: 'Primary Brand', slug: `primary-brand-${idSuffix}` },
      userContext
    );
    brand1Id = brand1.id;

    const brand2 = await BrandService.createBrand(
      tenantId,
      { name: 'Secondary Brand', slug: `secondary-brand-${idSuffix}` },
      userContext
    );
    brand2Id = brand2.id;

    const loc1 = await LocationService.createLocation(
      tenantId,
      {
        name: 'Chicago Downtown Hub',
        addressLine1: '100 N Michigan Ave',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'US',
        timezone: 'America/Chicago',
        brandId: brand1Id,
        latitude: 41.881832,
        longitude: -87.623177,
      },
      userContext
    );
    location1Id = loc1.id;
  });

  describe('Honest Category Counting', () => {
    it('returns exact database count for active brand categories and honest zero when none exist', async () => {
      // Initially 0 categories
      const overviewEmpty = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id }
      );

      // Must be honest 0, NOT Math.max(locationsCount * 2, 8)
      expect(overviewEmpty.categoriesCount).toBe(0);

      // Create 2 active categories for brand1 and 1 for brand2 under tenant RLS context
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        await tx.category.createMany({
          data: [
            {
              tenantId,
              brandId: brand1Id,
              name: 'Beverages',
              slug: 'beverages',
              status: 'ACTIVE',
            },
            {
              tenantId,
              brandId: brand1Id,
              name: 'Snacks',
              slug: 'snacks',
              status: 'ACTIVE',
            },
            {
              tenantId,
              brandId: brand1Id,
              name: 'Archived Seasonal',
              slug: 'archived-seasonal',
              status: 'INACTIVE', // Inactive category must be excluded
            },
            {
              tenantId,
              brandId: brand2Id,
              name: 'Electronics',
              slug: 'electronics',
              status: 'ACTIVE',
            },
          ],
        });
      });

      const overviewBrand1 = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id }
      );

      // Active categories for brand1 only = 2
      expect(overviewBrand1.categoriesCount).toBe(2);

      const overviewBrand2 = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand2Id }
      );

      // Active categories for brand2 only = 1
      expect(overviewBrand2.categoriesCount).toBe(1);
    });
  });

  describe('Real Web Analytics & GA4 Daily Metric Aggregations', () => {
    it('aggregates real GA4 metrics and calculates conversion rate accurately', async () => {
      const surface = await SurfaceService.ensureLocalBiSurface(tenantId, brand1Id);
      const today = new Date();

      // Seed real Ga4DailyMetric records for brand1 under tenant RLS context
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        await tx.ga4DailyMetric.createMany({
          data: [
            {
              tenantId,
              brandId: brand1Id,
              webSurfaceId: surface.id,
              resourceId: 'ga4-prop-1',
              date: today,
              activeUsers: 150,
              sessions: 200,
              engagedSessions: 120,
              eventCount: 800,
              keyEvents: 15,
              screenPageViews: 500,
            },
            {
              tenantId,
              brandId: brand1Id,
              webSurfaceId: surface.id,
              resourceId: 'ga4-prop-1',
              date: new Date(today.getTime() - 86400000), // yesterday
              activeUsers: 100,
              sessions: 150,
              engagedSessions: 90,
              eventCount: 600,
              keyEvents: 10,
              screenPageViews: 350,
            },
          ],
        });
      });

      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 7 }
      );

      expect(overview.web.users).toBe(250);
      expect(overview.web.sessions).toBe(350);
      expect(overview.web.engagedSessions).toBe(210);
      expect(overview.web.conversions).toBe(25);
      // Conversion rate = (25 / 350) * 100 = 7.1%
      expect(overview.web.conversionRate).toBe(7.1);
      expect(overview.web.hasData).toBe(true);
    });

    it('returns honest zero state when no web analytics records exist', async () => {
      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 30 }
      );

      expect(overview.web.users).toBe(0);
      expect(overview.web.sessions).toBe(0);
      expect(overview.web.engagedSessions).toBe(0);
      expect(overview.web.conversions).toBe(0);
      expect(overview.web.conversionRate).toBe(0);
      expect(overview.web.conversionRateDelta).toBe(0);
    });
  });

  describe('Conversions & Call Deduplication', () => {
    it('aggregates leads and non-lead inbound calls without double counting', async () => {
      const surface = await SurfaceService.ensureLocalBiSurface(tenantId, brand1Id);

      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        const vNumber = await tx.virtualNumber.create({
          data: {
            tenant: { connect: { id: tenantId } },
            brand: { connect: { uq_brand_tenant_id: { tenantId, id: brand1Id } } },
            provider: 'TEST_ADAPTER',
            providerNumberId: `vn-${crypto.randomBytes(4).toString('hex')}`,
            phoneNumber: `+131255501${crypto.randomBytes(2).toString('hex')}`,
            status: 'ACTIVE',
          },
        });

        // 1. Standalone Lead (e.g. contact form submission)
        await tx.lead.create({
          data: {
            tenantId,
            brandId: brand1Id,
            webSurfaceId: surface.id,
            storeId: location1Id,
            type: 'FORM',
            status: 'NEW',
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
        });

        // 2. Inbound call that created a Lead record (MUST NOT double count)
        const leadFromCall = await tx.lead.create({
          data: {
            tenantId,
            brandId: brand1Id,
            webSurfaceId: surface.id,
            storeId: location1Id,
            type: 'CALL',
            status: 'NEW',
            phone: '+13125550101',
          },
        });

        await tx.call.create({
          data: {
            tenant: { connect: { id: tenantId } },
            brand: { connect: { uq_brand_tenant_id: { tenantId, id: brand1Id } } },
            virtualNumber: { connect: { uq_virtual_number_tenant_id: { tenantId, id: vNumber.id } } },
            provider: 'TEST_ADAPTER',
            providerCallId: `call-with-lead-${crypto.randomBytes(4).toString('hex')}`,
            direction: 'INBOUND',
            status: 'ANSWERED',
            durationSeconds: 120,
            lead: { connect: { id: leadFromCall.id } },
          },
        });

        // 3. Direct inbound call that did NOT produce a Lead record
        await tx.call.create({
          data: {
            tenant: { connect: { id: tenantId } },
            brand: { connect: { uq_brand_tenant_id: { tenantId, id: brand1Id } } },
            virtualNumber: { connect: { uq_virtual_number_tenant_id: { tenantId, id: vNumber.id } } },
            provider: 'TEST_ADAPTER',
            providerCallId: `call-direct-${crypto.randomBytes(4).toString('hex')}`,
            direction: 'INBOUND',
            status: 'ANSWERED',
            durationSeconds: 95,
          },
        });

        // 4. Outbound call (must NOT be counted as inbound conversion)
        await tx.call.create({
          data: {
            tenant: { connect: { id: tenantId } },
            brand: { connect: { uq_brand_tenant_id: { tenantId, id: brand1Id } } },
            virtualNumber: { connect: { uq_virtual_number_tenant_id: { tenantId, id: vNumber.id } } },
            provider: 'TEST_ADAPTER',
            providerCallId: `call-outbound-${crypto.randomBytes(4).toString('hex')}`,
            direction: 'OUTBOUND',
            status: 'COMPLETED',
            durationSeconds: 45,
          },
        });
      });

      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 30 }
      );

      // Total conversions = 2 leads (form + call lead) + 1 direct inbound call without lead = 3
      expect(overview.web.conversions).toBe(3);
    });
  });

  describe('Elimination of Synthetic Multipliers in Location Rankings', () => {
    it('derives location ranking metrics purely from verified events without convs * 5 or 20.0%', async () => {
      const surface = await SurfaceService.ensureLocalBiSurface(tenantId, brand1Id);

      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        // Create 2 leads for location1
        await tx.lead.createMany({
          data: [
            {
              tenantId,
              brandId: brand1Id,
              webSurfaceId: surface.id,
              storeId: location1Id,
              type: 'FORM',
              status: 'NEW',
            },
            {
              tenantId,
              brandId: brand1Id,
              webSurfaceId: surface.id,
              storeId: location1Id,
              type: 'FORM',
              status: 'NEW',
            },
          ],
        });

        // Create 10 real attribution events (visitors) for location1
        const eventsData = Array.from({ length: 10 }).map((_, idx) => ({
          tenantId,
          brandId: brand1Id,
          webSurfaceId: surface.id,
          storeId: location1Id,
          eventType: 'PAGE_VIEW' as const,
          visitorId: `visitor-${idx}`,
          sessionId: `session-${idx}`,
        }));
        await tx.attributionEvent.createMany({ data: eventsData });
      });

      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 30 }
      );

      const locRank = overview.web.rankings.find((r) => r.name === 'Chicago Downtown Hub');
      expect(locRank).toBeDefined();

      // Must be real conversions: 2
      expect(locRank!.conversions).toBe(2);

      // Must be real recorded users: 10 (NOT convs * 5 = 10 by accident, but derived from 10 events)
      expect(locRank!.users).toBe(10);

      // Rate = (2 / 10) * 100 = 20.0% mathematically derived from real 2 / 10
      expect(locRank!.rate).toBe('20.0%');

      // Now add 10 MORE events so total events = 20 under tenant RLS context
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        const moreEvents = Array.from({ length: 10 }).map((_, idx) => ({
          tenantId,
          brandId: brand1Id,
          webSurfaceId: surface.id,
          storeId: location1Id,
          eventType: 'PAGE_VIEW' as const,
          visitorId: `visitor-extra-${idx}`,
          sessionId: `session-extra-${idx}`,
        }));
        await tx.attributionEvent.createMany({ data: moreEvents });
      });

      const overviewUpdated = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 30 }
      );

      const locRankUpdated = overviewUpdated.web.rankings.find((r) => r.name === 'Chicago Downtown Hub');
      expect(locRankUpdated).toBeDefined();
      expect(locRankUpdated!.conversions).toBe(2);
      expect(locRankUpdated!.users).toBe(20);

      // Rate must be 10.0% (2 / 20), PROVING it is NOT hardcoded to 20.0%!
      expect(locRankUpdated!.rate).toBe('10.0%');
    });

    it('returns honest 0 users and 0.0% rate when a location has 0 conversions and 0 visits', async () => {
      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 30 }
      );

      const locRank = overview.web.rankings.find((r) => r.name === 'Chicago Downtown Hub');
      expect(locRank).toBeDefined();
      expect(locRank!.conversions).toBe(0);
      expect(locRank!.users).toBe(0);
      expect(locRank!.rate).toBe('0.0%');
      expect(locRank!.dataQualityWarning).toBeUndefined();
    });
  });

  describe('Phase 1.1: Metric Correctness, Denominators & Provenance Gates', () => {
    it('deduplicates repeated visits by the same user across multiple days for a location', async () => {
      const surface = await SurfaceService.ensureLocalBiSurface(tenantId, brand1Id);
      const today = new Date();

      // Seed 8 events by the SAME visitor across 4 distinct days
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        const events = [0, 1, 2, 3].flatMap((dayOffset) => [
          {
            tenantId,
            brandId: brand1Id,
            webSurfaceId: surface.id,
            storeId: location1Id,
            eventType: 'PAGE_VIEW' as const,
            visitorId: 'repeat-visitor-alice',
            sessionId: `session-day-${dayOffset}-1`,
            occurredAt: new Date(today.getTime() - dayOffset * 86400000),
          },
          {
            tenantId,
            brandId: brand1Id,
            webSurfaceId: surface.id,
            storeId: location1Id,
            eventType: 'PAGE_VIEW' as const,
            visitorId: 'repeat-visitor-alice',
            sessionId: `session-day-${dayOffset}-2`,
            occurredAt: new Date(today.getTime() - dayOffset * 86400000 + 3600000),
          },
        ]);
        await tx.attributionEvent.createMany({ data: events });
      });

      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 7 }
      );

      const locRank = overview.web.rankings.find((r) => r.name === 'Chicago Downtown Hub');
      expect(locRank).toBeDefined();
      // Even though 8 page view events occurred, only 1 unique user visited!
      expect(locRank!.users).toBe(1);
    });

    it('handles zero denominators honestly without fabricating denominators via Math.max', async () => {
      const surface = await SurfaceService.ensureLocalBiSurface(tenantId, brand1Id);

      // Create 3 direct calls (e.g. from billboard/offline) with ZERO website visitor events
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        const vNumber = await tx.virtualNumber.create({
          data: {
            tenant: { connect: { id: tenantId } },
            brand: { connect: { uq_brand_tenant_id: { tenantId, id: brand1Id } } },
            provider: 'TEST_ADAPTER',
            providerNumberId: `vn-zero-${crypto.randomBytes(4).toString('hex')}`,
            phoneNumber: `+131255502${crypto.randomBytes(2).toString('hex')}`,
            status: 'ACTIVE',
          },
        });

        for (let i = 0; i < 3; i++) {
          await tx.call.create({
            data: {
              tenant: { connect: { id: tenantId } },
              brand: { connect: { uq_brand_tenant_id: { tenantId, id: brand1Id } } },
              store: { connect: { id: location1Id } },
              virtualNumber: { connect: { uq_virtual_number_tenant_id: { tenantId, id: vNumber.id } } },
              provider: 'TEST_ADAPTER',
              providerCallId: `call-zero-denom-${i}-${crypto.randomBytes(4).toString('hex')}`,
              direction: 'INBOUND',
              status: 'ANSWERED',
              durationSeconds: 60,
            },
          });
        }
      });

      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 30 }
      );

      const locRank = overview.web.rankings.find((r) => r.name === 'Chicago Downtown Hub');
      expect(locRank).toBeDefined();
      expect(locRank!.conversions).toBe(3);
      // Requirement 1: Never fabricate users via Math.max(users, conversions). Users must be honest 0!
      expect(locRank!.users).toBe(0);
      // Requirement 2: Zero denominator must return 'N/A' rather than forced percentage
      expect(locRank!.rate).toBe('N/A');
      // Requirement 3: Surface data-quality warning explaining offline/direct conversions
      expect(locRank!.dataQualityWarning).toMatch(/Conversions recorded without online web visits/i);
    });

    it('surfaces data quality warning when conversions exceed users without clamping to 100%', async () => {
      const surface = await SurfaceService.ensureLocalBiSurface(tenantId, brand1Id);

      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        // 1. Create 2 unique visitors
        await tx.attributionEvent.createMany({
          data: [
            {
              tenantId,
              brandId: brand1Id,
              webSurfaceId: surface.id,
              storeId: location1Id,
              eventType: 'PAGE_VIEW',
              visitorId: 'visitor-exceed-1',
              sessionId: 'session-exceed-1',
            },
            {
              tenantId,
              brandId: brand1Id,
              webSurfaceId: surface.id,
              storeId: location1Id,
              eventType: 'PAGE_VIEW',
              visitorId: 'visitor-exceed-2',
              sessionId: 'session-exceed-2',
            },
          ],
        });

        // 2. Create 4 direct phone calls
        const vNumber = await tx.virtualNumber.create({
          data: {
            tenant: { connect: { id: tenantId } },
            brand: { connect: { uq_brand_tenant_id: { tenantId, id: brand1Id } } },
            provider: 'TEST_ADAPTER',
            providerNumberId: `vn-exceed-${crypto.randomBytes(4).toString('hex')}`,
            phoneNumber: `+131255503${crypto.randomBytes(2).toString('hex')}`,
            status: 'ACTIVE',
          },
        });

        for (let i = 0; i < 4; i++) {
          await tx.call.create({
            data: {
              tenant: { connect: { id: tenantId } },
              brand: { connect: { uq_brand_tenant_id: { tenantId, id: brand1Id } } },
              store: { connect: { id: location1Id } },
              virtualNumber: { connect: { uq_virtual_number_tenant_id: { tenantId, id: vNumber.id } } },
              provider: 'TEST_ADAPTER',
              providerCallId: `call-exceed-${i}-${crypto.randomBytes(4).toString('hex')}`,
              direction: 'INBOUND',
              status: 'ANSWERED',
              durationSeconds: 80,
            },
          });
        }
      });

      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 30 }
      );

      const locRank = overview.web.rankings.find((r) => r.name === 'Chicago Downtown Hub');
      expect(locRank).toBeDefined();
      // Users must be honest 2 (NOT Math.max(2, 4) = 4!)
      expect(locRank!.users).toBe(2);
      expect(locRank!.conversions).toBe(4);
      // Conversion rate = (4 / 2) * 100 = 200.0% (NOT clamped to 100.0%!)
      expect(locRank!.rate).toBe('200.0%');
      expect(locRank!.dataQualityWarning).toMatch(/Direct calls or conversions exceed online visitors/i);
    });

    it('strictly prevents duplicate counting between Lead, Call, and AttributionEvent', async () => {
      const surface = await SurfaceService.ensureLocalBiSurface(tenantId, brand1Id);

      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        const vNumber = await tx.virtualNumber.create({
          data: {
            tenant: { connect: { id: tenantId } },
            brand: { connect: { uq_brand_tenant_id: { tenantId, id: brand1Id } } },
            provider: 'TEST_ADAPTER',
            providerNumberId: `vn-dedup-${crypto.randomBytes(4).toString('hex')}`,
            phoneNumber: `+131255504${crypto.randomBytes(2).toString('hex')}`,
            status: 'ACTIVE',
          },
        });

        // 1. Telemetry button clicks (AttributionEvent)
        await tx.attributionEvent.createMany({
          data: [
            {
              tenantId,
              brandId: brand1Id,
              webSurfaceId: surface.id,
              storeId: location1Id,
              eventType: 'CALL_CLICK',
              visitorId: 'user-clicker',
              sessionId: 'session-clicker',
            },
            {
              tenantId,
              brandId: brand1Id,
              webSurfaceId: surface.id,
              storeId: location1Id,
              eventType: 'FORM_SUBMIT',
              visitorId: 'user-clicker',
              sessionId: 'session-clicker',
            },
          ],
        });

        // 2. Confirmed Lead created from the form submit
        const lead = await tx.lead.create({
          data: {
            tenantId,
            brandId: brand1Id,
            webSurfaceId: surface.id,
            storeId: location1Id,
            type: 'FORM',
            status: 'NEW',
            name: 'Audit Lead',
          },
        });

        // 3. Call that is linked to this lead (e.g. rep called the lead or lead originated from call)
        await tx.call.create({
          data: {
            tenant: { connect: { id: tenantId } },
            brand: { connect: { uq_brand_tenant_id: { tenantId, id: brand1Id } } },
            store: { connect: { id: location1Id } },
            virtualNumber: { connect: { uq_virtual_number_tenant_id: { tenantId, id: vNumber.id } } },
            provider: 'TEST_ADAPTER',
            providerCallId: `call-linked-lead-${crypto.randomBytes(4).toString('hex')}`,
            direction: 'INBOUND',
            status: 'ANSWERED',
            durationSeconds: 150,
            lead: { connect: { id: lead.id } }, // LINKED to Lead!
          },
        });
      });

      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 30 }
      );

      // Conversions must be EXACTLY 1 (the single confirmed lead).
      // The linked call must NOT be counted again as a second conversion.
      // The CALL_CLICK and FORM_SUBMIT AttributionEvents must NOT be added as conversions.
      expect(overview.web.conversions).toBe(1);
    });

    it('documents GA4 daily active users aggregation honestly and verifies provenance metadata', async () => {
      const surface = await SurfaceService.ensureLocalBiSurface(tenantId, brand1Id);
      const today = new Date();

      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        await tx.ga4DailyMetric.create({
          data: {
            tenantId,
            brandId: brand1Id,
            webSurfaceId: surface.id,
            resourceId: 'ga4-prov-1',
            date: today,
            activeUsers: 80,
            sessions: 100,
            engagedSessions: 60,
            eventCount: 400,
            keyEvents: 5,
            screenPageViews: 250,
          },
        });
      });

      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 7 }
      );

      // Verify honest metric documentation in provenance
      expect(overview.metricProvenance).toBeDefined();
      expect(overview.metricProvenance?.userMetricType).toBe('daily_active_users_sum');
      expect(overview.metricProvenance?.userMetricDescription).toContain('Sum of daily active users');
      expect(overview.metricProvenance?.conversionRateType).toBe('session_based');
      expect(overview.metricProvenance?.conversionRateFormula).toBe('Total conversions / Total web sessions * 100');
      expect(overview.metricProvenance?.dataScope).toContain('GA4 analytics metrics reflect traffic from the active brand');
      expect(overview.web.userMetricType).toBe('daily_active_users_sum');
      expect(overview.web.conversionRateType).toBe('session_based');
      expect(overview.dataQualityWarnings).toBeDefined();
    });

    it('accurately distinguishes GBP search impressions from search queries', async () => {
      const today = new Date();

      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        await tx.gbpDailyMetric.createMany({
          data: [
            {
              tenantId,
              locationId: location1Id,
              metricType: 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
              date: today,
              value: 120,
            },
            {
              tenantId,
              locationId: location1Id,
              metricType: 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
              date: today,
              value: 180,
            },
            {
              tenantId,
              locationId: location1Id,
              metricType: 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
              date: today,
              value: 75,
            },
            {
              tenantId,
              locationId: location1Id,
              metricType: 'WEBSITE_CLICKS',
              date: today,
              value: 40,
            },
          ],
        });
      });

      const overview = await OverviewService.getOverviewData(
        tenantId,
        tenantSlug,
        userContext,
        { brandId: brand1Id, days: 7 }
      );

      // Total search impressions = 120 + 180 = 300
      expect(overview.gbp.searchImpressions).toBe(300);
      // Maps impressions = 75
      expect(overview.gbp.mapsImpressions).toBe(75);
      // Total profile views = 300 + 75 = 375
      expect(overview.gbp.profileViews).toBe(375);
      // Website clicks = 40
      expect(overview.gbp.websiteClicks).toBe(40);
    });
  });
});
