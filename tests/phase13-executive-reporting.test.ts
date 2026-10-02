import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { MetricRegistry } from '@/modules/reporting/metric-registry';
import { ComparisonEngine } from '@/modules/reporting/comparison-engine';
import { ReportingDateService } from '@/modules/reporting/reporting-date-service';
import { ReportExportService } from '@/modules/reporting/report-export-service';
import { ReportScheduleService } from '@/modules/reporting/report-schedule-service';
import { ExecutiveReportingService } from '@/modules/reporting/executive-reporting-service';
import { ClientReportContext } from '@/modules/reporting/client-report-context-service';
import { ScopeMode, Role } from '@/shared/authorization/policy';
import { AttributionEventType } from '@prisma/client';

describe('Phase 13: Unified Executive / Client Reporting Engine', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Metric Definition Registry & Provenance
  // ───────────────────────────────────────────────────────────────────────────
  describe('MetricRegistry & Provenance', () => {
    it('defines distinct metrics across all 9 modules with valid sources', () => {
      const allMetrics = MetricRegistry.listAll();
      expect(allMetrics.length).toBeGreaterThanOrEqual(20);

      const sources = new Set(allMetrics.map((m) => m.source));
      expect(sources).toContain('GA4');
      expect(sources).toContain('GSC');
      expect(sources).toContain('GBP');
      expect(sources).toContain('LOCALBI');
      expect(sources).toContain('TELEPHONY');
      expect(sources).toContain('MERCHANT');
      expect(sources).toContain('LOCAL_RANK_PROVIDER');
      expect(sources).toContain('DIRECTORY_PROVIDER');
    });

    it('strictly separates CALL_CLICK (LOCALBI) from Real Call (TELEPHONY)', () => {
      const ctaCall = MetricRegistry.getDefinition('actions.calls');
      const realCall = MetricRegistry.getDefinition('telephony.inboundCalls');

      expect(ctaCall).toBeDefined();
      expect(realCall).toBeDefined();
      expect(ctaCall?.source).toBe('LOCALBI');
      expect(realCall?.source).toBe('TELEPHONY');
      expect(ctaCall?.displayName).not.toBe(realCall?.displayName);
    });

    it('strictly distinguishes GA4 users from GBP profile views', () => {
      const webUsers = MetricRegistry.getDefinition('website.users');
      expect(webUsers?.source).toBe('GA4');
      expect(webUsers?.calculationDescription).toContain('Google Analytics 4');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Comparison Engine & Safe Delta Calculations
  // ───────────────────────────────────────────────────────────────────────────
  describe('ComparisonEngine Math Safety', () => {
    it('calculates standard positive growth accurately', () => {
      // 100 vs 80 -> +25%
      const res = ComparisonEngine.calculate(100, 80, { baselineLabel: 'prior 30 days' });
      expect(res.growthPercent).toBe(25);
      expect(res.trend).toBe('UP');
      expect(res.displayFormatted).toBe('+25.0%');
      expect(res.baselineDescription).toBe('prior 30 days');
    });

    it('calculates standard negative growth accurately', () => {
      // 70 vs 80 -> -12.5%
      const res = ComparisonEngine.calculate(70, 80);
      expect(res.growthPercent).toBe(-12.5);
      expect(res.trend).toBe('DOWN');
      expect(res.displayFormatted).toBe('-12.5%');
    });

    it('handles previous = 0 safely without returning Infinity% (Section 25 & 88)', () => {
      // Previous = 0, current = 10 -> 'New', not Infinity%
      const res = ComparisonEngine.calculate(10, 0);
      expect(res.growthPercent).toBeNull();
      expect(res.trend).toBe('NEW');
      expect(res.isNew).toBe(true);
      expect(res.displayFormatted).toBe('New');
    });

    it('handles both current and previous = 0 as neutral 0.0%', () => {
      const res = ComparisonEngine.calculate(0, 0);
      expect(res.growthPercent).toBe(0);
      expect(res.trend).toBe('NEUTRAL');
      expect(res.displayFormatted).toBe('0.0%');
    });

    it('handles missing previous data without returning -100% (Section 7)', () => {
      const res = ComparisonEngine.calculate(50, null);
      expect(res.trend).toBe('UNAVAILABLE');
      expect(res.isUnavailable).toBe(true);
      expect(res.growthPercent).toBeNull();
      expect(res.displayFormatted).toBe('N/A');
    });

    it('handles average position where lower is better (4.2 -> 2.1 is UP)', () => {
      const res = ComparisonEngine.calculatePositionDelta(2.1, 4.2);
      expect(res.trend).toBe('UP');
      expect(res.displayFormatted).toBe('-50.0%');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Reporting Date & Comparison Ranges
  // ───────────────────────────────────────────────────────────────────────────
  describe('ReportingDateService', () => {
    it('resolves standard 30d preset with completed yesterday end date', () => {
      const range = ReportingDateService.resolveDateRange({
        preset: '30d',
        referenceDate: new Date('2026-10-15T12:00:00Z'),
      });

      expect(range.daysCount).toBe(30);
      expect(range.endDate).toBe('2026-10-14');
      expect(range.startDate).toBe('2026-09-15');
    });

    it('computes strictly equal-length comparison period immediately preceding active window (Section 6)', () => {
      const activeRange = ReportingDateService.resolveDateRange({
        preset: '30d',
        referenceDate: new Date('2026-10-15T12:00:00Z'),
      });

      const compRange = ReportingDateService.resolveComparisonRange(activeRange, 'PREVIOUS_PERIOD');
      expect(compRange.daysCount).toBe(30);
      expect(compRange.endDate).toBe('2026-09-14');
      expect(compRange.startDate).toBe('2026-08-16');
      expect(compRange.label).toContain('previous 30 days');
    });

    it('computes previous year comparison range shifted by 365 days', () => {
      const activeRange = ReportingDateService.resolveDateRange({
        preset: '30d',
        referenceDate: new Date('2026-10-15T12:00:00Z'),
      });

      const compYear = ReportingDateService.resolveComparisonRange(activeRange, 'PREVIOUS_YEAR');
      expect(compYear.daysCount).toBe(30);
      expect(compYear.startDate).toBe('2025-09-15');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Report Export & CSV Formula Injection Neutralization
  // ───────────────────────────────────────────────────────────────────────────
  describe('ReportExportService Security (Section 48 & 94)', () => {
    it('neutralizes spreadsheet formula injection prefixes (=, +, -, @, tab)', () => {
      expect(ReportExportService.sanitizeCsvField('=HYPERLINK("http://evil.com","Click")')).toBe('\'=HYPERLINK("http://evil.com","Click")');
      expect(ReportExportService.sanitizeCsvField('+cmd|\' /C calc\'!A0')).toBe('\'+cmd|\' /C calc\'!A0');
      expect(ReportExportService.sanitizeCsvField('-100')).toBe('\'-100');
      expect(ReportExportService.sanitizeCsvField('@SUM(1,2)')).toBe('\'@SUM(1,2)');
      expect(ReportExportService.sanitizeCsvField('\tTAB_EXPLOIT')).toBe('\'\tTAB_EXPLOIT');
      expect(ReportExportService.sanitizeCsvField('Normal Store Name')).toBe('Normal Store Name');
    });

    it('generates well-formatted printable HTML report from frozen snapshot', () => {
      const mockReport: any = {
        tenantId: 't1',
        tenantName: 'Tenant One',
        brandId: 'b1',
        brandName: 'Aalim Perfumes',
        dateRange: { startDate: '2026-09-01', endDate: '2026-09-30', daysCount: 30, preset: '30d' },
        comparisonRange: { startDate: '2026-08-02', endDate: '2026-08-31', daysCount: 30, enabled: true, type: 'PREVIOUS_PERIOD', label: 'vs previous 30 days' },
        generatedAt: '2026-10-01T00:00:00.000Z',
        dataFreshness: { GA4: '2026-10-01T00:00:00.000Z', GSC: '2026-10-01T00:00:00.000Z' },
        partial: false,
        unavailableModules: [],
        website: {
          state: 'DATA',
          webSurfaceType: 'LOCALBI',
          webSurfaceId: 'ws1',
          metrics: {
            users: { currentValue: 12480, previousValue: 10000, growthPercent: 24.8, trend: 'UP', displayFormatted: '+24.8%' },
            sessions: { currentValue: 15210, previousValue: 12000, growthPercent: 26.8, trend: 'UP', displayFormatted: '+26.8%' },
            pageViews: { currentValue: 38900, previousValue: 30000, growthPercent: 29.7, trend: 'UP', displayFormatted: '+29.7%' },
            gscClicks: { currentValue: 4820, previousValue: 4000, growthPercent: 20.5, trend: 'UP', displayFormatted: '+20.5%' },
            gscImpressions: { currentValue: 118000, previousValue: 100000, growthPercent: 18.0, trend: 'UP', displayFormatted: '+18.0%' },
            ctr: { currentValue: 4.1, previousValue: 4.0, growthPercent: 2.5, trend: 'UP', displayFormatted: '+2.5%' },
            averagePosition: { currentValue: 4.2, previousValue: 5.1, growthPercent: -17.6, trend: 'UP', displayFormatted: '-17.6%' },
          },
        },
        localActions: {
          state: 'DATA',
          metrics: {
            totalActions: { currentValue: 1550, previousValue: 1200, growthPercent: 29.2, trend: 'UP', displayFormatted: '+29.2%' },
          },
        },
        telephony: {
          state: 'DATA',
          metrics: {
            inboundCalls: { currentValue: 482, previousValue: 400, growthPercent: 20.5, trend: 'UP', displayFormatted: '+20.5%' },
          },
          recentCalls: [],
        },
        gbp: {
          state: 'DATA',
          metrics: {
            mappedLocations: 3,
            averageRating: { currentValue: 4.6, previousValue: null, growthPercent: null, trend: 'UNAVAILABLE', displayFormatted: 'N/A' },
            totalReviews: { currentValue: 328, previousValue: null, growthPercent: null, trend: 'UNAVAILABLE', displayFormatted: 'N/A' },
            unansweredReviews: { currentValue: 2, previousValue: null, growthPercent: null, trend: 'UNAVAILABLE', displayFormatted: 'N/A' },
            profileCompleteness: 95,
          },
        },
        rank: {
          state: 'DATA',
          metrics: {
            trackedKeywords: 84,
            top3Coverage: { currentValue: 58, previousValue: null, growthPercent: null, trend: 'UNAVAILABLE', displayFormatted: 'N/A' },
            top10Coverage: { currentValue: 89, previousValue: null, growthPercent: null, trend: 'UNAVAILABLE', displayFormatted: 'N/A' },
            averageFoundRank: { currentValue: 4.6, previousValue: null, growthPercent: null, trend: 'UNAVAILABLE', displayFormatted: 'N/A' },
          },
        },
        merchant: { state: 'DATA', metrics: { enabledProducts: 348, approved: { currentValue: 348 }, disapproved: { currentValue: 0 } }, topIssues: [] },
        listings: { state: 'DATA', metrics: { providersChecked: 7, healthyCount: { currentValue: 5 }, needsReviewCount: { currentValue: 1 }, duplicatesCount: { currentValue: 1 } }, providerSummary: [] },
        opportunities: { state: 'DATA', metrics: { openCount: 12, highPriorityCount: 8, completedCount: 12 }, topOpportunities: [] },
        stores: [
          { storeId: 's1', storeName: 'Mannadi Branch', city: 'Chennai', websiteActions: 420, calls: 183, leads: 61, rating: 4.7, reviewsCount: 328, top3Coverage: 62.0, listingIssues: 0 }
        ],
      };

      const html = ReportExportService.generatePrintableHtml(mockReport);
      expect(html).toContain('Aalim Perfumes');
      expect(html).toContain('Mannadi Branch');
      expect(html).toContain('12,480');
      expect(html).toContain('Source: GA4');
      expect(html).toContain('Source: GSC');
      expect(html).toContain('Source: LocalBi');
      expect(html).toContain('Source: Telephony');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Schedule Idempotency & Period Keys (Section 58 & 91)
  // ───────────────────────────────────────────────────────────────────────────
  describe('ReportScheduleService Idempotency', () => {
    it('computes deterministic period key for monthly and weekly cadences', () => {
      const date = new Date('2026-10-02T12:00:00Z');
      const monthlyKey = ReportScheduleService.computePeriodKey('MONTHLY', date);
      const weeklyKey = ReportScheduleService.computePeriodKey('WEEKLY', date);

      expect(monthlyKey).toBe('monthly_2026_10');
      expect(weeklyKey).toMatch(/^weekly_2026_w\d+$/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Live Database Multi-Tenant RLS & End-to-End Orchestration
  // ───────────────────────────────────────────────────────────────────────────
  describe('Live Multi-Tenant RLS Integration', () => {
    const tenantAId = `test_phase13_tenant_a_${Date.now()}`;
    const tenantBId = `test_phase13_tenant_b_${Date.now()}`;
    const brandAId = `test_phase13_brand_a_${Date.now()}`;
    const brandBId = `test_phase13_brand_b_${Date.now()}`;
    const storeAId = `test_phase13_store_a_${Date.now()}`;
    const storeBId = `test_phase13_store_b_${Date.now()}`;
    const surfaceAId = `test_phase13_surface_a_${Date.now()}`;

    beforeAll(async () => {
      // Create Tenant A and Brand A
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.tenant.create({
          data: {
            id: tenantAId,
            name: 'Tenant Alpha (Phase 13)',
            slug: `tenant-alpha-p13-${Date.now()}`,
            plan: 'ENTERPRISE',
            status: 'ACTIVE',
            timezone: 'UTC',
          },
        });

        await tx.brand.create({
          data: {
            id: brandAId,
            tenantId: tenantAId,
            name: 'Brand Alpha',
            slug: 'brand-alpha',
          },
        });

        await tx.location.create({
          data: {
            id: storeAId,
            tenantId: tenantAId,
            brandId: brandAId,
            name: 'Alpha Downtown',
            addressLine1: '123 Anna Salai',
            city: 'Chennai',
            state: 'TN',
            postalCode: '600001',
            country: 'IN',
          },
        });

        await tx.webSurface.create({
          data: {
            id: surfaceAId,
            tenantId: tenantAId,
            brandId: brandAId,
            name: 'Alpha LocalBi Storefront',
            type: 'LOCALBI',
          },
        });

        const conn = await tx.integrationConnection.create({
          data: {
            tenantId: tenantAId,
            provider: 'GOOGLE',
            externalSubjectId: `sub_a_${Date.now()}`,
            externalEmail: 'operator@example.com',
            encryptedRefreshToken: 'enc_token_val',
            grantedScopes: ['webmasters.readonly'],
            status: 'ACTIVE',
          },
        });

        const acc = await tx.externalAccount.create({
          data: {
            tenantId: tenantAId,
            connectionId: conn.id,
            provider: 'GOOGLE_SEARCH_CONSOLE',
            externalAccountId: `gsc_acc_a_${Date.now()}`,
            accountName: 'GSC Alpha',
          },
        });

        const gscRes = await tx.externalResource.create({
          data: {
            tenantId: tenantAId,
            accountId: acc.id,
            provider: 'GOOGLE_SEARCH_CONSOLE',
            externalResourceId: 'sc-domain:alpha.example',
            resourceType: 'PROPERTY',
            resourceName: 'sc-domain:alpha.example',
          },
        });

        await tx.internalResourceMapping.create({
          data: {
            tenantId: tenantAId,
            internalType: 'WEBSURFACE',
            internalId: surfaceAId,
            webSurfaceId: surfaceAId,
            resourceId: gscRes.id,
          },
        });

        const gscProp = await tx.gscProperty.create({
          data: {
            tenantId: tenantAId,
            resourceId: gscRes.id,
            propertyUrl: 'sc-domain:alpha.example',
            propertyType: 'DOMAIN',
          },
        });

        // Seed GA4 metric for Tenant A
        await tx.ga4DailyMetric.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            webSurfaceId: surfaceAId,
            resourceId: 'res_ga4_a',
            date: new Date('2026-09-20T00:00:00.000Z'),
            activeUsers: 500,
            sessions: 650,
            screenPageViews: 1200,
          },
        });

        // Seed GSC metric for Tenant A
        await tx.gscDailyPropertyTotal.create({
          data: {
            tenantId: tenantAId,
            propertyId: gscProp.id,
            date: new Date('2026-09-20T00:00:00.000Z'),
            clicks: 150,
            impressions: 3000,
            sumPositionImpressions: 10500,
            freshnessTimestamp: new Date(),
          },
        });

        // Seed Attribution Event for Tenant A (CALL_CLICK)
        await tx.attributionEvent.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            webSurfaceId: surfaceAId,
            storeId: storeAId,
            eventType: AttributionEventType.CALL_CLICK,
            occurredAt: new Date('2026-09-20T10:00:00Z'),
          },
        });

        // Seed Virtual Number and Call for Tenant A
        const vNum = await tx.virtualNumber.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeAId,
            provider: 'TWILIO',
            phoneNumber: `+919999900001_${Date.now()}`,
          },
        });

        await tx.call.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeAId,
            virtualNumberId: vNum.id,
            provider: 'TWILIO',
            providerCallId: `call_p13_a_${Date.now()}`,
            direction: 'INBOUND',
            status: 'COMPLETED',
            startedAt: new Date('2026-09-20T10:30:00Z'),
            durationSeconds: 180,
            talkDurationSeconds: 150,
            callerNumberMasked: '+91 ******1234',
          },
        });

        // Seed GBP Aggregate for Tenant A
        await tx.gbpLocationAggregate.create({
          data: {
            tenantId: tenantAId,
            locationId: storeAId,
            averageRating: 4.8,
            totalReviewCount: 120,
          },
        });

        // Seed SEO Opportunity for Tenant A
        await tx.opportunity.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            identityHash: crypto.createHash('sha256').update(`opp-p13-${Date.now()}`).digest('hex'),
            ruleId: 'RULE_HIGH_IMPRESSIONS_LOW_CTR_V1',
            type: 'HIGH_IMPRESSIONS_LOW_CTR',
            priority: 'HIGH',
            priorityScore: 85,
            confidence: 'HIGH',
            actionType: 'UPDATE_METADATA',
            title: 'Improve Meta Description for Alpha Store',
            summary: 'High impressions with low click-through rate on store page.',
            status: 'OPEN',
          },
        });
      });

      // Create Tenant B (for Cross-Tenant RLS testing)
      await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
        await tx.tenant.create({
          data: {
            id: tenantBId,
            name: 'Tenant Beta (Phase 13)',
            slug: `tenant-beta-p13-${Date.now()}`,
            plan: 'ENTERPRISE',
            status: 'ACTIVE',
            timezone: 'UTC',
          },
        });

        await tx.brand.create({
          data: {
            id: brandBId,
            tenantId: tenantBId,
            name: 'Brand Beta',
            slug: 'brand-beta',
          },
        });

        await tx.location.create({
          data: {
            id: storeBId,
            tenantId: tenantBId,
            brandId: brandBId,
            name: 'Beta Uptown',
            addressLine1: '456 MG Road',
            city: 'Bangalore',
            state: 'KA',
            postalCode: '560001',
            country: 'IN',
          },
        });
      });
    });

    afterAll(async () => {
      // Clean up test data
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenantAId, tenantBId] } },
      });
    });

    it('generates cross-module ExecutiveReportDto with strict provenance and factual metrics', async () => {
      const mockContext: ClientReportContext = {
        tenant: { id: tenantAId, name: 'Tenant Alpha', slug: 'alpha', timezone: 'UTC' },
        brand: { id: brandAId, name: 'Brand Alpha', slug: 'brand-alpha' },
        authorizedContext: {
          userId: 'u1',
          tenantId: tenantAId,
          role: Role.CLIENT_OWNER,
          scopeMode: ScopeMode.ALL,
          grantedLocationIds: new Set([storeAId]),
          grantedBrandIds: new Set([brandAId]),
        },
        scope: 'BRAND',
        selectedWebSurface: { id: surfaceAId, name: 'Alpha LocalBi', type: 'LOCALBI', domains: [] },
        selectedStoreIds: [],
        availableStores: [{ id: storeAId, name: 'Alpha Downtown', city: 'Chennai', storeCode: null }],
        availableBrands: [{ id: brandAId, name: 'Brand Alpha', slug: 'brand-alpha' }],
        dateRange: { startDate: '2026-09-01', endDate: '2026-09-30', daysCount: 30, preset: '30d' },
        comparisonRange: { startDate: '2026-08-02', endDate: '2026-08-31', daysCount: 30, enabled: true, type: 'PREVIOUS_PERIOD', label: 'vs prior 30 days' },
        dataFreshness: { GA4: new Date().toISOString() },
      };

      const report = await ExecutiveReportingService.generateReport(mockContext);

      expect(report.tenantId).toBe(tenantAId);
      expect(report.brandId).toBe(brandAId);

      // Verify Website metrics (GA4 + GSC)
      expect(report.website.metrics.users.currentValue).toBe(500);
      expect(report.website.metrics.sessions.currentValue).toBe(650);
      expect(report.website.metrics.gscClicks.currentValue).toBe(150);
      expect(report.website.webSurfaceType).toBe('LOCALBI');

      // Verify Local Actions
      expect(report.localActions.metrics.calls.currentValue).toBe(1);

      // Verify Telephony calls
      expect(report.telephony.metrics.inboundCalls.currentValue).toBe(1);
      expect(report.telephony.metrics.answeredRate.currentValue).toBe(100);
      expect(report.telephony.recentCalls.length).toBe(1);
      expect(report.telephony.recentCalls[0]!.callerMasked).toBe('+91 ******1234');

      // Verify GBP
      expect(report.gbp.metrics.averageRating.currentValue).toBe(4.8);
      expect(report.gbp.metrics.totalReviews.currentValue).toBe(120);

      // Verify Opportunities
      expect(report.opportunities.metrics.highPriorityCount).toBe(1);
      expect(report.opportunities.topOpportunities[0]!.title).toBe('Improve Meta Description for Alpha Store');

      // Verify Cross-Module Store Intelligence Table
      expect(report.stores.length).toBe(1);
      expect(report.stores[0]!.storeName).toBe('Alpha Downtown');
      expect(report.stores[0]!.calls).toBe(1);
      expect(report.stores[0]!.rating).toBe(4.8);
    });

    it('creates an immutable ReportSnapshot and freezes data against subsequent mutations (Section 47 & 90)', async () => {
      const mockContext: ClientReportContext = {
        tenant: { id: tenantAId, name: 'Tenant Alpha', slug: 'alpha', timezone: 'UTC' },
        brand: { id: brandAId, name: 'Brand Alpha', slug: 'brand-alpha' },
        authorizedContext: {
          userId: 'u1',
          tenantId: tenantAId,
          role: Role.CLIENT_OWNER,
          scopeMode: ScopeMode.ALL,
          grantedLocationIds: new Set([storeAId]),
          grantedBrandIds: new Set([brandAId]),
        },
        scope: 'BRAND',
        selectedWebSurface: { id: surfaceAId, name: 'Alpha LocalBi', type: 'LOCALBI', domains: [] },
        selectedStoreIds: [],
        availableStores: [{ id: storeAId, name: 'Alpha Downtown', city: 'Chennai', storeCode: null }],
        availableBrands: [{ id: brandAId, name: 'Brand Alpha', slug: 'brand-alpha' }],
        dateRange: { startDate: '2026-09-01', endDate: '2026-09-30', daysCount: 30, preset: '30d' },
        comparisonRange: null,
        dataFreshness: {},
      };

      // 1. Create snapshot
      const { id: snapshotId } = await ExecutiveReportingService.createSnapshot(mockContext, 'September Executive Freeze');

      // 2. Add an additional call after snapshot was created
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        const vNum = await tx.virtualNumber.findFirst({ where: { tenantId: tenantAId } });
        await tx.call.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeAId,
            virtualNumberId: vNum!.id,
            provider: 'TWILIO',
            providerCallId: `call_p13_after_snap_${Date.now()}`,
            direction: 'INBOUND',
            status: 'COMPLETED',
            startedAt: new Date('2026-09-25T12:00:00Z'),
            durationSeconds: 100,
            talkDurationSeconds: 90,
          },
        });
      });

      // 3. Read snapshot payload
      const frozenReport = await ExecutiveReportingService.getSnapshot(tenantAId, snapshotId);
      // The snapshot MUST retain the original value (1 call), not 2 calls!
      expect(frozenReport.telephony.metrics.inboundCalls.currentValue).toBe(1);
    });

    it('enforces schedule idempotency key [tenantId, scheduleId, periodKey, recipient] (Section 58 & 91)', async () => {
      // 1. Create Report Schedule for Tenant A
      const schedule = await ReportScheduleService.createSchedule({
        tenantId: tenantAId,
        brandId: brandAId,
        name: 'Weekly Alpha Digest',
        frequency: 'WEEKLY',
        recipients: ['owner@alpha.com'],
        surfaceId: surfaceAId,
      });

      // 2. First Run: Should generate and mark SENT
      const run1 = await ReportScheduleService.executeScheduledRun(tenantAId, schedule.id);
      expect(run1.deliveries.length).toBe(1);
      expect(run1.deliveries[0]!.status).toBe('SENT');

      // 3. Second Run (Retry for same period): Should be SKIPPED due to idempotency protection
      const run2 = await ReportScheduleService.executeScheduledRun(tenantAId, schedule.id);
      expect(run2.deliveries.length).toBe(1);
      expect(run2.deliveries[0]!.status).toBe('SKIPPED');
      expect(run2.deliveries[0]!.reason).toContain('Idempotency protected');

      // 4. Verify only 1 delivery row exists in DB
      const deliveryCount = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.reportDelivery.count({
          where: {
            tenantId: tenantAId,
            scheduleId: schedule.id,
            periodKey: run1.periodKey,
          },
        });
      });
      expect(deliveryCount).toBe(1);
    });

    it('enforces PostgreSQL 16 dual-role RLS isolation: Tenant B cannot access Tenant A snapshots or schedules (Section 62 & 92)', async () => {
      // Create a snapshot under Tenant A
      const mockContext: ClientReportContext = {
        tenant: { id: tenantAId, name: 'Tenant Alpha', slug: 'alpha', timezone: 'UTC' },
        brand: { id: brandAId, name: 'Brand Alpha', slug: 'brand-alpha' },
        authorizedContext: {
          userId: 'u1',
          tenantId: tenantAId,
          role: Role.CLIENT_OWNER,
          scopeMode: ScopeMode.ALL,
          grantedLocationIds: new Set([storeAId]),
          grantedBrandIds: new Set([brandAId]),
        },
        scope: 'BRAND',
        selectedWebSurface: null,
        selectedStoreIds: [],
        availableStores: [],
        availableBrands: [],
        dateRange: { startDate: '2026-09-01', endDate: '2026-09-30', daysCount: 30, preset: '30d' },
        comparisonRange: null,
        dataFreshness: {},
      };

      const { id: snapAId } = await ExecutiveReportingService.createSnapshot(mockContext, 'Tenant A Confidential Snapshot');

      // Attempt to access Tenant A's snapshot while running in Tenant B's context
      await expect(
        ExecutiveReportingService.getSnapshot(tenantBId, snapAId)
      ).rejects.toThrow();

      // Verify direct query from Tenant B context returns 0 results
      const tenantBSnapshots = await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
        return tx.reportSnapshot.findMany();
      });
      expect(tenantBSnapshots.length).toBe(0);

      const tenantBSchedules = await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
        return tx.reportSchedule.findMany();
      });
      expect(tenantBSchedules.length).toBe(0);
    });

    it('enforces cross-brand isolation: Brand A report cannot contain Brand B stores (Section 64 & 93)', async () => {
      const mockContext: ClientReportContext = {
        tenant: { id: tenantAId, name: 'Tenant Alpha', slug: 'alpha', timezone: 'UTC' },
        brand: { id: brandAId, name: 'Brand Alpha', slug: 'brand-alpha' },
        authorizedContext: {
          userId: 'u1',
          tenantId: tenantAId,
          role: Role.CLIENT_OWNER,
          scopeMode: ScopeMode.ALL,
          grantedLocationIds: new Set([storeAId]),
          grantedBrandIds: new Set([brandAId]),
        },
        scope: 'BRAND',
        selectedWebSurface: null,
        selectedStoreIds: [],
        availableStores: [{ id: storeAId, name: 'Alpha Downtown', city: 'Chennai', storeCode: null }],
        availableBrands: [{ id: brandAId, name: 'Brand Alpha', slug: 'brand-alpha' }],
        dateRange: { startDate: '2026-09-01', endDate: '2026-09-30', daysCount: 30, preset: '30d' },
        comparisonRange: null,
        dataFreshness: {},
      };

      const report = await ExecutiveReportingService.generateReport(mockContext);
      const storeIdsInReport = report.stores.map((s) => s.storeId);

      expect(storeIdsInReport).toContain(storeAId);
      expect(storeIdsInReport).not.toContain(storeBId);
    });
  });
});
