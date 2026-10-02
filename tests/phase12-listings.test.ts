import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '../src/shared/database/client';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role, AuthorizedContext, ScopeMode } from '../src/shared/authorization/policy';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';
import {
  NapNormalizer,
  ListingProfileService,
  ListingMatchService,
  ListingService,
  DuplicateDetectionService,
  ListingOpportunityBridge,
  DirectoryRegistry,
  ListingProvider,
  MatchStatus,
  MatchConfidence,
  NapOverallStatus,
  ChangeSetStatus,
} from '../src/modules/listings';

describe('Phase 12: Local Listings + Citations + Directory Presence Tests', () => {
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

  const idSuffix = crypto.randomBytes(4).toString('hex');

  beforeAll(async () => {
    // 1. Create Users
    const userA = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-listing-a-${idSuffix}@example.com`),
        fullName: 'Tenant A Listing Owner',
        status: 'ACTIVE',
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-listing-b-${idSuffix}@example.com`),
        fullName: 'Tenant B Listing Owner',
        status: 'ACTIVE',
      },
    });
    userBId = userB.id;

    // 2. Create Tenants
    const tenantA = await prisma.tenant.create({
      data: {
        name: `Tenant A Listings ${idSuffix}`,
        slug: `tenant-listing-a-${idSuffix}`,
        website: 'https://heritageperfumes.example.com',
        status: 'ACTIVE',
      },
    });
    tenantAId = tenantA.id;

    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B Listings ${idSuffix}`,
        slug: `tenant-listing-b-${idSuffix}`,
        website: 'https://oasisfragrance.example.com',
        status: 'ACTIVE',
      },
    });
    tenantBId = tenantB.id;

    // 3. Create Brands and Locations
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const brandA = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: `Heritage Perfumes ${idSuffix}`,
          slug: `heritage-perfumes-${idSuffix}`,
        },
      });
      brandAId = brandA.id;

      const storeA1 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Heritage Perfumes Indiranagar',
          storeCode: `IND-${idSuffix}`,
          addressLine1: '100 Feet Road, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          country: 'IN',
          phone: '+91 98765 43210',
          googlePlaceId: `ChIJ_store_a1_${idSuffix}`,
          latitude: 12.9716,
          longitude: 77.5946,
          timezone: 'Asia/Kolkata',
          version: 1,
        },
      });
      storeA1Id = storeA1.id;

      const storeA2 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Heritage Perfumes Koramangala',
          storeCode: `KOR-${idSuffix}`,
          addressLine1: '80 Feet Road, Koramangala',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560034',
          country: 'IN',
          phone: '+91 98765 43211',
          googlePlaceId: `ChIJ_store_a2_${idSuffix}`,
          latitude: 12.9352,
          longitude: 77.6245,
          timezone: 'Asia/Kolkata',
          version: 1,
        },
      });
      storeA2Id = storeA2.id;
    });

    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const brandB = await tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: `Oasis Fragrance ${idSuffix}`,
          slug: `oasis-fragrance-${idSuffix}`,
        },
      });
      brandBId = brandB.id;
    });

    // 4. Authorized Contexts
    contextA = {
      userId: userAId,
      tenantId: tenantAId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set([brandAId]),
      grantedLocationIds: new Set([storeA1Id, storeA2Id]),
    };

    contextB = {
      userId: userBId,
      tenantId: tenantBId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set([brandBId]),
      grantedLocationIds: new Set(),
    };
  });

  describe('1. NAP Normalization Utilities', () => {
    it('normalizes various phone number formats to standard digits', () => {
      expect(NapNormalizer.normalizePhone('+91 98765 43210')).toBe('9876543210');
      expect(NapNormalizer.normalizePhone('09876543210')).toBe('9876543210');
      expect(NapNormalizer.normalizePhone('+91-98765-43210')).toBe('9876543210');
      expect(NapNormalizer.normalizePhone('(091) 9876543210')).toBe('9876543210');
      expect(NapNormalizer.normalizePhone('9876543210')).toBe('9876543210');
    });

    it('accurately verifies phone equivalence across formatting styles', () => {
      expect(NapNormalizer.arePhonesEquivalent('+91 98765 43210', '09876543210')).toBe(true);
      expect(NapNormalizer.arePhonesEquivalent('+91-98765-43210', '9876543210')).toBe(true);
      expect(NapNormalizer.arePhonesEquivalent('+91 98765 43210', '+91 98765 43210')).toBe(true);
    });

    it('accurately detects true phone mismatches', () => {
      expect(NapNormalizer.arePhonesEquivalent('+91 98765 43210', '+91 98765 99999')).toBe(false);
      expect(NapNormalizer.arePhonesEquivalent('+91 98765 43210', null)).toBe(false);
    });

    it('normalizes business names by stripping legal entity forms and punctuation', () => {
      expect(NapNormalizer.normalizeName('Heritage Perfumes Pvt. Ltd.')).toBe('heritage perfumes');
      expect(NapNormalizer.normalizeName('Heritage Perfumes, LLC')).toBe('heritage perfumes');
      expect(NapNormalizer.normalizeName('Heritage Perfumes Private Limited')).toBe('heritage perfumes');
      expect(NapNormalizer.normalizeName('Heritage Perfumes Inc.')).toBe('heritage perfumes');
    });

    it('computes accurate name similarity', () => {
      const sim = NapNormalizer.compareNames('Heritage Perfumes Indiranagar', 'Heritage Perfumes Indiranagar Store');
      expect(sim).toBeGreaterThanOrEqual(0.7);
    });

    it('normalizes street address abbreviations', () => {
      const norm1 = NapNormalizer.normalizeAddress('100 Ft Rd, Indiranagar');
      const norm2 = NapNormalizer.normalizeAddress('100 Feet Road, Indiranagar');
      expect(norm1).toContain('road');
      expect(norm2).toContain('road');
    });

    it('normalizes website URLs by stripping protocol, www, query params, and trailing slash', () => {
      expect(NapNormalizer.normalizeWebsite('https://www.example.com/store/')).toBe('example.com/store');
      expect(NapNormalizer.normalizeWebsite('http://example.com/store?utm_source=google')).toBe('example.com/store');
      expect(NapNormalizer.areWebsitesEquivalent('https://example.com', 'http://www.example.com/')).toBe(true);
    });

    it('normalizes times to 24-hour HH:MM format', () => {
      expect(NapNormalizer.normalizeTime('09:30')).toBe('09:30');
      expect(NapNormalizer.normalizeTime('9:30 AM')).toBe('09:30');
      expect(NapNormalizer.normalizeTime('6:30 PM')).toBe('18:30');
      expect(NapNormalizer.normalizeTime('18:30:00')).toBe('18:30');
    });
  });

  describe('2. Canonical Store Profile and Structured Hours', () => {
    it('fetches canonical store profile from Location model', async () => {
      const profile = await ListingProfileService.getCanonicalStoreProfile(tenantAId, storeA1Id);
      expect(profile.storeId).toBe(storeA1Id);
      expect(profile.name).toBe('Heritage Perfumes Indiranagar');
      expect(profile.phone).toBe('+91 98765 43210');
      expect(profile.googlePlaceId).toBe(`ChIJ_store_a1_${idSuffix}`);
      expect(profile.website).toBe('https://heritageperfumes.example.com');
      expect(profile.hours).toHaveLength(7);
    });

    it('updates and persists 7-day structured store hours in listing_store_hours', async () => {
      const newHours = [
        { dayOfWeek: 0, isClosed: false, openTime: '10:00', closeTime: '20:00' },
        { dayOfWeek: 1, isClosed: false, openTime: '10:00', closeTime: '20:00' },
        { dayOfWeek: 2, isClosed: false, openTime: '10:00', closeTime: '20:00' },
        { dayOfWeek: 3, isClosed: false, openTime: '10:00', closeTime: '20:00' },
        { dayOfWeek: 4, isClosed: false, openTime: '10:00', closeTime: '20:00' },
        { dayOfWeek: 5, isClosed: false, openTime: '10:00', closeTime: '21:00' },
        { dayOfWeek: 6, isClosed: true, openTime: null, closeTime: null },
      ];

      const saved = await ListingProfileService.updateStoreHours(tenantAId, storeA1Id, newHours);
      expect(saved).toHaveLength(7);
      expect(saved[6]?.isClosed).toBe(true);

      const profile = await ListingProfileService.getCanonicalStoreProfile(tenantAId, storeA1Id);
      expect(profile.hours.find(h => h.dayOfWeek === 6)?.isClosed).toBe(true);
      expect(profile.hours.find(h => h.dayOfWeek === 0)?.openTime).toBe('10:00');
    });
  });

  describe('3. Directory Provider Connectors and Capabilities', () => {
    it('correctly declares capabilities for Google Business Profile', () => {
      const gbp = DirectoryRegistry.getProvider(ListingProvider.GOOGLE_BUSINESS_PROFILE);
      expect(gbp.capabilities.canWrite).toBe(true);
      expect(gbp.capabilities.canDiscover).toBe(true);
      expect(gbp.capabilities.isManualOnly).toBe(false);
      expect(gbp.capabilities.supportsStoreHours).toBe(true);
      expect(gbp.capabilities.supportsDuplicatesDetection).toBe(true);
    });

    it('correctly declares capabilities for manual-only providers (Apple, Bing, Justdial)', () => {
      const apple = DirectoryRegistry.getProvider(ListingProvider.APPLE_BUSINESS_CONNECT);
      expect(apple.capabilities.canWrite).toBe(false);
      expect(apple.capabilities.isManualOnly).toBe(true);
      expect(apple.capabilities.portalUrl).toContain('apple.com');

      const bing = DirectoryRegistry.getProvider(ListingProvider.BING_PLACES);
      expect(bing.capabilities.canWrite).toBe(false);
      expect(bing.capabilities.isManualOnly).toBe(true);
      expect(bing.capabilities.portalUrl).toContain('bingplaces.com');

      const justdial = DirectoryRegistry.getProvider(ListingProvider.JUSTDIAL);
      expect(justdial.capabilities.isManualOnly).toBe(true);
    });

    it('generates clear, actionable manual portal instructions for manual-only providers', async () => {
      const apple = DirectoryRegistry.getProvider(ListingProvider.APPLE_BUSINESS_CONNECT);
      const canonical = await ListingProfileService.getCanonicalStoreProfile(tenantAId, storeA1Id);

      const instructions = apple.getPortalInstructions(canonical, [
        {
          field: 'phone',
          canonicalValue: '+91 98765 43210',
          providerValue: '+91 98765 00000',
          message: 'Phone mismatch',
        },
      ]);

      expect(instructions).toContain('Apple Business Connect');
      expect(instructions).toContain('https://businessconnect.apple.com');
      expect(instructions).toContain('+91 98765 43210');
      expect(instructions).toContain('PHONE');
    });
  });

  describe('4. Listing Match Confidence and Ambiguity Detection', () => {
    it('evaluates HIGH match confidence on shared place ID and phone match', async () => {
      const canonical = await ListingProfileService.getCanonicalStoreProfile(tenantAId, storeA1Id);
      const snapshot = {
        name: 'Heritage Perfumes Indiranagar',
        phone: '09876543210', // format variation
        address: '100 Feet Rd, Indiranagar Bengaluru',
        externalListingId: canonical.googlePlaceId!,
        extra: { placeId: canonical.googlePlaceId },
      };

      const result = ListingMatchService.evaluateMatch(canonical, snapshot);
      expect(result.status).toBe(MatchStatus.MATCHED);
      expect(result.confidence).toBe(MatchConfidence.HIGH);
      expect(result.phoneMatched).toBe(true);
      expect(result.placeIdMatched).toBe(true);
      expect(result.evidenceSummary).toContain('Direct Place ID match');
    });

    it('detects AMBIGUOUS status when name matches but phone has a severe conflict', async () => {
      const canonical = await ListingProfileService.getCanonicalStoreProfile(tenantAId, storeA1Id);
      const snapshot = {
        name: 'Heritage Perfumes Indiranagar',
        phone: '+91 11111 22222', // completely different phone
        address: '100 Feet Road, Indiranagar',
      };

      const result = ListingMatchService.evaluateMatch(canonical, snapshot);
      expect(result.status).toBe(MatchStatus.AMBIGUOUS);
      expect(result.confidence).toBe(MatchConfidence.MEDIUM);
      expect(result.evidenceSummary).toContain('Phone mismatch');
    });
  });

  describe('5. Listing Connection, NAP Audit, and Opportunity Bridge', () => {
    it('connects a listing and audits it as HEALTHY when all fields match', async () => {
      const listing = await ListingService.connectListing(tenantAId, storeA1Id, {
        provider: ListingProvider.GOOGLE_BUSINESS_PROFILE,
        externalListingId: `ChIJ_store_a1_${idSuffix}`,
        providerUrl: 'https://maps.google.com/?cid=123',
        snapshot: {
          name: 'Heritage Perfumes Indiranagar',
          phone: '+91 98765 43210',
          address: '100 Feet Road, Indiranagar Bengaluru 560038',
          website: 'https://heritageperfumes.example.com',
        },
      });

      expect(listing.id).toBeDefined();
      expect(listing.napOverallStatus).toBe(NapOverallStatus.HEALTHY);
      expect(listing.napNameStatus).toBe('MATCH');
      expect(listing.napPhoneStatus).toBe('MATCH');
    });

    it('detects MISMATCH when provider phone differs, updating status and emitting Opportunity', async () => {
      const listing = await ListingService.connectListing(tenantAId, storeA1Id, {
        provider: ListingProvider.APPLE_BUSINESS_CONNECT,
        externalListingId: `apple_store_a1_${idSuffix}`,
        providerUrl: 'https://maps.apple.com/place?id=123',
        snapshot: {
          name: 'Heritage Perfumes Indiranagar',
          phone: '+91 88888 77777', // Incorrect phone
          address: '100 Feet Road, Indiranagar Bengaluru 560038',
          website: 'https://heritageperfumes.example.com',
        },
      });

      expect(listing.napOverallStatus).toBe(NapOverallStatus.MISMATCH);
      expect(listing.napPhoneStatus).toBe('MISMATCH');

      // Verify Opportunity was emitted to Phase 10 SEO Opportunity Engine
      const opportunity = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.opportunity.findFirst({
          where: {
            tenantId: tenantAId,
            storeId: storeA1Id,
            type: 'NAP_MISMATCH',
          },
          include: { evidence: true },
        });
      });

      expect(opportunity).toBeDefined();
      expect(opportunity?.title).toContain('APPLE_BUSINESS_CONNECT');
      expect(opportunity?.evidence.length).toBeGreaterThan(0);
      expect(opportunity?.evidence[0]?.source).toBe('LOCALBI');
    });
  });

  describe('6. Listing Change Set Proposal & Human Approval Gate', () => {
    let changeSetId: string;
    let appleListingId: string;

    it('proposes a ListingChangeSet for human approval when differences exist', async () => {
      const appleListing = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.directoryListing.findFirst({
          where: {
            tenantId: tenantAId,
            storeId: storeA1Id,
            provider: ListingProvider.APPLE_BUSINESS_CONNECT,
          },
        });
      });
      expect(appleListing).toBeDefined();
      appleListingId = appleListing!.id;

      const changeSet = await ListingService.proposeChangeSet(tenantAId, appleListingId, userAId);
      expect(changeSet.id).toBeDefined();
      expect(changeSet.status).toBe(ChangeSetStatus.PENDING);
      expect(Array.isArray(changeSet.proposedChanges)).toBe(true);

      changeSetId = changeSet.id;
    });

    it('allows human reviewer to reject a proposed change set', async () => {
      // Create a temporary change set to reject
      const tempChangeSet = await ListingService.proposeChangeSet(tenantAId, appleListingId, userAId);
      const rejected = await ListingService.reviewChangeSet(
        tenantAId,
        tempChangeSet.id,
        'REJECTED',
        userAId,
        'Wrong branch phone number target'
      );

      expect(rejected.status).toBe(ChangeSetStatus.REJECTED);
      expect(rejected.reviewNote).toBe('Wrong branch phone number target');
    });

    it('detects STALE change set if canonical store profile was modified after proposal', async () => {
      // Simulate canonical Location update
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.location.update({
          where: { id: storeA1Id },
          data: { updatedAt: new Date(Date.now() + 5000) },
        });
      });

      // Attempting to approve the earlier changeSetId should mark it as STALE
      const reviewed = await ListingService.reviewChangeSet(
        tenantAId,
        changeSetId,
        'APPROVED',
        userAId
      );

      expect(reviewed.status).toBe(ChangeSetStatus.STALE);
      expect(reviewed.reviewNote).toContain('stale');
    });

    it('approves a fresh change set and sets MANUAL_ACTION_REQUIRED for manual providers', async () => {
      // Create fresh changeset
      const freshChangeSet = await ListingService.proposeChangeSet(tenantAId, appleListingId, userAId);

      const approved = await ListingService.reviewChangeSet(
        tenantAId,
        freshChangeSet.id,
        'APPROVED',
        userAId,
        'Approved by LocalBI Administrator'
      );

      expect(approved.status).toBe(ChangeSetStatus.MANUAL_ACTION_REQUIRED);
      expect(approved.providerResult).toBe('MANUAL_ACTION_REQUIRED');
      expect(approved.reviewNote).toContain('Apple Business Connect');
      expect(approved.reviewNote).toContain('https://businessconnect.apple.com');
    });
  });

  describe('7. Duplicate Listing Detection Engine', () => {
    it('detects duplicate candidates sharing the same phone or place ID across listings', async () => {
      // Connect duplicate listing for the same phone on Bing
      const bingListing1 = await ListingService.connectListing(tenantAId, storeA1Id, {
        provider: ListingProvider.BING_PLACES,
        externalListingId: `bing_1_${idSuffix}`,
        snapshot: {
          name: 'Heritage Perfumes Bangalore',
          phone: '+91 98765 43210',
          address: '100 Feet Road, Indiranagar',
        },
      });

      // Connect another listing on Bing with identical phone and similar name
      const bingListing2 = await ListingService.connectListing(tenantAId, storeA2Id, {
        provider: ListingProvider.BING_PLACES,
        externalListingId: `bing_2_${idSuffix}`,
        snapshot: {
          name: 'Heritage Perfumes Indiranagar Branch',
          phone: '09876543210', // Identical phone!
          address: '100 Feet Road, Indiranagar',
        },
      });

      const scanResult = await DuplicateDetectionService.scanForDuplicates(tenantAId, storeA1Id);
      expect(scanResult.detectedCount).toBeGreaterThan(0);

      const duplicates = await DuplicateDetectionService.getDuplicates(tenantAId, {
        provider: ListingProvider.BING_PLACES,
      });

      expect(duplicates.length).toBeGreaterThan(0);
      const dup = duplicates[0]!;
      expect(dup.sharedPhone).toBe(true);
      expect(dup.status).toBe('OPEN');
    });

    it('resolves duplicate candidate with decision status and audit note', async () => {
      const duplicates = await DuplicateDetectionService.getDuplicates(tenantAId);
      expect(duplicates.length).toBeGreaterThan(0);

      const target = duplicates[0]!;
      const resolved = await DuplicateDetectionService.resolveCandidate(
        tenantAId,
        target.id,
        {
          status: 'CONFIRMED_DUPLICATE',
          resolvedBy: userAId,
          resolutionNote: 'Confirmed duplicate on Bing Places. Contacting support for merge.',
        }
      );

      expect(resolved.status).toBe('CONFIRMED_DUPLICATE');
      expect(resolved.resolvedBy).toBe(userAId);
      expect(resolved.resolvedAt).toBeDefined();
    });
  });

  describe('8. High-Level Summary Aggregations', () => {
    it('returns brand-level listing health summary metrics', async () => {
      const summary = await ListingService.getListingSummary(tenantAId, brandAId);
      expect(summary.totalListings).toBeGreaterThan(0);
      expect(summary.healthScore).toBeGreaterThanOrEqual(0);
      expect(summary.healthScore).toBeLessThanOrEqual(100);
      expect(summary.pendingChangeSets).toBeDefined();
      expect(summary.openDuplicates).toBeDefined();
    });
  });

  describe('9. Multi-Tenant Dual-Role RLS Isolation', () => {
    it('prevents Tenant B from querying Tenant A directory listings', async () => {
      // Under Tenant B context, querying Tenant A directory listings returns 0 rows
      const itemsUnderTenantB = await TenantContextService.withTenantContext(
        prisma,
        tenantBId,
        async (tx) => {
          return await tx.directoryListing.findMany({
            where: { tenantId: tenantAId },
          });
        }
      );

      expect(itemsUnderTenantB.length).toBe(0);
    });

    it('prevents Tenant B from querying Tenant A listing change sets', async () => {
      const changeSetsUnderTenantB = await TenantContextService.withTenantContext(
        prisma,
        tenantBId,
        async (tx) => {
          return await tx.listingChangeSet.findMany({
            where: { tenantId: tenantAId },
          });
        }
      );

      expect(changeSetsUnderTenantB.length).toBe(0);
    });

    it('prevents Tenant B from querying Tenant A duplicate candidates', async () => {
      const duplicatesUnderTenantB = await TenantContextService.withTenantContext(
        prisma,
        tenantBId,
        async (tx) => {
          return await tx.duplicateListingCandidate.findMany({
            where: { tenantId: tenantAId },
          });
        }
      );

      expect(duplicatesUnderTenantB.length).toBe(0);
    });

    it('prevents Tenant B from querying Tenant A structured store hours', async () => {
      const hoursUnderTenantB = await TenantContextService.withTenantContext(
        prisma,
        tenantBId,
        async (tx) => {
          return await tx.listingStoreHours.findMany({
            where: { tenantId: tenantAId },
          });
        }
      );

      expect(hoursUnderTenantB.length).toBe(0);
    });
  });
});
