import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '../src/shared/database/client';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role, AuthorizedContext, ScopeMode } from '../src/shared/authorization/policy';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';
import {
  OpportunityType,
  OpportunityStatus,
  OpportunityPriority,
  OpportunityConfidence,
  OpportunityActionType,
  DismissalReason,
  SignalSource,
} from '../src/modules/intelligence/opportunity-types';
import { OpportunityService } from '../src/modules/intelligence/opportunity-service';
import { PageCoverageService } from '../src/modules/intelligence/page-coverage-service';
import { OpportunityRuleEngine } from '../src/modules/intelligence/opportunity-rule-engine';

describe('Phase 10: Keyword Intelligence + SEO Opportunity Engine', () => {
  let tenantAId: string;
  let tenantBId: string;
  let brandAId: string;
  let brandBId: string;
  let storeA1Id: string;
  let storeA2Id: string;
  let userAId: string;
  let userBId: string;
  let contextA: AuthorizedContext;
  let contextB: AuthorizedContext;

  let keywordA1Id: string;
  let productA1Id: string;

  const idSuffix = crypto.randomBytes(4).toString('hex');

  beforeAll(async () => {
    // 1. Create Users
    const userA = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-opp-a-${idSuffix}@example.com`),
        fullName: 'Tenant A Owner',
        status: 'ACTIVE',
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-opp-b-${idSuffix}@example.com`),
        fullName: 'Tenant B Owner',
        status: 'ACTIVE',
      },
    });
    userBId = userB.id;

    // 2. Create Tenants
    const tenantA = await prisma.tenant.create({
      data: {
        name: `Tenant A Intelligence ${idSuffix}`,
        slug: `tenant-a-opp-${idSuffix}`,
      },
    });
    tenantAId = tenantA.id;

    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B Intelligence ${idSuffix}`,
        slug: `tenant-b-opp-${idSuffix}`,
      },
    });
    tenantBId = tenantB.id;

    contextA = {
      userId: userAId,
      tenantId: tenantAId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    contextB = {
      userId: userBId,
      tenantId: tenantBId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    // 3. Setup Tenant A Data under TenantContext
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      await tx.tenantMembership.create({
        data: {
          tenantId: tenantAId,
          userId: userAId,
          role: Role.CLIENT_OWNER,
          scopeMode: ScopeMode.ALL,
        },
      });

      const brandA = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: 'Aalim Perfumes',
          slug: `aalim-perfumes-${idSuffix}`,
        },
      });
      brandAId = brandA.id;

      // Stores: storeA1 (Mannadi - complete), storeA2 (T Nagar - missing phone & placeId)
      const storeA1 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Aalim Mannadi Flagship',
          storeCode: `MANNADI-${idSuffix}`,
          addressLine1: '12 Angappa Naicken Street',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'IN',
          phone: '+914441001111',
          googlePlaceId: 'ChIJ_mannadi_place_id',
          gbpSyncStatus: 'SYNCED',
        },
      });
      storeA1Id = storeA1.id;

      const storeA2 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Aalim T Nagar Boutique',
          storeCode: `TNAGAR-${idSuffix}`,
          addressLine1: '', // Missing address
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600017',
          country: 'IN',
          phone: '', // Missing phone
          googlePlaceId: null, // Missing place ID
          gbpSyncStatus: 'ERROR',
        },
      });
      storeA2Id = storeA2.id;

      // WebSurface & Page Template
      const webSurface = await tx.webSurface.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Brand Storefront',
          type: 'MICROSITE',
          status: 'ACTIVE',
        },
      });

      const template = await tx.pageTemplate.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          webSurfaceId: webSurface.id,
          name: 'Standard Store Template',
          type: 'STORE',
        },
      });

      // Published Store Page for storeA1
      await tx.page.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          webSurfaceId: webSurface.id,
          templateId: template.id,
          pageType: 'STORE',
          slug: 'mannadi-perfume-store',
          storeId: storeA1.id,
          status: 'PUBLISHED',
        },
      });

      // Product
      const product = await tx.product.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Royal Cambodian Oud',
          slug: `royal-cambodian-oud-${idSuffix}`,
          sku: `SKU-OUD-${idSuffix}`,
          status: 'ACTIVE',
          publishStatus: 'PUBLISHED',
        },
      });
      productA1Id = product.id;

      // Keywords
      const kw1 = await tx.keyword.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          term: 'oud perfume chennai',
          normalizedTerm: 'oud perfume chennai',
          source: 'MANUAL',
        },
      });
      keywordA1Id = kw1.id;

      await tx.keyword.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          term: 'attar shop t nagar',
          normalizedTerm: 'attar shop t nagar',
          source: 'MANUAL',
        },
      });

      // GSC Connection & Data
      const conn = await tx.integrationConnection.create({
        data: {
          tenantId: tenantAId,
          provider: 'GOOGLE_SEARCH_CONSOLE',
          externalSubjectId: `sub-gsc-${idSuffix}`,
          externalEmail: `admin-gsc-${idSuffix}@example.com`,
          encryptedRefreshToken: 'enc_token',
        },
      });
      const extAccount = await tx.externalAccount.create({
        data: {
          tenantId: tenantAId,
          connectionId: conn.id,
          provider: 'GOOGLE_SEARCH_CONSOLE',
          externalAccountId: `acc-gsc-${idSuffix}`,
          accountName: 'GSC Account',
        },
      });
      const extResource = await tx.externalResource.create({
        data: {
          tenantId: tenantAId,
          accountId: extAccount.id,
          provider: 'GOOGLE_SEARCH_CONSOLE',
          externalResourceId: `res-gsc-${idSuffix}`,
          resourceType: 'PROPERTY',
          resourceName: 'https://aalimperfumes.com/',
        },
      });
      await tx.internalResourceMapping.create({
        data: {
          tenantId: tenantAId,
          resourceId: extResource.id,
          internalType: 'BRAND',
          internalId: brandAId,
          brandId: brandAId,
          status: 'ACTIVE',
        },
      });

      const gscProp = await tx.gscProperty.create({
        data: {
          tenantId: tenantAId,
          resourceId: extResource.id,
          propertyUrl: 'https://aalimperfumes.com/',
          propertyType: 'URL_PREFIX',
        },
      });

      // 1. GSC Query 1: High Impressions, Low CTR ("pure dehn al oud")
      const gscQ1 = await tx.gscQuery.create({
        data: {
          tenantId: tenantAId,
          propertyId: gscProp.id,
          queryHash: crypto.createHash('sha256').update('pure dehn al oud').digest('hex'),
          queryText: 'pure dehn al oud',
        },
      });
      await tx.gscDailyQueryMetric.create({
        data: {
          tenantId: tenantAId,
          propertyId: gscProp.id,
          queryId: gscQ1.id,
          date: new Date(),
          impressions: 1200,
          clicks: 6, // 0.5% CTR at position 2.1 (expected > 5%)
          sumPositionImpressions: 1200 * 2.1,
        },
      });

      // 2. GSC Query 2: Missing Landing Page ("luxury french perfume gift box")
      const gscQ2 = await tx.gscQuery.create({
        data: {
          tenantId: tenantAId,
          propertyId: gscProp.id,
          queryHash: crypto.createHash('sha256').update('luxury french perfume gift box').digest('hex'),
          queryText: 'luxury french perfume gift box',
        },
      });
      await tx.gscDailyQueryMetric.create({
        data: {
          tenantId: tenantAId,
          propertyId: gscProp.id,
          queryId: gscQ2.id,
          date: new Date(),
          impressions: 480,
          clicks: 35,
          sumPositionImpressions: 480 * 4.2,
        },
      });

      // GBP Search Term for storeA1 ("oud perfume chennai")
      await tx.gbpSearchTerm.create({
        data: {
          tenantId: tenantAId,
          locationId: storeA1.id,
          term: 'oud perfume chennai',
          impressions: BigInt(250),
          periodStart: new Date(Date.now() - 14 * 24 * 3600 * 1000),
          periodEnd: new Date(),
        },
      });

      // Rank Grid Config
      const gridConfig = await tx.rankGridConfig.create({
        data: {
          tenantId: tenantAId,
          storeId: storeA1.id,
          gridSize: 5,
          radiusKm: 3.0,
          centerLatitude: 13.0827,
          centerLongitude: 80.2707,
        },
      });

      // Hyper Rank Run for storeA1 on "oud perfume chennai" (High demand + Weak rank: top3Coverage = 15%, avgRank = 8.8)
      const rankRun = await tx.rankRun.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          storeId: storeA1.id,
          keywordId: keywordA1Id,
          gridConfigId: gridConfig.id,
          status: 'COMPLETED',
          businessKey: `run-${idSuffix}`,
          scheduledDate: new Date(),
        },
      });
      await tx.rankRunSummary.create({
        data: {
          tenantId: tenantAId,
          rankRunId: rankRun.id,
          storeId: storeA1.id,
          keywordId: keywordA1Id,
          totalPoints: 25,
          validCheckedPoints: 25,
          foundPoints: 20,
          top3Count: 3,
          top10Count: 10,
          averageFoundRank: 8.8,
          top3Coverage: 0.15,
          top10Coverage: 0.40,
          shareOfVoice: 25.5,
        },
      });

      // Verified Conversions for storeA1 (Leads and Calls)
      await tx.lead.createMany({
        data: [
          {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeA1.id,
            webSurfaceId: webSurface.id,
            name: 'Customer Inquiry 1',
            status: 'NEW',
          },
          {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeA1.id,
            webSurfaceId: webSurface.id,
            name: 'Customer Inquiry 2',
            status: 'NEW',
          },
          {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeA1.id,
            webSurfaceId: webSurface.id,
            name: 'Customer Inquiry 3',
            status: 'NEW',
          },
        ],
      });

      // Virtual number and calls for storeA1
      const vNum = await tx.virtualNumber.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          storeId: storeA1.id,
          phoneNumber: `+91444999${idSuffix.slice(0, 4)}`,
          provider: 'TEST_ADAPTER',
          status: 'ACTIVE',
        },
      });
      await tx.call.createMany({
        data: [
          {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeA1.id,
            virtualNumberId: vNum.id,
            provider: 'TEST_ADAPTER',
            providerCallId: `call-1-${idSuffix}`,
            status: 'COMPLETED',
            durationSeconds: 120,
            talkDurationSeconds: 110,
          },
          {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeA1.id,
            virtualNumberId: vNum.id,
            provider: 'TEST_ADAPTER',
            providerCallId: `call-2-${idSuffix}`,
            status: 'COMPLETED',
            durationSeconds: 90,
            talkDurationSeconds: 85,
          },
        ],
      });

      // Unanswered Review at storeA1
      await tx.gbpReview.create({
        data: {
          tenantId: tenantAId,
          locationId: storeA1.id,
          reviewId: `rev-1-${idSuffix}`,
          reviewerName: 'Mohammed Tariq',
          rating: 2,
          comment: 'Store was closed during listed afternoon hours.',
          createTime: new Date(Date.now() - 3 * 24 * 3600 * 1000),
          updateTime: new Date(Date.now() - 3 * 24 * 3600 * 1000),
          replyComment: null, // Unanswered
        },
      });

      // Google Merchant Mapping & Issue for productA1
      const merchantMapping = await tx.merchantProductMapping.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          productId: productA1Id,
          merchantAccountId: `merc-acc-${idSuffix}`,
          offerId: `SKU-OUD-${idSuffix}`,
        },
      });

      await tx.merchantProductIssue.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          mappingId: merchantMapping.id,
          storeId: storeA1.id,
          productId: productA1Id,
          code: 'missing_gtin_or_brand',
          severity: 'ERROR',
          message: 'Product is missing a valid GTIN or Brand attribute.',
          isResolved: false,
        },
      });
    });

    // 4. Setup Tenant B Data under TenantContext
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      await tx.tenantMembership.create({
        data: {
          tenantId: tenantBId,
          userId: userBId,
          role: Role.CLIENT_OWNER,
          scopeMode: ScopeMode.ALL,
        },
      });

      const brandB = await tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: 'Arabian Scents Bangalore',
          slug: `arabian-scents-${idSuffix}`,
        },
      });
      brandBId = brandB.id;

      await tx.location.create({
        data: {
          tenantId: tenantBId,
          brandId: brandBId,
          name: 'Indiranagar Store',
          storeCode: `INDIRA-${idSuffix}`,
          addressLine1: '100ft Road',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560038',
          country: 'IN',
          phone: '+918041002222',
        },
      });
    });
  });

  afterAll(async () => {
    // Cleanup in migrator/superuser context
    if (tenantAId) {
      await prisma.tenant.delete({ where: { id: tenantAId } }).catch(() => {});
    }
    if (tenantBId) {
      await prisma.tenant.delete({ where: { id: tenantBId } }).catch(() => {});
    }
    if (userAId) {
      await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
    }
    if (userBId) {
      await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
    }
  });

  // ---------------------------------------------------------------------------
  // TEST SUITE
  // ---------------------------------------------------------------------------

  it('1. PageCoverageService accurately detects existing published store pages vs missing pages', async () => {
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      // storeA1 has a published page
      const coverage1 = await PageCoverageService.evaluateCoverage(
        tenantAId,
        brandAId,
        {
          storeId: storeA1Id,
        },
        tx
      );
      expect(coverage1.hasCoverage).toBe(true);
      expect(coverage1.coverageType).toBe('EXACT_STORE');
      expect(coverage1.bestMatchingPageSlug).toBe('mannadi-perfume-store');

      // storeA2 has no published page
      const coverage2 = await PageCoverageService.evaluateCoverage(
        tenantAId,
        brandAId,
        {
          storeId: storeA2Id,
        },
        tx
      );
      expect(coverage2.hasCoverage).toBe(false);
      expect(coverage2.coverageType).toBe('NONE');

      // Random non-existent keyword has no page
      const coverage3 = await PageCoverageService.evaluateCoverage(
        tenantAId,
        brandAId,
        {
          keywordTerm: 'luxury french perfume gift box',
        },
        tx
      );
      expect(coverage3.hasCoverage).toBe(false);
    });
  });

  it('2. OpportunityRuleEngine evaluates HIGH_IMPRESSIONS_LOW_CTR with GSC evidence', async () => {
    const candidates = await OpportunityRuleEngine.evaluateHighImpLowCtr({
      tenantId: tenantAId,
      brandId: brandAId,
      signals: {
        gscSignals: [
          {
            source: SignalSource.GSC,
            queryText: 'pure dehn al oud',
            normalizedTerm: 'pure dehn al oud',
            impressions: 1200,
            clicks: 6,
            ctr: 0.005, // 0.5%
            averagePosition: 2.1,
            dateRange: 'last_28_days',
          },
        ],
        gbpSignals: [],
        rankSignals: [],
        conversionSignals: [],
        storeSignals: [],
        merchantSignals: [],
      },
    });

    expect(candidates.length).toBe(1);
    const opp = candidates[0]!;
    expect(opp.type).toBe(OpportunityType.HIGH_IMPRESSIONS_LOW_CTR);
    expect(opp.actionType).toBe(OpportunityActionType.UPDATE_METADATA);
    expect(opp.evidence.length).toBeGreaterThanOrEqual(2);

    const impEvidence = opp.evidence.find((e) => e.metric === 'impressions');
    expect(impEvidence).toBeDefined();
    expect(impEvidence?.source).toBe(SignalSource.GSC);
    expect(impEvidence?.value).toBe(1200);

    const ctrEvidence = opp.evidence.find((e) => e.metric === 'ctr');
    expect(ctrEvidence).toBeDefined();
    expect(ctrEvidence?.value).toBe(0.005);
    expect(ctrEvidence?.comparisonValue).toBe(0.12); // benchmark for top 3
  });

  it('3. OpportunityRuleEngine evaluates HIGH_DEMAND_LOW_RANK with geo-grid evidence', async () => {
    const candidates = await OpportunityRuleEngine.evaluateHighDemandLowRank({
      tenantId: tenantAId,
      brandId: brandAId,
      signals: {
        gscSignals: [],
        gbpSignals: [
          {
            source: SignalSource.GBP,
            term: 'oud perfume chennai',
            normalizedTerm: 'oud perfume chennai',
            impressions: 250,
            locationId: storeA1Id,
            periodStart: new Date(),
            periodEnd: new Date(),
          },
        ],
        rankSignals: [
          {
            source: SignalSource.LOCAL_RANK,
            keywordId: keywordA1Id,
            term: 'oud perfume chennai',
            normalizedTerm: 'oud perfume chennai',
            storeId: storeA1Id,
            averageFoundRank: 8.8,
            top3Coverage: 0.15,
            top10Coverage: 0.40,
            foundCoverage: 0.75,
            gridRunDate: new Date(),
          },
        ],
        conversionSignals: [],
        storeSignals: [
          {
            storeId: storeA1Id,
            storeName: 'Aalim Mannadi Flagship',
            city: 'Chennai',
            addressLine1: 'Angappa Naicken St',
            unansweredReviewsCount: 0,
            totalReviewsCount: 15,
          },
        ],
        merchantSignals: [],
      },
    });

    expect(candidates.length).toBe(1);
    const opp = candidates[0]!;
    expect(opp.type).toBe(OpportunityType.HIGH_DEMAND_LOW_RANK);
    expect(opp.actionType).toBe(OpportunityActionType.IMPROVE_EXISTING_PAGE);

    const gbpEvidence = opp.evidence.find((e) => e.source === SignalSource.GBP);
    expect(gbpEvidence?.value).toBe(250);

    const rankEvidence = opp.evidence.find((e) => e.metric === 'top3_coverage');
    expect(rankEvidence?.value).toBe(0.15);
    expect(rankEvidence?.comparisonValue).toBe(0.70);
  });

  it('4. OpportunityRuleEngine evaluates HIGH_CONVERSION_LOW_VISIBILITY with real-world conversion evidence', async () => {
    const candidates = await OpportunityRuleEngine.evaluateHighConversionLowVisibility({
      tenantId: tenantAId,
      brandId: brandAId,
      signals: {
        gscSignals: [],
        gbpSignals: [],
        rankSignals: [
          {
            source: SignalSource.LOCAL_RANK,
            keywordId: keywordA1Id,
            term: 'oud perfume chennai',
            normalizedTerm: 'oud perfume chennai',
            storeId: storeA1Id,
            averageFoundRank: 9.5,
            top3Coverage: 0.12,
            top10Coverage: 0.35,
            foundCoverage: 0.70,
            gridRunDate: new Date(),
          },
        ],
        conversionSignals: [
          {
            source: SignalSource.LOCALBI,
            storeId: storeA1Id,
            leadsCount: 3,
            callsCount: 2,
            callClicksCount: 4,
            totalConversions: 9,
            periodDays: 28,
          },
        ],
        storeSignals: [
          {
            storeId: storeA1Id,
            storeName: 'Aalim Mannadi Flagship',
            city: 'Chennai',
            addressLine1: 'Angappa Naicken St',
            unansweredReviewsCount: 0,
            totalReviewsCount: 15,
          },
        ],
        merchantSignals: [],
      },
    });

    expect(candidates.length).toBe(1);
    const opp = candidates[0]!;
    expect(opp.type).toBe(OpportunityType.HIGH_CONVERSION_LOW_VISIBILITY);
    expect(opp.confidence).toBe(OpportunityConfidence.HIGH);

    const convEvidence = opp.evidence.find((e) => e.metric === 'total_conversions');
    expect(convEvidence?.source).toBe(SignalSource.LOCALBI);
    expect(convEvidence?.value).toBe(9);
  });

  it('5. OpportunityRuleEngine evaluates GBP Profile Incomplete and Unanswered Reviews', async () => {
    const profileCandidates = await OpportunityRuleEngine.evaluateGbpProfileIncomplete({
      tenantId: tenantAId,
      brandId: brandAId,
      signals: {
        gscSignals: [],
        gbpSignals: [],
        rankSignals: [],
        conversionSignals: [],
        storeSignals: [
          {
            storeId: storeA2Id,
            storeName: 'Aalim T Nagar Boutique',
            city: 'Chennai',
            addressLine1: '', // Missing
            phone: '', // Missing
            googlePlaceId: null, // Missing
            gbpSyncStatus: 'ERROR',
            unansweredReviewsCount: 0,
            totalReviewsCount: 0,
          },
        ],
        merchantSignals: [],
      },
    });

    expect(profileCandidates.length).toBe(1);
    expect(profileCandidates[0]!.type).toBe(OpportunityType.GBP_PROFILE_INCOMPLETE);
    expect(profileCandidates[0]!.actionType).toBe(OpportunityActionType.FIX_GBP_PROFILE);

    const reviewCandidates = await OpportunityRuleEngine.evaluateUnansweredReviews({
      tenantId: tenantAId,
      brandId: brandAId,
      signals: {
        gscSignals: [],
        gbpSignals: [],
        rankSignals: [],
        conversionSignals: [],
        storeSignals: [
          {
            storeId: storeA1Id,
            storeName: 'Aalim Mannadi Flagship',
            city: 'Chennai',
            addressLine1: 'Angappa Naicken St',
            unansweredReviewsCount: 1,
            lowestUnansweredRating: 2,
            totalReviewsCount: 15,
          },
        ],
        merchantSignals: [],
      },
    });

    expect(reviewCandidates.length).toBe(1);
    expect(reviewCandidates[0]!.type).toBe(OpportunityType.UNANSWERED_REVIEWS);
    expect(reviewCandidates[0]!.actionType).toBe(OpportunityActionType.RESPOND_TO_REVIEWS);
    expect(reviewCandidates[0]!.evidence.find((e) => e.metric === 'lowest_rating')?.value).toBe(2);
  });

  it('6. OpportunityRuleEngine evaluates Google Merchant Center issues', async () => {
    const merchantCandidates = await OpportunityRuleEngine.evaluateMerchantIssues({
      tenantId: tenantAId,
      brandId: brandAId,
      signals: {
        gscSignals: [],
        gbpSignals: [],
        rankSignals: [],
        conversionSignals: [],
        storeSignals: [],
        merchantSignals: [
          {
            source: SignalSource.MERCHANT,
            productId: productA1Id,
            productName: 'Royal Cambodian Oud',
            sku: `SKU-OUD-${idSuffix}`,
            severity: 'ERROR',
            issueCode: 'missing_gtin_or_brand',
            description: 'Product is missing a valid GTIN or Brand attribute.',
            storeId: storeA1Id,
          },
        ],
      },
    });

    expect(merchantCandidates.length).toBe(1);
    expect(merchantCandidates[0]!.type).toBe(OpportunityType.MERCHANT_PRODUCT_ISSUE);
    expect(merchantCandidates[0]!.priority).toBe(OpportunityPriority.CRITICAL);
    expect(merchantCandidates[0]!.actionType).toBe(OpportunityActionType.FIX_MERCHANT_PRODUCT);
  });

  it('7. OpportunityService.runOpportunityEvaluation executes full pipeline and persists opportunities', async () => {
    const result = await OpportunityService.runOpportunityEvaluation(
      tenantAId,
      brandAId,
      contextA
    );

    expect(result.evaluated).toBeGreaterThanOrEqual(4);
    expect(result.created).toBeGreaterThanOrEqual(4);

    // Verify stored opportunities in DB
    const listRes = await OpportunityService.listOpportunities(
      tenantAId,
      { brandId: brandAId, status: 'ALL' },
      contextA
    );

    expect(listRes.total).toBeGreaterThanOrEqual(4);
    expect(listRes.opportunities.length).toBeGreaterThanOrEqual(4);

    // Verify evidence is loaded with provenance
    const gscOpp = listRes.opportunities.find(
      (o) => o.type === OpportunityType.HIGH_IMPRESSIONS_LOW_CTR
    );
    expect(gscOpp).toBeDefined();
    expect(gscOpp?.evidence?.some((e) => e.source === SignalSource.GSC)).toBe(true);

    const rankOpp = listRes.opportunities.find(
      (o) => o.type === OpportunityType.HIGH_DEMAND_LOW_RANK
    );
    expect(rankOpp).toBeDefined();
    expect(rankOpp?.evidence?.some((e) => e.source === SignalSource.LOCAL_RANK)).toBe(true);
  });

  it('8. Deterministic deduplication: re-running evaluation updates existing opportunities without duplicates', async () => {
    const countBefore = await OpportunityService.listOpportunities(
      tenantAId,
      { brandId: brandAId, status: 'ALL' },
      contextA
    );

    // Run evaluation pipeline again
    const rerunResult = await OpportunityService.runOpportunityEvaluation(
      tenantAId,
      brandAId,
      contextA
    );

    expect(rerunResult.created).toBe(0); // No new duplicates!
    expect(rerunResult.updated).toBeGreaterThanOrEqual(4); // Updated timestamps and evidence

    const countAfter = await OpportunityService.listOpportunities(
      tenantAId,
      { brandId: brandAId, status: 'ALL' },
      contextA
    );

    expect(countAfter.total).toBe(countBefore.total);
  });

  it('9. Human review workflow: Accept, Dismiss (with required reason), and Complete transitions', async () => {
    const list = await OpportunityService.listOpportunities(
      tenantAId,
      { brandId: brandAId, status: OpportunityStatus.OPEN },
      contextA
    );

    expect(list.opportunities.length).toBeGreaterThanOrEqual(2);
    const target1 = list.opportunities[0]!;
    const target2 = list.opportunities[1]!;

    // 1. Accept target1
    const accepted = await OpportunityService.updateWorkflowStatus(
      tenantAId,
      target1.id,
      { status: OpportunityStatus.ACCEPTED },
      contextA
    );
    expect(accepted.status).toBe(OpportunityStatus.ACCEPTED);
    expect(accepted.acceptedAt).toBeDefined();
    expect(accepted.acceptedBy).toBe(userAId);

    // 2. Complete target1
    const completed = await OpportunityService.updateWorkflowStatus(
      tenantAId,
      target1.id,
      { status: OpportunityStatus.COMPLETED },
      contextA
    );
    expect(completed.status).toBe(OpportunityStatus.COMPLETED);
    expect(completed.resolvedAt).toBeDefined();

    // 3. Dismiss target2 without reason should throw error
    await expect(
      OpportunityService.updateWorkflowStatus(
        tenantAId,
        target2.id,
        { status: OpportunityStatus.DISMISSED }, // Missing reason
        contextA
      )
    ).rejects.toThrow(/dismissal reason is required/i);

    // 4. Dismiss target2 with valid reason
    const dismissed = await OpportunityService.updateWorkflowStatus(
      tenantAId,
      target2.id,
      {
        status: OpportunityStatus.DISMISSED,
        dismissalReason: DismissalReason.BUSINESS_DECISION,
      },
      contextA
    );
    expect(dismissed.status).toBe(OpportunityStatus.DISMISSED);
    expect(dismissed.dismissalReason).toBe(DismissalReason.BUSINESS_DECISION);
    expect(dismissed.dismissedAt).toBeDefined();

    // 5. Verify dismissal cooldown prevents re-creating target2 during evaluation
    const rerun = await OpportunityService.runOpportunityEvaluation(
      tenantAId,
      brandAId,
      contextA
    );
    expect(rerun.created).toBe(0);

    const recheck = await OpportunityService.getOpportunityById(
      tenantAId,
      target2.id,
      contextA
    );
    expect(recheck.status).toBe(OpportunityStatus.DISMISSED);
  });

  it('10. Dual-Role PostgreSQL 16 RLS prevents cross-tenant access to opportunities and evidence', async () => {
    // Tenant B attempts to access Tenant A's opportunity
    const listA = await OpportunityService.listOpportunities(
      tenantAId,
      { brandId: brandAId, status: 'ALL' },
      contextA
    );
    const oppAId = listA.opportunities[0]!.id;

    // Tenant B trying to get Tenant A's opportunity must fail
    await expect(
      OpportunityService.getOpportunityById(tenantBId, oppAId, contextB)
    ).rejects.toThrow(/not found/i);

    // Direct database RLS check under localbi_app for Tenant B
    const bQueriedA = await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      return await tx.opportunity.findUnique({
        where: { id: oppAId },
      });
    });

    expect(bQueriedA).toBeNull();

    // Direct evidence RLS check
    const oppAEvidence = listA.opportunities[0]!.evidence?.[0];
    if (oppAEvidence) {
      const bQueriedEvidence = await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
        return await tx.opportunityEvidence.findUnique({
          where: { id: oppAEvidence.id },
        });
      });
      expect(bQueriedEvidence).toBeNull();
    }
  });
});
