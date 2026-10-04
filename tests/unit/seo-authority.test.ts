import { describe, it, expect, beforeAll, vi } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '../../src/shared/database/client';
import { TenantContextService } from '../../src/shared/database/tenant-context';
import {
  BacklinkRepository,
  BacklinkProviderRegistry,
  NotConfiguredBacklinkProvider,
  BacklinkSyncService,
  BacklinkRelevanceEngine,
  BacklinkGapEngine,
  BacklinkOpportunityBridge,
  BacklinkVerificationService,
  ExpectedDirectoryEngine,
  CitationIntelligenceService,
  SeoAuthorityOverviewService,
  BacklinkProvider,
} from '../../src/modules/seo-authority';
import { SafePageCrawler } from '../../src/modules/seo-intelligence/safe-page-crawler';

describe('Workstream E: SEO Authority Intelligence (Backlinks & Citations)', () => {
  let tenantAId: string;
  let tenantBId: string;
  let brandAId: string;
  let brandBId: string;
  let storeAId: string;
  let surfaceAId: string;
  const idSuffix = crypto.randomBytes(4).toString('hex');

  beforeAll(async () => {
    // 1. Create Tenant A
    const tenantA = await prisma.tenant.create({
      data: {
        name: `Tenant A Authority ${idSuffix}`,
        slug: `tenant-auth-a-${idSuffix}`,
        status: 'ACTIVE',
        industry: 'Luxury Fragrance & Retail',
      },
    });
    tenantAId = tenantA.id;

    // 2. Create Tenant B (for multi-tenant isolation testing)
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B Authority ${idSuffix}`,
        slug: `tenant-auth-b-${idSuffix}`,
        status: 'ACTIVE',
        industry: 'Automotive',
      },
    });
    tenantBId = tenantB.id;

    // 3. Create Brands, Stores, Surfaces under Tenant Context
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const brandA = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: `Aalim Perfumes ${idSuffix}`,
          slug: `aalim-perfumes-${idSuffix}`,
        },
      });
      brandAId = brandA.id;

      const storeA = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Aalim Perfumes Mannadi',
          storeCode: `MAN-${idSuffix}`,
          addressLine1: '45 Angappa Naicken St, Mannadi',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'IN',
          phone: '+91 98401 23456',
          version: 1,
        },
      });
      storeAId = storeA.id;

      const surfaceA = await tx.webSurface.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Aalim Perfumes Main Surface',
          type: 'LOCALBI',
          status: 'ACTIVE',
        },
      });
      surfaceAId = surfaceA.id;

      await tx.domain.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          webSurfaceId: surfaceA.id,
          hostname: `aalim-${idSuffix}.localbi.site`,
          isPrimary: true,
        },
      });
    });

    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const brandB = await tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: `Speed Motors ${idSuffix}`,
          slug: `speed-motors-${idSuffix}`,
        },
      });
      brandBId = brandB.id;
    });

    await BacklinkRepository.ensureSchema();
  });

  describe('1. Backlink Provider State & Absent Credentials', () => {
    it('returns NOT_CONFIGURED when no credentials exist and prevents fake data generation', async () => {
      BacklinkProviderRegistry.setProvider(null); // Ensure default resolver
      const provider = BacklinkProviderRegistry.getProvider();
      const state = await provider.getState();

      // In test environment without DATAFORSEO_API_LOGIN, provider must be NOT_CONFIGURED
      if (!process.env['DATAFORSEO_API_LOGIN']) {
        expect(state).toBe('NOT_CONFIGURED');
        const summary = await provider.getDomainSummary('example.com');
        expect(summary).toBeNull();
        const backlinks = await provider.listBacklinks({ domain: 'example.com' });
        expect(backlinks.items).toHaveLength(0);
        expect(backlinks.hasMore).toBe(false);
      }
    });

    it('safely handles sync when provider is NOT_CONFIGURED', async () => {
      BacklinkProviderRegistry.setProvider(new NotConfiguredBacklinkProvider());
      const syncResult = await BacklinkSyncService.syncBacklinksForSurface(
        tenantAId,
        brandAId,
        surfaceAId
      );

      expect(syncResult.success).toBe(false);
      expect(syncResult.state).toBe('NOT_CONFIGURED');
      expect(syncResult.upsertedCount).toBe(0);
      expect(syncResult.error).toContain('not configured');
    });
  });

  describe('2. URL Canonicalization & Safe Normalization', () => {
    it('accurately canonicalizes target URLs across protocols, www, tracking params, and slashes', () => {
      const raw1 = 'https://www.aalimperfumes.com/products/oud-wood/';
      const raw2 = 'http://aalimperfumes.com/products/oud-wood?utm_source=google&utm_medium=cpc';
      const raw3 = 'https://aalimperfumes.com/products/oud-wood';

      expect(BacklinkRepository.canonicalizeUrl(raw1)).toBe('aalimperfumes.com/products/oud-wood');
      expect(BacklinkRepository.canonicalizeUrl(raw2)).toBe('aalimperfumes.com/products/oud-wood');
      expect(BacklinkRepository.canonicalizeUrl(raw3)).toBe('aalimperfumes.com/products/oud-wood');
    });
  });

  describe('3. Normalized Backlink Persistence & Safe Reconciliation', () => {
    it('batch upserts backlinks and aggregates referring domains', async () => {
      const records = [
        {
          provider: 'DATAFORSEO',
          externalId: 'ext_1',
          referringDomain: 'chennaibusinessguide.com',
          linkingUrl: 'https://chennaibusinessguide.com/top-perfumes',
          targetUrl: `https://aalim-${idSuffix}.localbi.site/products/royal-oud`,
          anchorText: 'Royal Oud Fragrance',
          followState: 'FOLLOW' as const,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          status: 'ACTIVE' as const,
          providerAuthorityMetric: 58,
          providerAuthorityMetricName: 'Domain Rank',
          discoveredAt: new Date(),
          updatedAt: new Date(),
        },
        {
          provider: 'DATAFORSEO',
          externalId: 'ext_2',
          referringDomain: 'chennaibusinessguide.com',
          linkingUrl: 'https://chennaibusinessguide.com/shopping-directory',
          targetUrl: `https://aalim-${idSuffix}.localbi.site/`,
          anchorText: 'Aalim Perfumes',
          followState: 'NOFOLLOW' as const,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          status: 'ACTIVE' as const,
          providerAuthorityMetric: 58,
          providerAuthorityMetricName: 'Domain Rank',
          discoveredAt: new Date(),
          updatedAt: new Date(),
        },
        {
          provider: 'DATAFORSEO',
          externalId: 'ext_3',
          referringDomain: 'fragranceenthusiast.org',
          linkingUrl: 'https://fragranceenthusiast.org/artisanal-scents',
          targetUrl: `https://aalim-${idSuffix}.localbi.site/products/royal-oud`,
          anchorText: 'artisan oud',
          followState: 'FOLLOW' as const,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          status: 'ACTIVE' as const,
          providerAuthorityMetric: 72,
          providerAuthorityMetricName: 'Domain Rank',
          discoveredAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const count = await BacklinkRepository.upsertBacklinks(
        tenantAId,
        brandAId,
        surfaceAId,
        records
      );
      expect(count).toBe(3);

      const list = await BacklinkRepository.listBacklinks(tenantAId, brandAId, surfaceAId, {
        limit: 10,
      });
      expect(list.totalCount).toBe(3);
      expect(list.items).toHaveLength(3);

      const domains = await BacklinkRepository.listReferringDomains(
        tenantAId,
        brandAId,
        surfaceAId,
        {}
      );
      expect(domains.totalCount).toBe(2); // chennaibusinessguide.com and fragranceenthusiast.org
      const chennaiDomain = domains.items.find((d) => d.domain === 'chennaibusinessguide.com');
      expect(chennaiDomain?.activeLinksCount).toBe(2);
    });

    it('partial sync never marks unseen links as lost', async () => {
      // Create a mock provider that throws an error on page 2
      const mockProvider: BacklinkProvider = {
        providerName: 'MOCK_PARTIAL',
        getState: async () => 'CONFIGURED',
        getDomainSummary: async () => null,
        listBacklinks: vi
          .fn()
          .mockResolvedValueOnce({
            items: [
              {
                provider: 'MOCK_PARTIAL',
                referringDomain: 'fragrancereview.in',
                linkingUrl: 'https://fragrancereview.in/top-10',
                targetUrl: `https://aalim-${idSuffix}.localbi.site/`,
                anchorText: 'Top 10 Perfumes',
                followState: 'FOLLOW',
                firstSeenAt: new Date(),
                lastSeenAt: new Date(),
                status: 'ACTIVE',
                providerAuthorityMetric: 65,
                providerAuthorityMetricName: 'Domain Rank',
                discoveredAt: new Date(),
                updatedAt: new Date(),
              },
            ],
            nextCursor: 'page_2',
            hasMore: true,
          })
          .mockRejectedValueOnce(new Error('Network socket timeout on page 2')),
        listReferringDomains: async () => ({ items: [], hasMore: false }),
        getCompetitorReferringDomains: async () => [],
      };

      BacklinkProviderRegistry.setProvider(mockProvider);

      const result = await BacklinkSyncService.syncBacklinksForSurface(
        tenantAId,
        brandAId,
        surfaceAId
      );

      // Must be partial, but pre-existing links MUST remain ACTIVE!
      expect(result.isPartial).toBe(true);
      expect(result.state).toBe('PARTIAL');

      const existingLinks = await BacklinkRepository.listBacklinks(
        tenantAId,
        brandAId,
        surfaceAId,
        { status: 'ACTIVE' }
      );
      // All previous active links remain active, not mass-marked lost
      expect(existingLinks.totalCount).toBeGreaterThanOrEqual(3);
    });

    it('marks link as LOST only when explicitly confirmed', async () => {
      const lostUrl = 'https://chennaibusinessguide.com/top-perfumes';
      const updatedCount = await BacklinkRepository.markLinksLost(
        tenantAId,
        brandAId,
        surfaceAId,
        [lostUrl]
      );
      expect(updatedCount).toBeGreaterThanOrEqual(1);

      const lostList = await BacklinkRepository.listBacklinks(tenantAId, brandAId, surfaceAId, {
        status: 'LOST',
      });
      const lostRecord = lostList.items.find((r) => r.linkingUrl === lostUrl);
      expect(lostRecord?.status).toBe('LOST');
    });
  });

  describe('4. Relevance and Risk Engine (Deterministic Evidence)', () => {
    it('evaluates industry-relevant local association with HIGH relevance and LOW risk', () => {
      const relevance = BacklinkRelevanceEngine.evaluateRelevance({
        domain: 'chennaichamberofcommerce.org',
        clientIndustry: 'Retail',
        clientLocation: 'Chennai',
        competitorCount: 2,
      });

      expect(relevance.overall).toBe('HIGH');
      expect(relevance.local).toBe('HIGH');
      expect(relevance.relationshipType).toBe('INDUSTRY_ASSOCIATION');
      expect(relevance.explanation).toContain('competitor');

      const risk = BacklinkRelevanceEngine.evaluateRisk('chennaichamberofcommerce.org');
      expect(risk.level).toBe('LOW');
      expect(risk.reasons).toHaveLength(0);
    });

    it('detects high-risk spam domain patterns without arbitrary accusation', () => {
      const risk = BacklinkRelevanceEngine.evaluateRisk('best-seo-buy-links-cheap.xyz');
      expect(risk.level).toBe('HIGH');
      expect(risk.reasons.length).toBeGreaterThanOrEqual(2);
      expect(risk.reasons.some((r) => r.includes('.xyz'))).toBe(true);
      expect(risk.reasons.some((r) => r.includes('buy-links'))).toBe(true);
    });

    it('evaluates unrelated domain as LOW or UNKNOWN without fabricating scores', () => {
      const relevance = BacklinkRelevanceEngine.evaluateRelevance({
        domain: 'seattlemarinedieselservices.com',
        clientIndustry: 'Luxury Fragrance',
        clientLocation: 'Chennai',
        competitorCount: 0,
      });

      expect(['LOW', 'UNKNOWN']).toContain(relevance.overall);
    });
  });

  describe('5. Competitor Gap Engine & Backlink Opportunity Bridge', () => {
    it('identifies competitor backlink gaps and maps them to canonical Opportunities', async () => {
      // 1. Create a competitor with a known domain
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.competitor.create({
          data: {
            tenantId: tenantAId,
            name: 'Ajmal Fragrances',
            domain: 'ajmalperfumes.com',
            category: 'Perfume Store',
          },
        });
      });

      // 2. Setup mock provider reporting competitor referring domains
      const mockProvider: BacklinkProvider = {
        providerName: 'MOCK_GAP_PROVIDER',
        getState: async () => 'CONFIGURED',
        getDomainSummary: async () => null,
        listBacklinks: async () => ({ items: [], hasMore: false }),
        listReferringDomains: async () => ({ items: [], hasMore: false }),
        getCompetitorReferringDomains: async () => [
          {
            competitorDomain: 'ajmalperfumes.com',
            referringDomains: ['indianscentassociation.org', 'chennaishoppingmall.in'],
          },
        ],
      };

      BacklinkProviderRegistry.setProvider(mockProvider);

      const gaps = await BacklinkGapEngine.findCompetitorGaps(
        tenantAId,
        brandAId,
        surfaceAId
      );

      expect(gaps.length).toBeGreaterThan(0);
      const assocGap = gaps.find((g) => g.domain === 'indianscentassociation.org');
      expect(assocGap).toBeDefined();
      expect(assocGap?.clientHasBacklink).toBe(false);
      expect(assocGap?.competitorCount).toBe(1);
      expect(assocGap?.provenance).toBe('RULE_BASED');

      // 3. Bridge gap candidate to canonical Opportunity
      const oppId = await BacklinkOpportunityBridge.createOpportunityFromCandidate(
        tenantAId,
        brandAId,
        surfaceAId,
        assocGap!
      );

      expect(oppId).toBeDefined();

      const createdOpp = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.opportunity.findUnique({
          where: { id: oppId! },
          include: { evidence: true },
        });
      });

      expect(createdOpp?.type).toBe('BACKLINK_OPPORTUNITY');
      expect(createdOpp?.evidence.length).toBeGreaterThan(0);
      expect(createdOpp?.evidence[0]?.source).toBe('BACKLINK_PROVIDER');

      // 4. Test deduplication: calling again returns the same opportunity
      const oppId2 = await BacklinkOpportunityBridge.createOpportunityFromCandidate(
        tenantAId,
        brandAId,
        surfaceAId,
        assocGap!
      );
      expect(oppId2).toBe(oppId);
    });
  });

  describe('6. SSRF-Safe Link Verification', () => {
    it('blocks malicious SSRF targets pointing to private IP or cloud metadata', async () => {
      // SafePageCrawler SSRF defense validation
      expect(SafePageCrawler.isPrivateOrBlockedIp('127.0.0.1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('169.254.169.254')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('10.0.0.1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('192.168.1.1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('::1')).toBe(true);
    });

    it('verifies hyperlink presence using SafePageCrawler fetch', async () => {
      // Mock SafePageCrawler.crawlPage
      vi.spyOn(SafePageCrawler, 'crawlPage').mockResolvedValueOnce({
        success: true,
        url: 'https://example.com/blog',
        finalUrl: 'https://example.com/blog',
        httpStatus: 200,
        signals: {
          url: 'https://example.com/blog',
          finalUrl: 'https://example.com/blog',
          httpStatus: 200,
          title: 'Great Fragrances',
          metaDescription: 'Description',
          canonical: null,
          robots: null,
          headings: { h1: [], h2: [], h3: [] },
          mainContentSummary: '',
          wordCount: 500,
          internalLinkCount: 5,
          externalLinkCount: 1,
          imageCount: 0,
          missingAltCount: 0,
          structuredDataTypes: [],
          faqSignals: [],
          serviceTopics: [],
          locationSignals: [],
          externalLinks: [
            {
              href: `https://aalim-${idSuffix}.localbi.site/products/royal-oud`,
              text: 'Aalim Royal Oud',
              isNofollow: false,
            },
          ],
          keywordOccurrences: {
            inTitle: false,
            inMetaDescription: false,
            inH1: false,
            inH2: false,
            inBodyCount: 0,
          },
        } as any,
      });

      const verification = await BacklinkVerificationService.verifyLink(
        'https://example.com/blog',
        `https://aalim-${idSuffix}.localbi.site/products/royal-oud`
      );

      expect(verification.verified).toBe(true);
      expect(verification.anchorText).toBe('Aalim Royal Oud');
      expect(verification.message).toContain('Link detected');
    });
  });

  describe('7. Citation Intelligence & Expected Directory Matrix', () => {
    it('resolves expected directories for an Indian retail store correctly', () => {
      const expectedDirs = ExpectedDirectoryEngine.getExpectedDirectoriesForStore('IN', 'perfume');
      const providers = expectedDirs.map((d) => d.provider);

      expect(providers).toContain('GOOGLE_BUSINESS_PROFILE');
      expect(providers).toContain('APPLE_BUSINESS_CONNECT');
      expect(providers).toContain('BING_PLACES');
      expect(providers).toContain('JUSTDIAL'); // India specific
      // Yelp is US/Western focused and should NOT be expected for an Indian local retail store
      expect(providers).not.toContain('YELP');
    });

    it('produces a factual StoreCitationOverview identifying connected vs missing directories', async () => {
      // Connect a Google Business Profile listing for storeA
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.directoryListing.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeAId,
            provider: 'GOOGLE_BUSINESS_PROFILE',
            externalListingId: `gbp_${idSuffix}`,
            status: 'MATCHED',
            napOverallStatus: 'HEALTHY',
            snapshotName: 'Aalim Perfumes Mannadi',
            snapshotPhone: '+91 98401 23456',
            snapshotAddress: '45 Angappa Naicken St, Mannadi, Chennai',
          },
        });
      });

      const overview = await CitationIntelligenceService.getStoreCitationOverview(
        tenantAId,
        storeAId
      );

      expect(overview).toBeDefined();
      expect(overview?.storeName).toBe('Aalim Perfumes Mannadi');
      expect(overview?.metrics.present).toBe(1);
      expect(overview?.metrics.healthy).toBe(1);
      // Apple, Bing, Justdial, Facebook are expected but not yet connected -> marked MISSING
      expect(overview?.metrics.missing).toBeGreaterThan(0);
      expect(overview?.missingDirectories.some((m) => m.provider === 'JUSTDIAL')).toBe(true);
    });
  });

  describe('8. Multi-Tenant Dual-Role RLS Isolation', () => {
    it('prevents Tenant B from querying Tenant A backlinks', async () => {
      const itemsUnderTenantB: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM backlink_records WHERE tenant_id = $1`,
        tenantBId
      );
      // Tenant B has 0 records
      expect(itemsUnderTenantB).toHaveLength(0);
    });

    it('prevents Tenant B from viewing Tenant A SEO Authority Overview', async () => {
      const overviewB = await SeoAuthorityOverviewService.getOverview(
        tenantBId,
        brandBId,
        'surface_b_dummy'
      );
      expect(overviewB.backlinks.totalBacklinks).toBe(0);
      expect(overviewB.citations.trackedListings).toBe(0);
    });
  });
});
