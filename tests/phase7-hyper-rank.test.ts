import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '../src/shared/database/client';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role, ScopeMode, AuthorizedContext } from '../src/shared/authorization/policy';
import { GeoGridService } from '../src/modules/rank/geo-grid-service';
import { KeywordService } from '../src/modules/rank/keyword-service';
import { CompetitorService } from '../src/modules/rank/competitor-service';
import { RankRunService } from '../src/modules/rank/rank-run-service';
import { RankProviderRegistry, TestRankProviderAdapter } from '../src/modules/rank/rank-provider';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';

describe('Phase 7: Hyper Rank / Local Search Visibility Engine Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let brandAId: string;
  let brandBId: string;
  let storeA1Id: string;
  let storeA2NoCoordsId: string;
  let storeB1Id: string;
  let userAId: string;
  let userBId: string;
  let adminContextA: AuthorizedContext;
  let adminContextB: AuthorizedContext;
  let testAdapter: TestRankProviderAdapter;

  beforeAll(async () => {
    // 0. Register Test Rank Provider
    testAdapter = new TestRankProviderAdapter();
    RankProviderRegistry.setProvider(testAdapter);

    const idSuffix = crypto.randomBytes(4).toString('hex');

    // 1. Setup Tenant A
    const userA = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-a-rank-${idSuffix}@example.com`),
        fullName: 'Tenant A Rank Admin',
        status: 'ACTIVE',
      },
    });
    userAId = userA.id;

    const tenantA = await prisma.tenant.create({
      data: {
        name: `Tenant A Rank ${idSuffix}`,
        slug: `tenant-a-rank-${idSuffix}`,
        timezone: 'Asia/Kolkata',
      },
    });
    tenantAId = tenantA.id;

    adminContextA = {
      userId: userA.id,
      tenantId: tenantAId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    // 2. Setup Tenant B
    const userB = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-b-rank-${idSuffix}@example.com`),
        fullName: 'Tenant B Rank Admin',
        status: 'ACTIVE',
      },
    });
    userBId = userB.id;

    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B Rank ${idSuffix}`,
        slug: `tenant-b-rank-${idSuffix}`,
        timezone: 'Asia/Kolkata',
      },
    });
    tenantBId = tenantB.id;

    adminContextB = {
      userId: userB.id,
      tenantId: tenantBId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    // 3. Create Brands and Stores for Tenant A
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const brandA = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: 'Apex Fitness A',
          slug: `apex-fit-a-${idSuffix}`,
        },
      });
      brandAId = brandA.id;

      // Store A1 with coordinates (Indiranagar, Bangalore: 12.9784, 77.6408)
      const loc1 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Apex Fitness Indiranagar',
          storeCode: `IND-${idSuffix}`,
          addressLine1: '100ft Road',
          city: 'Bangalore',
          state: 'KA',
          postalCode: '560038',
          country: 'IN',
          latitude: 12.9784,
          longitude: 77.6408,
          googlePlaceId: `place_ind_${idSuffix}`,
        },
      });
      storeA1Id = loc1.id;

      // Store A2 WITHOUT coordinates (to test guard)
      const loc2 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Apex Fitness Koramangala (No Coords)',
          storeCode: `KOR-${idSuffix}`,
          addressLine1: '80ft Road',
          city: 'Bangalore',
          state: 'KA',
          postalCode: '560034',
          country: 'IN',
          latitude: null,
          longitude: null,
        },
      });
      storeA2NoCoordsId = loc2.id;
    });

    // 4. Create Brand and Store for Tenant B
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const brandB = await tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: 'Zenith Yoga B',
          slug: `zenith-yoga-b-${idSuffix}`,
        },
      });
      brandBId = brandB.id;

      const locB = await tx.location.create({
        data: {
          tenantId: tenantBId,
          brandId: brandBId,
          name: 'Zenith Yoga Whitefield',
          storeCode: `WHF-${idSuffix}`,
          addressLine1: 'ITPL Main Road',
          city: 'Bangalore',
          state: 'KA',
          postalCode: '560066',
          country: 'IN',
          latitude: 12.9698,
          longitude: 77.7500,
          googlePlaceId: `place_whf_${idSuffix}`,
        },
      });
      storeB1Id = locB.id;
    });
  });

  afterAll(async () => {
    // Cleanup
    try {
      if (tenantAId) {
        await prisma.rankObservation.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.rankRunSummary.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.rankRun.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.rankGridConfig.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.storeCompetitor.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.competitor.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.storeKeyword.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.keyword.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.location.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.brand.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.tenantMembership.deleteMany({ where: { tenantId: tenantAId } });
        await prisma.tenant.delete({ where: { id: tenantAId } });
      }
      if (tenantBId) {
        await prisma.rankObservation.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.rankRunSummary.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.rankRun.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.rankGridConfig.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.storeCompetitor.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.competitor.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.storeKeyword.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.keyword.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.location.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.brand.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.tenantMembership.deleteMany({ where: { tenantId: tenantBId } });
        await prisma.tenant.delete({ where: { id: tenantBId } });
      }
      if (userAId) await prisma.user.delete({ where: { id: userAId } });
      if (userBId) await prisma.user.delete({ where: { id: userBId } });
    } catch (e) {
      // Ignore teardown errors
    }
  });

  // Test 1: Deterministic Geo-Grid Generation
  it('Scenario 1: should deterministically generate a 7x7 geodesic grid with exact center point', () => {
    const centerLat = 12.9716;
    const centerLng = 77.5946;
    const radiusKm = 5.0;
    const gridSize = 7;

    const points = GeoGridService.generateGridPoints(centerLat, centerLng, radiusKm, gridSize);

    // Exactly 7x7 = 49 points
    expect(points).toHaveLength(49);

    // Center point is at row 3, col 3 (index 24)
    const centerPoint = points.find((p) => p.row === 3 && p.col === 3);
    expect(centerPoint).toBeDefined();
    expect(centerPoint!.index).toBe(24);
    expect(centerPoint!.latitude).toBeCloseTo(centerLat, 4);
    expect(centerPoint!.longitude).toBeCloseTo(centerLng, 4);
    expect(centerPoint!.distanceKm).toBe(0.0);

    // Four corner points are at diagonal distance ~7.07 km (sqrt(5^2 + 5^2))
    const corners = points.filter(
      (p) => (p.row === 0 || p.row === 6) && (p.col === 0 || p.col === 6)
    );
    expect(corners).toHaveLength(4);
    corners.forEach((c) => {
      expect(c.distanceKm).toBeCloseTo(7.07, 1);
    });

    // Four cardinal edge points are at exactly ~5.0 km from center
    const cardinalEdges = points.filter(
      (p) => (p.row === 3 && (p.col === 0 || p.col === 6)) || (p.col === 3 && (p.row === 0 || p.row === 6))
    );
    expect(cardinalEdges).toHaveLength(4);
    cardinalEdges.forEach((e) => {
      expect(e.distanceKm).toBeCloseTo(5.0, 1);
    });

    // Monotonic distance increase from center along cardinal axes
    const centerRowPoints = points.filter((p) => p.row === 3).sort((a, b) => a.col - b.col);
    expect(centerRowPoints[3]!.distanceKm).toBe(0.0); // Col 3 is center
    expect(centerRowPoints[2]!.distanceKm).toBeGreaterThan(0);
    expect(centerRowPoints[1]!.distanceKm).toBeGreaterThan(centerRowPoints[2]!.distanceKm);
    expect(centerRowPoints[0]!.distanceKm).toBeGreaterThan(centerRowPoints[1]!.distanceKm);
  });

  // Test 2: Missing Coordinates Guard
  it('Scenario 2: should throw an explicit error when attempting grid config on a store without latitude/longitude', async () => {
    await expect(
      GeoGridService.getOrCreateGridConfig(tenantAId, storeA2NoCoordsId, {}, adminContextA)
    ).rejects.toThrow(/coordinates.*required|latitude.*longitude/i);

    await expect(
      RankRunService.triggerRankRun(
        tenantAId,
        storeA2NoCoordsId,
        'dummy-kw-id',
        {},
        adminContextA
      )
    ).rejects.toThrow(/coordinates.*required|latitude.*longitude/i);
  });

  // Test 3: Keyword Normalization & Ingestion
  it('Scenario 3: should normalize keywords (trim, lowercase, collapse whitespace) and remain idempotent', async () => {
    const rawTerm = '   Best   GYM   Near   Me   ';
    const normalizedExpected = 'best gym near me';

    const kw1 = await KeywordService.addKeyword(
      tenantAId,
      brandAId,
      rawTerm,
      { tags: ['fitness', 'local'] },
      adminContextA
    );

    expect(kw1.term).toBe('Best GYM Near Me'); // preserves display casing
    expect(kw1.normalizedTerm).toBe(normalizedExpected);
    expect(kw1.source).toBe('MANUAL');
    expect(kw1.status).toBe('ACTIVE');

    // Adding same normalized term again returns existing keyword without duplication
    const kw2 = await KeywordService.addKeyword(
      tenantAId,
      brandAId,
      'best  gym near   me',
      {},
      adminContextA
    );

    expect(kw2.id).toBe(kw1.id);
  });

  // Test 4: GSC & GBP Keyword Ingestion with Provenance
  it('Scenario 4: should import keywords from GSC and GBP with explicit provenance tags', async () => {
    // Import GSC queries
    const gscImport = await KeywordService.importFromGsc(
      tenantAId,
      brandAId,
      ['strength training bangalore'],
      adminContextA
    );
    expect(gscImport.importedCount).toBe(1);

    // Import GBP search terms
    const gbpImport = await KeywordService.importFromGbp(
      tenantAId,
      brandAId,
      ['personal trainer indiranagar'],
      adminContextA
    );
    expect(gbpImport.importedCount).toBe(1);

    // Verify distinct provenance
    const brandKeywords = await KeywordService.listBrandKeywords(
      tenantAId,
      brandAId,
      {},
      adminContextA
    );

    const gscKw = brandKeywords.items.find((k) => k.normalizedTerm === 'strength training bangalore');
    expect(gscKw).toBeDefined();
    expect(gscKw!.source).toBe('GSC_IMPORT');

    const gbpKw = brandKeywords.items.find((k) => k.normalizedTerm === 'personal trainer indiranagar');
    expect(gbpKw).toBeDefined();
    expect(gbpKw!.source).toBe('GBP_IMPORT');
  });

  // Test 5: Cross-Brand Boundary Enforcement
  it('Scenario 5: should reject assigning a Brand A keyword to a Brand B store', async () => {
    // Get a Brand A keyword
    const brandAKeywords = await KeywordService.listBrandKeywords(
      tenantAId,
      brandAId,
      {},
      adminContextA
    );
    const kwA = brandAKeywords.items[0]!;

    // Attempting to assign kwA to Store B1 (belonging to Brand B) must throw
    await expect(
      KeywordService.assignToStore(tenantAId, storeB1Id, kwA.id, {}, adminContextA)
    ).rejects.toThrow(/not found|belonging to brand/i);
  });

  // Test 6: Rank Observation Recording (Found vs Not Found)
  it('Scenario 6: should record found rank (rank <= 20) and not-found (rank: null, never 0)', async () => {
    const kw = await KeywordService.addKeyword(
      tenantAId,
      brandAId,
      'gym near indiranagar',
      {},
      adminContextA
    );

    // Trigger Rank Run with 5x5 grid
    const run = await RankRunService.triggerRankRun(
      tenantAId,
      storeA1Id,
      kw.id,
      { gridSize: 5, radiusKm: 5, force: true },
      adminContextA
    );

    expect(['SUCCESS', 'COMPLETED']).toContain(run.status);
    expect(run.observations).toBeDefined();
    expect(run.observations!.length).toBe(25);

    // Close points should be found
    const foundPoints = run.observations!.filter((o) => o.found);
    expect(foundPoints.length).toBeGreaterThan(0);
    foundPoints.forEach((p) => {
      expect(p.rank).not.toBeNull();
      expect(p.rank).toBeGreaterThanOrEqual(1);
      expect(p.rank).toBeLessThanOrEqual(20);
    });

    // Distant points (>6km) should be not found
    const notFoundPoints = run.observations!.filter((o) => !o.found);
    expect(notFoundPoints.length).toBeGreaterThan(0);
    notFoundPoints.forEach((p) => {
      // Must be null, NEVER 0!
      expect(p.rank).toBeNull();
      expect(p.found).toBe(false);
    });
  });

  // Test 7: Transparent Formula Calculation
  it('Scenario 7: should calculate averageFoundRank, top3Coverage, top10Coverage, and shareOfVoice correctly', () => {
    const mockObs = [
      { rank: 1, found: true }, // 20 pts
      { rank: 2, found: true }, // 19 pts
      { rank: 3, found: true }, // 18 pts
      { rank: 8, found: true }, // 13 pts
      { rank: null, found: false }, // 0 pts
    ];

    const summary = RankRunService.computeSummary(mockObs as any, 5);

    expect(summary.totalPoints).toBe(5);
    expect(summary.validCheckedPoints).toBe(5);
    expect(summary.foundPoints).toBe(4);
    expect(summary.top3Count).toBe(3);
    expect(summary.top10Count).toBe(4);

    // averageFoundRank = (1 + 2 + 3 + 8) / 4 = 14 / 4 = 3.5
    expect(summary.averageFoundRank).toBe(3.5);

    // top3Coverage = (3 / 5) * 100 = 60.0%
    expect(summary.top3Coverage).toBe(60.0);

    // top10Coverage = (4 / 5) * 100 = 80.0%
    expect(summary.top10Coverage).toBe(80.0);

    // shareOfVoice = (20 + 19 + 18 + 13) / (5 * 20) = 70 / 100 = 70.0%
    expect(summary.shareOfVoice).toBe(70.0);
  });

  // Test 8: Partial Scan Handling
  it('Scenario 8: should calculate coverage correctly when scan is partial (does not inflate coverage)', () => {
    // Only 2 of 10 points checked
    const partialObs = [
      { rank: 1, found: true },
      { rank: 2, found: true },
    ];

    // totalPoints = 10, validChecked = 2
    const summary = RankRunService.computeSummary(partialObs as any, 10);

    expect(summary.totalPoints).toBe(10);
    expect(summary.validCheckedPoints).toBe(2);
    expect(summary.top3Coverage).toBe(100.0); // 2 out of 2 checked
    expect(summary.averageFoundRank).toBe(1.5);
  });

  // Test 9: Idempotent Rank Run Execution via businessKey
  it('Scenario 9: should return existing run on same scheduled date without re-running unless force=true', async () => {
    const kw = await KeywordService.addKeyword(
      tenantAId,
      brandAId,
      'crossfit workouts',
      {},
      adminContextA
    );

    const run1 = await RankRunService.triggerRankRun(
      tenantAId,
      storeA1Id,
      kw.id,
      { gridSize: 3, radiusKm: 2 },
      adminContextA
    );

    // Second call without force returns existing run
    const run2 = await RankRunService.triggerRankRun(
      tenantAId,
      storeA1Id,
      kw.id,
      { gridSize: 3, radiusKm: 2, force: false },
      adminContextA
    );

    expect(run2.id).toBe(run1.id);
    expect(run2.businessKey).toBe(run1.businessKey);

    // Third call with force creates a fresh run
    const run3 = await RankRunService.triggerRankRun(
      tenantAId,
      storeA1Id,
      kw.id,
      { gridSize: 3, radiusKm: 2, force: true },
      adminContextA
    );

    expect(run3.id).not.toBe(run1.id);
  });

  // Test 10: Competitor Ingestion & Deduplication
  it('Scenario 10: should deduplicate competitors by externalPlaceId and increment store observedFrequency', async () => {
    const kw = await KeywordService.addKeyword(
      tenantAId,
      brandAId,
      'pilates studio',
      {},
      adminContextA
    );

    // Trigger run which yields Competitor Alpha and Beta
    await RankRunService.triggerRankRun(
      tenantAId,
      storeA1Id,
      kw.id,
      { gridSize: 3, radiusKm: 2, force: true },
      adminContextA
    );

    const storeCompetitors = await CompetitorService.getStoreCompetitors(
      tenantAId,
      storeA1Id,
      adminContextA
    );

    expect(storeCompetitors.length).toBeGreaterThan(0);
    const alpha = storeCompetitors.find((c) => c.externalPlaceId === 'place_alpha_123');
    expect(alpha).toBeDefined();
    expect(alpha!.name).toBe('Competitor Alpha');
    expect(alpha!.observedFrequency).toBeGreaterThanOrEqual(1);

    // Run again - frequency should increase
    const prevFreq = alpha!.observedFrequency;
    await RankRunService.triggerRankRun(
      tenantAId,
      storeA1Id,
      kw.id,
      { gridSize: 3, radiusKm: 2, force: true },
      adminContextA
    );

    const updatedCompetitors = await CompetitorService.getStoreCompetitors(
      tenantAId,
      storeA1Id,
      adminContextA
    );
    const updatedAlpha = updatedCompetitors.find((c) => c.externalPlaceId === 'place_alpha_123');
    expect(updatedAlpha!.observedFrequency).toBeGreaterThan(prevFreq);
  });

  // Test 11: Historical Observations Preservation
  it('Scenario 11: should preserve historical rank observations across multiple runs', async () => {
    const kw = await KeywordService.addKeyword(
      tenantAId,
      brandAId,
      'aerobics classes',
      {},
      adminContextA
    );

    await RankRunService.triggerRankRun(
      tenantAId,
      storeA1Id,
      kw.id,
      { gridSize: 3, radiusKm: 2, force: true },
      adminContextA
    );

    await RankRunService.triggerRankRun(
      tenantAId,
      storeA1Id,
      kw.id,
      { gridSize: 3, radiusKm: 2, force: true },
      adminContextA
    );

    const history = await RankRunService.getHistoricalRuns(
      tenantAId,
      storeA1Id,
      kw.id,
      10,
      adminContextA
    );

    expect(history.length).toBeGreaterThanOrEqual(2);
    // Observations preserved for each run
    expect(history[0]!.observations).toBeDefined();
    expect(history[1]!.observations).toBeDefined();
  });

  // Test 12: Paused Keyword & Closed Store Guards
  it('Scenario 12: should reject rank run on a PAUSED keyword or a CLOSED store', async () => {
    const kw = await KeywordService.addKeyword(
      tenantAId,
      brandAId,
      'zumba dance',
      {},
      adminContextA
    );

    // Pause keyword
    await KeywordService.setKeywordStatus(tenantAId, kw.id, 'PAUSED', adminContextA);

    await expect(
      RankRunService.triggerRankRun(tenantAId, storeA1Id, kw.id, {}, adminContextA)
    ).rejects.toThrow(/paused/i);

    // Reactivate keyword
    await KeywordService.setKeywordStatus(tenantAId, kw.id, 'ACTIVE', adminContextA);

    // Mark store closed
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      await tx.location.update({
        where: { id: storeA1Id },
        data: { isClosed: true },
      });
    });

    await expect(
      RankRunService.triggerRankRun(tenantAId, storeA1Id, kw.id, {}, adminContextA)
    ).rejects.toThrow(/closed store/i);

    // Restore store active status
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      await tx.location.update({
        where: { id: storeA1Id },
        data: { isClosed: false },
      });
    });
  });

  // Test 13: Strict Cross-Tenant RLS Isolation
  it('Scenario 13: should enforce strict cross-tenant isolation on all Phase 7 tables under localbi_app role', async () => {
    expect(adminContextB.tenantId).toBe(tenantBId);
    // Under Tenant B context, querying Tenant A's keywords, runs, competitors must return empty
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const bKeywords = await tx.keyword.findMany({
        where: { tenantId: tenantAId },
      });
      expect(bKeywords).toHaveLength(0);

      const bRuns = await tx.rankRun.findMany({
        where: { tenantId: tenantAId },
      });
      expect(bRuns).toHaveLength(0);

      const bConfigs = await tx.rankGridConfig.findMany({
        where: { tenantId: tenantAId },
      });
      expect(bConfigs).toHaveLength(0);

      const bCompetitors = await tx.competitor.findMany({
        where: { tenantId: tenantAId },
      });
      expect(bCompetitors).toHaveLength(0);

      const bStoreCompetitors = await tx.storeCompetitor.findMany({
        where: { tenantId: tenantAId },
      });
      expect(bStoreCompetitors).toHaveLength(0);
    });
  });

  // Test 14: Store and Brand Dashboard Aggregations
  it('Scenario 14: should aggregate Store and Brand Rank Dashboards with exact metrics', async () => {
    const storeDashboard = await RankRunService.getStoreRankDashboard(
      tenantAId,
      storeA1Id,
      adminContextA
    );

    expect(storeDashboard.storeId).toBe(storeA1Id);
    expect(storeDashboard.trackedKeywordsCount).toBeGreaterThan(0);
    expect(storeDashboard.keywordRows.length).toBeGreaterThan(0);

    const brandDashboard = await RankRunService.getBrandRankDashboard(
      tenantAId,
      brandAId,
      adminContextA
    );

    expect(brandDashboard.brandId).toBe(brandAId);
    expect(brandDashboard.totalStores).toBe(2);
    expect(brandDashboard.storeRows.length).toBe(2);
  });
});
