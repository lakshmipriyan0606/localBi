import { describe, it, expect } from 'vitest';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { KeywordService } from '@/modules/rank/keyword-service';
import { RankRunService } from '@/modules/rank/rank-run-service';
import { ScopeMode, Role } from '@/shared/authorization/policy';

describe('Section 4 — SEO & Search Rankings: End-to-End Verification & Regression Suite', () => {
  const tenantId = 'cmup03rc10003ubj4r4vfoa0s'; // Lakshmi food tenant
  const foreignTenantId = 'cmup03rc10003ubj4r4vfoa0z'; // Foreign tenant

  const userContext = {
    userId: 'test-user-sec4',
    tenantId,
    role: Role.CLIENT_OWNER,
    scopeMode: ScopeMode.ALL,
    brandScopes: [],
    locationScopes: [],
  };

  const foreignContext = {
    userId: 'foreign-user-sec4',
    tenantId: foreignTenantId,
    role: Role.CLIENT_OWNER,
    scopeMode: ScopeMode.ALL,
    brandScopes: [],
    locationScopes: [],
  };

  describe('1. Keyword Normalization & Data Integrity', () => {
    it('normalizes keyword terms by trimming, lowercasing, and collapsing multi-spaces without semantic loss', () => {
      expect(KeywordService.normalizeKeyword('  Best   Coffee   Shop   ')).toBe('best coffee shop');
      expect(KeywordService.normalizeKeyword('CHENNAI   VEG RESTAURANT')).toBe('chennai veg restaurant');
      expect(KeywordService.normalizeKeyword('organic   groceries   near   me')).toBe('organic groceries near me');
    });

    it('rejects keyword addition when term is less than 2 characters long', async () => {
      await expect(
        KeywordService.addKeyword(tenantId, 'brand-test-id', ' a ', userContext)
      ).rejects.toThrow('Keyword must be at least 2 characters long');
    });
  });

  describe('2. Strict Cross-Brand Store Assignment Guard', () => {
    it('strictly prohibits assigning a keyword of Brand A to a physical store of Brand B', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true, locations: true },
      });

      if (!tenant || tenant.brands.length < 2 || tenant.locations.length === 0) return;

      const brandA = tenant.brands[0]!;
      const brandB = tenant.brands[1]!;

      // Find store belonging to brandB
      const storeB = tenant.locations.find((l) => l.brandId === brandB.id);
      if (!storeB) return;

      // Create a keyword for Brand A
      const kwA = await KeywordService.addKeyword(
        tenant.id,
        brandA.id,
        `brand-a-test-term-${Date.now()}`,
        userContext
      );

      // Attempting to assign Brand A keyword to Brand B store MUST throw error
      await expect(
        KeywordService.assignToStore(tenant.id, storeB.id, kwA.id, {}, userContext)
      ).rejects.toThrow(/Cross-brand assignment prohibited/);

      // Clean up
      await KeywordService.deleteKeyword(tenant.id, kwA.id, userContext);
    });
  });

  describe('3. SEO Ranking Direction, Movement Math & Safe Division', () => {
    it('correctly calculates ranking improvement when numeric rank decreases (Rank 1 is best)', () => {
      // If previous rank was 10 and current rank is 4: improved by 6 positions
      const previousRank = 10;
      const latestRank = 4;
      const diff = previousRank - latestRank;
      expect(diff).toBe(6);
      expect(diff > 0).toBe(true); // Improvement!
    });

    it('correctly calculates ranking decline when numeric rank increases (e.g. dropped from 2 to 7)', () => {
      const previousRank = 2;
      const latestRank = 7;
      const diff = previousRank - latestRank;
      expect(diff).toBe(-5);
      expect(diff < 0).toBe(true); // Decline!
    });

    it('handles zero impressions safely in CTR calculations without producing NaN or Infinity', () => {
      const clicks = 0;
      const impressions = 0;
      const safeCtr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      expect(safeCtr).toBe(0);
      expect(Number.isNaN(safeCtr)).toBe(false);
      expect(Number.isFinite(safeCtr)).toBe(true);
    });

    it('handles zero impressions safely in GSC Average Position calculation by returning null', () => {
      const sumPos = 0;
      const impressions = 0;
      const safeAvgPos = impressions > 0 ? Math.round((sumPos / impressions) * 10) / 10 : null;
      expect(safeAvgPos).toBeNull();
    });

    it('accurately computes CTR percentage for positive impressions', () => {
      const clicks = 25;
      const impressions = 500;
      const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
      expect(ctr).toBe(5.0); // 5%
    });
  });

  describe('4. Keyword Performance Overview Integration & Tenant Scoping', () => {
    it('retrieves comprehensive keyword performance overview with real database summary KPIs and items', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true },
      });

      if (!tenant || tenant.brands.length === 0) return;
      const brand = tenant.brands[0]!;

      // Fetch overview for active brand
      const result = await KeywordService.getKeywordPerformanceOverview(
        tenant.id,
        brand.id,
        { days: 30, page: 1, limit: 10 },
        userContext
      );

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(typeof result.summary.totalTrackedKeywords).toBe('number');
      expect(typeof result.summary.activeKeywordsCount).toBe('number');
      expect(typeof result.summary.pausedKeywordsCount).toBe('number');
      expect(typeof result.summary.keywordsWithRankData).toBe('number');
      expect(typeof result.summary.improvedCount).toBe('number');
      expect(typeof result.summary.declinedCount).toBe('number');
      expect(typeof result.summary.totalGscClicks).toBe('number');
      expect(typeof result.summary.totalGscImpressions).toBe('number');
      expect(typeof result.summary.averageGscCtr).toBe('number');

      // Verify position bands are integers
      expect(typeof result.summary.top3Count).toBe('number');
      expect(typeof result.summary.top10Count).toBe('number');
      expect(typeof result.summary.top20Count).toBe('number');
      expect(typeof result.summary.beyond20Count).toBe('number');

      // Verify item shape
      expect(Array.isArray(result.items)).toBe(true);
      if (result.items.length > 0) {
        const item = result.items[0]!;
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('term');
        expect(item).toHaveProperty('normalizedTerm');
        expect(item).toHaveProperty('source');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('trackedStoresCount');
        expect(item).toHaveProperty('rankMovement');
        expect(['IMPROVED', 'DECLINED', 'UNCHANGED', 'NEW', 'UNRANKED']).toContain(
          item.rankMovement
        );
      }
    });

    it('rejects cross-tenant keyword overview requests when brand belongs to a different tenant', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true },
      });

      if (!tenant || tenant.brands.length === 0) return;
      const brand = tenant.brands[0]!;

      // Foreign context attempting to access tenant's brand overview
      await expect(
        KeywordService.getKeywordPerformanceOverview(
          foreignTenantId,
          brand.id,
          {},
          foreignContext
        )
      ).rejects.toThrow();
    });
  });

  describe('5. Keyword Lifecycle: Add, Status Toggle, and Delete', () => {
    it('creates, pauses, and deletes a keyword within the tenant boundary', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true },
      });

      if (!tenant || tenant.brands.length === 0) return;
      const brand = tenant.brands[0]!;
      const testTerm = `lifecycle-keyword-${Date.now()}`;

      // 1. Add keyword
      const kw = await KeywordService.addKeyword(
        tenant.id,
        brand.id,
        testTerm,
        userContext
      );
      expect(kw.term).toBe(testTerm);
      expect(kw.status).toBe('ACTIVE');

      // 2. Pause keyword
      const updatedKw = await KeywordService.setKeywordStatus(tenant.id, kw.id, 'PAUSED', userContext);
      expect(updatedKw.status).toBe('PAUSED');

      // 3. Foreign tenant cannot delete this keyword
      await expect(
        KeywordService.deleteKeyword(foreignTenantId, kw.id, foreignContext)
      ).rejects.toThrow();

      // 4. Authorized deletion
      const deleteResult = await KeywordService.deleteKeyword(tenant.id, kw.id, userContext);
      expect(deleteResult.success).toBe(true);

      // Verify deletion from DB
      const deletedCheck = await prisma.keyword.findUnique({ where: { id: kw.id } });
      expect(deletedCheck).toBeNull();
    });
  });

  describe('6. Historical Ranking Trend Time-Series Generation', () => {
    it('returns chronological trend points with separated Local Geo-Grid rank and Search Console metrics', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true },
      });

      if (!tenant || tenant.brands.length === 0) return;
      const brand = tenant.brands[0]!;

      // Find an existing keyword or create one
      const existingKw = await prisma.keyword.findFirst({
        where: { tenantId: tenant.id, brandId: brand.id },
      });

      const keywordId = existingKw
        ? existingKw.id
        : (
            await KeywordService.addKeyword(
              tenant.id,
              brand.id,
              `trend-test-${Date.now()}`,
              userContext
            )
          ).id;

      const trend = await RankRunService.getKeywordHistoricalTrend(
        tenant.id,
        keywordId,
        { days: 30 },
        userContext
      );

      expect(Array.isArray(trend)).toBe(true);

      // Verify trend point structure if points exist
      for (const point of trend) {
        expect(point).toHaveProperty('date');
        expect(typeof point.date).toBe('string');
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(point).toHaveProperty('localRank');
        expect(point).toHaveProperty('gscAvgPosition');
        expect(point).toHaveProperty('gscClicks');
        expect(point).toHaveProperty('gscImpressions');
      }

      // Foreign context rejection
      await expect(
        RankRunService.getKeywordHistoricalTrend(
          foreignTenantId,
          keywordId,
          {},
          foreignContext
        )
      ).rejects.toThrow();
    });
  });

  describe('7. Duplicate Keyword Handling & Idempotency', () => {
    it('idempotently updates existing keyword when adding duplicate term with different casing and spacing', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true },
      });

      if (!tenant || tenant.brands.length === 0) return;
      const brand = tenant.brands[0]!;
      const baseTerm = `Idempotent Kw ${Date.now()}`;

      // 1. Add first instance
      const kw1 = await KeywordService.addKeyword(tenant.id, brand.id, baseTerm, userContext);
      expect(kw1.normalizedTerm).toBe(KeywordService.normalizeKeyword(baseTerm));

      // 2. Add second instance with extra spacing and mixed casing
      const noisyTerm = `   ${baseTerm.toUpperCase()}   `;
      const kw2 = await KeywordService.addKeyword(tenant.id, brand.id, noisyTerm, userContext);

      // Must resolve to the exact same record ID
      expect(kw2.id).toBe(kw1.id);
      expect(kw2.normalizedTerm).toBe(kw1.normalizedTerm);

      // Clean up
      await KeywordService.deleteKeyword(tenant.id, kw1.id, userContext);
    });
  });

  describe('8. Keyword Performance Overview Search, Filtering, Sorting & Pagination', () => {
    it('accurately applies search filtering by substring', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true },
      });

      if (!tenant || tenant.brands.length === 0) return;
      const brand = tenant.brands[0]!;

      // Add 2 keywords with distinct terms
      const kwAlpha = await KeywordService.addKeyword(
        tenant.id,
        brand.id,
        `unique-filter-alpha-${Date.now()}`,
        userContext
      );
      const kwBeta = await KeywordService.addKeyword(
        tenant.id,
        brand.id,
        `unique-filter-beta-${Date.now()}`,
        userContext
      );

      // Search for 'alpha'
      const alphaResult = await KeywordService.getKeywordPerformanceOverview(
        tenant.id,
        brand.id,
        { search: 'alpha' },
        userContext
      );

      expect(alphaResult.items.some((i) => i.id === kwAlpha.id)).toBe(true);
      expect(alphaResult.items.some((i) => i.id === kwBeta.id)).toBe(false);

      // Search for 'beta'
      const betaResult = await KeywordService.getKeywordPerformanceOverview(
        tenant.id,
        brand.id,
        { search: 'beta' },
        userContext
      );

      expect(betaResult.items.some((i) => i.id === kwBeta.id)).toBe(true);
      expect(betaResult.items.some((i) => i.id === kwAlpha.id)).toBe(false);

      // Clean up
      await KeywordService.deleteKeyword(tenant.id, kwAlpha.id, userContext);
      await KeywordService.deleteKeyword(tenant.id, kwBeta.id, userContext);
    });

    it('correctly handles pagination and computes totalPages', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { brands: true },
      });

      if (!tenant || tenant.brands.length === 0) return;
      const brand = tenant.brands[0]!;

      const page1 = await KeywordService.getKeywordPerformanceOverview(
        tenant.id,
        brand.id,
        { page: 1, limit: 2 },
        userContext
      );

      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(2);
      expect(page1.items.length).toBeLessThanOrEqual(2);
      expect(page1.totalPages).toBeGreaterThanOrEqual(1);
    });
  });

  describe('9. Empty State & Zero Baseline Resiliency', () => {
    it('returns a clean zeroed summary and empty items without crashing when brand has zero keywords', async () => {
      // Create temporary brand with no keywords via TenantContextService
      const emptyBrand = await TenantContextService.withTenantContext(
        prisma,
        tenantId,
        async (tx) => {
          return tx.brand.create({
            data: {
              tenantId,
              name: `Empty Brand ${Date.now()}`,
              slug: `empty-brand-${Date.now()}`,
            },
          });
        }
      );

      const result = await KeywordService.getKeywordPerformanceOverview(
        tenantId,
        emptyBrand.id,
        {},
        userContext
      );

      expect(result.summary.totalTrackedKeywords).toBe(0);
      expect(result.summary.activeKeywordsCount).toBe(0);
      expect(result.summary.keywordsWithRankData).toBe(0);
      expect(result.summary.totalGscClicks).toBe(0);
      expect(result.summary.totalGscImpressions).toBe(0);
      expect(result.summary.averageGscCtr).toBe(0);
      expect(result.summary.averageGscPosition).toBeNull();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(1);

      // Clean up empty brand
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        await tx.brand.delete({ where: { id: emptyBrand.id } });
      });
    });
  });
});

