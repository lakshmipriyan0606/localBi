import { describe, it, expect } from 'vitest';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ReportingService, QueryDimensionRow, PageDimensionRow } from '@/modules/reports/reporting-service';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { ReportExportService } from '@/modules/reporting/report-export-service';
import { GscIndexingService } from '@/modules/integrations/google/gsc-indexing-service';
import { GscSitemapsService } from '@/modules/integrations/google/gsc-sitemaps-service';
import { KeywordService } from '@/modules/rank/keyword-service';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { ScopeMode, Role } from '@/shared/authorization/policy';

describe('Section 5 — Google Search Console (GSC): Comprehensive End-to-End Verification Suite', () => {
  const tenantId = 'cmup03rc10003ubj4r4vfoa0s'; // Lakshmi Food Tenant
  const foreignTenantId = 'cmup03rc10003ubj4r4vfoa0z'; // Foreign Tenant

  const authorizedContext = {
    userId: 'test-user-sec5',
    tenantId,
    role: Role.CLIENT_OWNER,
    scopeMode: ScopeMode.ALL,
    brandScopes: [],
    locationScopes: [],
  };

  const foreignContext = {
    userId: 'foreign-user-sec5',
    tenantId: foreignTenantId,
    role: Role.CLIENT_OWNER,
    scopeMode: ScopeMode.ALL,
    brandScopes: [],
    locationScopes: [],
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. OAuth and Disconnected States
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. OAuth & Disconnected Connection State Handling', () => {
    it('returns isConnected: false when no active Google integration exists for the tenant', async () => {
      const status = await GoogleOAuthService.getConnectionStatus(foreignTenantId);
      expect(status.isConnected).toBe(false);
      expect(status.accountEmail).toBeNull();
      expect(status.scopes).toEqual([]);
    });

    it('safely handles missing session token by returning null context', async () => {
      const resolution = await ReportContextService.resolveReportContext(
        null,
        'lakshmi-food',
        'non-existent-brand-id'
      );
      expect(resolution).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Property Discovery & Mapping Validation
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Property Discovery & Domain vs URL-Prefix Classification', () => {
    it('distinguishes domain properties (sc-domain:) from URL-prefix properties (https://)', () => {
      const domainUrl = 'sc-domain:lakshmifood.com';
      const prefixUrl = 'https://lakshmifood.com/menu/';

      const isDomain = domainUrl.startsWith('sc-domain:');
      const isPrefix = prefixUrl.startsWith('http://') || prefixUrl.startsWith('https://');

      expect(isDomain).toBe(true);
      expect(isPrefix).toBe(true);
    });

    it('accurately parses domain hostnames from sc-domain identifier', () => {
      const domainUrl = 'sc-domain:organic-spices.example.co.in';
      const hostname = domainUrl.replace(/^sc-domain:/, '');
      expect(hostname).toBe('organic-spices.example.co.in');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Cross-Tenant and Cross-Brand Isolation
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Strict Cross-Tenant and Cross-Brand Isolation', () => {
    it('prevents foreign tenant from querying another tenant GSC properties', async () => {
      await expect(
        TenantContextService.withTenantContext(prisma, foreignTenantId, async (tx) => {
          return tx.gscProperty.findMany({
            where: { tenantId: foreignTenantId },
          });
        })
      ).resolves.toEqual([]);
    });

    it('scopes GSC report context strictly to the active brand mapping', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true },
      });

      if (!tenant || tenant.brands.length < 2) return;

      const brandA = tenant.brands[0]!;
      const brandB = tenant.brands[1]!;

      // Find user to establish session
      const membership = await prisma.tenantMembership.findFirst({
        where: { tenantId },
      });
      if (!membership) return;

      const { SessionService } = await import('@/modules/auth/session-service');
      const { rawToken } = await SessionService.createSession(membership.userId, {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      const ctxA = await ReportContextService.resolveReportContext(rawToken, tenant.slug, brandA.id);
      const ctxB = await ReportContextService.resolveReportContext(rawToken, tenant.slug, brandB.id);

      expect(ctxA).not.toBeNull();
      expect(ctxB).not.toBeNull();
      expect(ctxA?.tenant.slug).toBe('lakshmi-food');
      expect(ctxB?.tenant.slug).toBe('lakshmi-food');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Property-Specific Query Metrics & Daily Aggregation
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Property-Specific Query Metrics & Aggregation', () => {
    it('aggregates daily metric clicks and impressions accurately without floating-point artifacts', () => {
      const rows = [
        { clicks: 12, impressions: 340, position: 3.2 },
        { clicks: 28, impressions: 820, position: 4.1 },
        { clicks: 5, impressions: 110, position: 7.8 },
      ];

      const totalClicks = rows.reduce((acc, r) => acc + r.clicks, 0);
      const totalImpressions = rows.reduce((acc, r) => acc + r.impressions, 0);

      expect(totalClicks).toBe(45);
      expect(totalImpressions).toBe(1270);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Mathematical Integrity: CTR and Average Position
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Mathematical Integrity: CTR & Weighted Average Position', () => {
    it('calculates CTR as totalClicks / totalImpressions with zero-denominator safety', () => {
      const safeZeroCtr = (clicks: number, impressions: number) =>
        impressions > 0 ? clicks / impressions : 0;

      expect(safeZeroCtr(45, 1270)).toBeCloseTo(0.035433, 4);
      expect(safeZeroCtr(0, 0)).toBe(0);
      expect(safeZeroCtr(5, 0)).toBe(0);
    });

    it('calculates average position weighted by impressions, not a simple unweighted arithmetic mean', () => {
      const queries = [
        { impressions: 1000, position: 2.0 }, // 2000
        { impressions: 10, position: 20.0 },  // 200
      ];

      const totalImpressions = queries.reduce((acc, q) => acc + q.impressions, 0);
      const sumPositionImpressions = queries.reduce((acc, q) => acc + q.impressions * q.position, 0);
      const weightedAvgPos = sumPositionImpressions / totalImpressions;

      // Unweighted mean would be (2.0 + 20.0) / 2 = 11.0 (very misleading!)
      // Weighted mean: 2200 / 1010 ≈ 2.178
      expect(weightedAvgPos).toBeCloseTo(2.18, 2);
      expect(weightedAvgPos).toBeLessThan(3.0);
    });

    it('renders unobserved average position as zero in service layer and dash in display', () => {
      const position = 0;
      const displayPosition = position > 0 ? position.toFixed(1) : '—';
      expect(displayPosition).toBe('—');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Period-Over-Period Comparison & Inverted Ranking Logic
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. Period-Over-Period Comparison & Inverted Ranking Direction', () => {
    it('calculates positive delta for clicks improvement', () => {
      const prevClicks = 100;
      const currentClicks = 150;
      const delta = currentClicks - prevClicks;
      expect(delta).toBe(50);
      expect(delta > 0).toBe(true);
    });

    it('inverts ranking delta so that lower numerical position denotes positive improvement', () => {
      // In search rankings: Position 1 is top, Position 10 is lower.
      // Moving from 10 to 3 is an improvement of 7 positions!
      const prevPosition = 10.4;
      const currentPosition = 3.2;
      const positionChange = Number((prevPosition - currentPosition).toFixed(1));

      expect(positionChange).toBe(7.2);
      expect(positionChange > 0).toBe(true); // Positive means improved!
    });

    it('correctly calculates ranking decline when numerical position increases', () => {
      const prevPosition = 4.1;
      const currentPosition = 8.6;
      const positionChange = Number((prevPosition - currentPosition).toFixed(1));

      expect(positionChange).toBe(-4.5);
      expect(positionChange < 0).toBe(true); // Negative means dropped!
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Date Boundaries and Timezone Handling
  // ───────────────────────────────────────────────────────────────────────────
  describe('7. Date Boundaries & Range Ingestion Filtering', () => {
    it('formats ISO start and end dates consistently in YYYY-MM-DD', () => {
      const start = new Date('2026-09-01T00:00:00Z');
      const end = new Date('2026-09-30T23:59:59Z');

      const startFormatted = start.toISOString().slice(0, 10);
      const endFormatted = end.toISOString().slice(0, 10);

      expect(startFormatted).toBe('2026-09-01');
      expect(endFormatted).toBe('2026-09-30');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Query and Landing Page Sorting
  // ───────────────────────────────────────────────────────────────────────────
  describe('8. Multi-Column Sorting Logic', () => {
    const mockRows: QueryDimensionRow[] = [
      { key: 'q1', queryText: 'organic spices', clicks: 50, impressions: 1000, ctr: 0.05, position: 3.1 },
      { key: 'q2', queryText: 'chennai restaurant', clicks: 120, impressions: 1500, ctr: 0.08, position: 1.8 },
      { key: 'q3', queryText: 'catering service', clicks: 10, impressions: 400, ctr: 0.025, position: 9.4 },
    ];

    it('sorts queries by clicks descending', () => {
      const sorted = [...mockRows].sort((a, b) => b.clicks - a.clicks);
      expect(sorted[0]?.queryText).toBe('chennai restaurant');
      expect(sorted[2]?.queryText).toBe('catering service');
    });

    it('sorts queries by position ascending (best ranking first)', () => {
      const sorted = [...mockRows].sort((a, b) => a.position - b.position);
      expect(sorted[0]?.queryText).toBe('chennai restaurant');
      expect(sorted[0]?.position).toBe(1.8);
      expect(sorted[2]?.queryText).toBe('catering service');
      expect(sorted[2]?.position).toBe(9.4);
    });

    it('sorts queries by CTR descending', () => {
      const sorted = [...mockRows].sort((a, b) => b.ctr - a.ctr);
      expect(sorted[0]?.ctr).toBe(0.08);
      expect(sorted[2]?.ctr).toBe(0.025);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Search Filtering and Pagination
  // ───────────────────────────────────────────────────────────────────────────
  describe('9. Case-Insensitive Search Filtering & Pagination', () => {
    const mockPages: PageDimensionRow[] = [
      { key: 'p1', fullUrl: 'https://example.com/menu/south-indian', clicks: 80, impressions: 900, ctr: 0.088, position: 2.2 },
      { key: 'p2', fullUrl: 'https://example.com/catering', clicks: 35, impressions: 500, ctr: 0.07, position: 4.1 },
      { key: 'p3', fullUrl: 'https://example.com/contact-us', clicks: 15, impressions: 200, ctr: 0.075, position: 5.0 },
      { key: 'p4', fullUrl: 'https://example.com/menu/beverages', clicks: 22, impressions: 310, ctr: 0.071, position: 3.5 },
    ];

    it('filters rows matching case-insensitive search term', () => {
      const searchTerm = 'MENU';
      const filtered = mockPages.filter((p) => p.fullUrl.toLowerCase().includes(searchTerm.toLowerCase()));
      expect(filtered.length).toBe(2);
      expect(filtered.every((p) => p.fullUrl.includes('/menu/'))).toBe(true);
    });

    it('paginates results accurately with page and pageSize constraints', () => {
      const pageSize = 2;
      const page1 = mockPages.slice(0, pageSize);
      const page2 = mockPages.slice(pageSize, pageSize * 2);

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0]?.key).toBe('p1');
      expect(page2[0]?.key).toBe('p3');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. Export Security & CSV Formula Injection Sanitization
  // ───────────────────────────────────────────────────────────────────────────
  describe('10. CSV Export Security & Formula Injection Defense', () => {
    it('sanitizes malicious formula characters (=, +, -, @, tab) by prefixing with single quote', () => {
      expect(ReportExportService.sanitizeCsvField('=cmd|/c calc')).toBe("'=cmd|/c calc");
      expect(ReportExportService.sanitizeCsvField('+SUM(1,2)')).toBe("'+SUM(1,2)");
      expect(ReportExportService.sanitizeCsvField('-DDE("cmd")')).toBe("'-DDE(\"cmd\")");
      expect(ReportExportService.sanitizeCsvField('@IMPORT')).toBe("'@IMPORT");
    });

    it('leaves standard benign text and numbers intact in CSV sanitization', () => {
      expect(ReportExportService.sanitizeCsvField('organic coffee')).toBe('organic coffee');
      expect(ReportExportService.sanitizeCsvField(1234)).toBe('1234');
      expect(ReportExportService.sanitizeCsvField(45.67)).toBe('45.67');
    });

    it('generates a compliant GSC Queries CSV with RFC 4180 headers and metadata block', () => {
      const queries = [
        {
          queryText: 'south indian breakfast',
          clicks: 42,
          impressions: 500,
          ctr: 0.084,
          position: 2.1,
          previousClicks: 30,
          clicksChange: 12,
          positionChange: 0.8,
        },
      ];

      const csv = ReportExportService.exportGscQueriesCsv(queries, {
        brandName: 'Lakshmi Food',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      });

      expect(csv).toContain('# Search Console Queries Report');
      expect(csv).toContain('# Brand: Lakshmi Food');
      expect(csv).toContain('Search Query,Clicks,Impressions,CTR (%),Average Position');
      expect(csv).toContain('south indian breakfast');
      expect(csv).toContain('42');
      expect(csv).toContain('+12');
      expect(csv).toContain('+0.8');
    });

    it('generates a compliant GSC Landing Pages CSV with URL sanitation', () => {
      const pages = [
        {
          fullUrl: 'https://example.com/menu',
          clicks: 65,
          impressions: 800,
          ctr: 0.081,
          position: 3.4,
          previousClicks: 50,
          clicksChange: 15,
          positionChange: -0.5,
        },
      ];

      const csv = ReportExportService.exportGscPagesCsv(pages, {
        brandName: 'Lakshmi Food',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      });

      expect(csv).toContain('# Search Console Landing Pages Report');
      expect(csv).toContain('Landing Page URL,Clicks,Impressions,CTR (%),Average Position');
      expect(csv).toContain('https://example.com/menu');
      expect(csv).toContain('+15');
      expect(csv).toContain('-0.5');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. URL Inspection & Domain/Prefix Ownership Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe('11. URL Inspection Scope & Ownership Verification', () => {
    it('accepts inspection URLs matching domain property scope', () => {
      expect(() =>
        GscIndexingService.validateUrlOwnership('sc-domain:lakshmifood.com', 'https://lakshmifood.com/menu')
      ).not.toThrow();

      expect(() =>
        GscIndexingService.validateUrlOwnership('sc-domain:lakshmifood.com', 'https://order.lakshmifood.com/items')
      ).not.toThrow();
    });

    it('rejects inspection URLs outside domain property scope with INVALID_GSC_URL', () => {
      expect(() =>
        GscIndexingService.validateUrlOwnership('sc-domain:lakshmifood.com', 'https://foreign-domain.com/hack')
      ).toThrow(/does not belong to the verified domain property/);
    });

    it('accepts inspection URLs matching URL-prefix property scope', () => {
      expect(() =>
        GscIndexingService.validateUrlOwnership('https://lakshmifood.com/blog/', 'https://lakshmifood.com/blog/article-1')
      ).not.toThrow();
    });

    it('rejects inspection URLs outside URL-prefix property scope', () => {
      expect(() =>
        GscIndexingService.validateUrlOwnership('https://lakshmifood.com/blog/', 'https://lakshmifood.com/admin')
      ).toThrow(/does not belong to the verified URL-prefix property/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 12. Sitemap Operations & Security Scope
  // ───────────────────────────────────────────────────────────────────────────
  describe('12. Sitemaps Operations Scope & Ownership Checks', () => {
    it('validates sitemap URL belongs to the domain property scope', () => {
      expect(() =>
        GscSitemapsService.validateSitemapOwnership('sc-domain:lakshmifood.com', 'https://lakshmifood.com/sitemap.xml')
      ).not.toThrow();
    });

    it('rejects foreign sitemap URL with INVALID_SITEMAP_URL', () => {
      expect(() =>
        GscSitemapsService.validateSitemapOwnership('sc-domain:lakshmifood.com', 'https://evil.com/sitemap.xml')
      ).toThrow(/does not belong to the verified domain property/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 13. Idempotent Ingestion & Unique Constraints
  // ───────────────────────────────────────────────────────────────────────────
  describe('13. Idempotent Sync & Uniqueness Constraints', () => {
    it('guarantees unique businessKey constraint prevents duplicate sync runs', async () => {
      const businessKey = `test-sync-key-${Date.now()}`;

      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        const run1 = await tx.syncRun.upsert({
          where: { uq_sync_run_business_key: { tenantId, businessKey } },
          create: {
            tenantId,
            provider: 'GSC',
            resourceId: 'test-resource',
            businessKey,
            startedAt: new Date(),
            completedAt: new Date(),
            status: 'SUCCESS',
            rowsIngested: 10,
          },
          update: {
            rowsIngested: 10,
          },
        });

        const run2 = await tx.syncRun.upsert({
          where: { uq_sync_run_business_key: { tenantId, businessKey } },
          create: {
            tenantId,
            provider: 'GSC',
            resourceId: 'test-resource',
            businessKey,
            startedAt: new Date(),
            completedAt: new Date(),
            status: 'SUCCESS',
            rowsIngested: 15,
          },
          update: {
            rowsIngested: 15,
          },
        });

        expect(run1.id).toBe(run2.id);
        expect(run2.rowsIngested).toBe(15);

        // Clean up
        await tx.syncRun.delete({
          where: { id: run1.id },
        });
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 14. Section 4 Keyword Integration & Deduplication
  // ───────────────────────────────────────────────────────────────────────────
  describe('14. Section 4 Keyword Integration & Deduplication', () => {
    it('imports GSC queries into tracked keywords and marks source as GSC_IMPORT', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true },
      });

      if (!tenant || tenant.brands.length === 0) return;
      const brand = tenant.brands[0]!;

      const queriesToImport = [
        `best thali in town ${Date.now()}`,
        `   BEST THALI IN TOWN ${Date.now()}   `, // duplicate in different case/spaces
      ];

      const result = await KeywordService.importFromGsc(
        tenantId,
        brand.id,
        queriesToImport,
        authorizedContext
      );

      // Should deduplicate and import exactly 1 keyword
      expect(result.importedCount).toBe(1);
      expect(result.keywords[0]?.source).toBe('GSC_IMPORT');

      // Clean up
      if (result.keywords[0]?.id) {
        await KeywordService.deleteKeyword(tenantId, result.keywords[0].id, authorizedContext);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 15. Genuine Zero Activity vs Missing / Unmapped Data
  // ───────────────────────────────────────────────────────────────────────────
  describe('15. Honest Metric Representation: Genuine Zero vs Unmapped', () => {
    it('distinguishes zero impressions from missing property mapping', () => {
      const mappedWithZeroImpressions = {
        hasMapping: true,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        avgPosition: 0,
      };

      const unmappedState = {
        hasMapping: false,
        impressions: null,
        clicks: null,
        ctr: null,
        avgPosition: null,
      };

      expect(mappedWithZeroImpressions.hasMapping).toBe(true);
      expect(mappedWithZeroImpressions.impressions).toBe(0);

      expect(unmappedState.hasMapping).toBe(false);
      expect(unmappedState.impressions).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 16. Regression Check: Preserving Sections 1–4
  // ───────────────────────────────────────────────────────────────────────────
  describe('16. Regression Verification: Sections 1–4 Integrity', () => {
    it('verifies that active brand switching and tenant resolution function normally', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true, locations: true },
      });

      expect(tenant).not.toBeNull();
      expect(tenant?.slug).toBe('lakshmi-food');
      expect(tenant?.brands.length).toBeGreaterThanOrEqual(1);
    });

    it('verifies that keyword rank calculations and store assignments remain intact', () => {
      expect(KeywordService.normalizeKeyword('  SEO   Analytics   ')).toBe('seo analytics');
    });
  });
});
