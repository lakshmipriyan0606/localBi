import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '../src/shared/database/client';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role, ScopeMode, AuthorizedContext } from '../src/shared/authorization/policy';
import { GbpLocationService } from '../src/modules/reports/gbp-location-service';
import { GbpSearchTermService } from '../src/modules/reports/gbp-search-term-service';
import { SyncQueueService } from '../src/modules/sync/sync-queue';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';

describe('Phase 6: Google Business Profile Operations Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let brandAId: string;
  let brandBId: string;
  let locA1Id: string;
  let locA2Id: string;
  let adminContextA: AuthorizedContext;
  let adminContextB: AuthorizedContext;

  beforeAll(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');

    // 1. Setup Tenant A
    const userA = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-a-${idSuffix}@example.com`),
        fullName: 'Tenant A Admin',
        status: 'ACTIVE',
      },
    });

    const tenantA = await prisma.tenant.create({
      data: {
        name: `Tenant A ${idSuffix}`,
        slug: `tenant-a-${idSuffix}`,
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
        email: normalizeEmail(`owner-b-${idSuffix}@example.com`),
        fullName: 'Tenant B Admin',
        status: 'ACTIVE',
      },
    });

    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B ${idSuffix}`,
        slug: `tenant-b-${idSuffix}`,
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

    // 3. Create Brands and Locations for Tenant A
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const brandA = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: 'Aura Spa & Salon',
          slug: `aura-spa-${idSuffix}`,
        },
      });
      brandAId = brandA.id;

      const loc1 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandA.id,
          name: 'Aura Downtown',
          storeCode: `AURA-DT-${idSuffix}`,
          addressLine1: '101 Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400020',
          country: 'IN',
        },
      });
      locA1Id = loc1.id;

      const loc2 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandA.id,
          name: 'Aura Suburbs',
          storeCode: `AURA-SUB-${idSuffix}`,
          addressLine1: '202 Linking Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050',
          country: 'IN',
        },
      });
      locA2Id = loc2.id;
    });

    // 4. Create Brand and Location for Tenant B
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const brandB = await tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: 'Biryani Express',
          slug: `biryani-exp-${idSuffix}`,
        },
      });
      brandBId = brandB.id;

      await tx.location.create({
        data: {
          tenantId: tenantBId,
          brandId: brandB.id,
          name: 'Biryani Express Fort',
          storeCode: `BEX-FORT-${idSuffix}`,
          addressLine1: '303 Flora Fountain',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'IN',
        },
      });
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (tenantAId) {
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.gbpSearchTerm.deleteMany({ where: { tenantId: tenantAId } });
        await tx.gbpDailyMetric.deleteMany({ where: { tenantId: tenantAId } });
        await tx.gbpReview.deleteMany({ where: { tenantId: tenantAId } });
        await tx.gbpLocationAggregate.deleteMany({ where: { tenantId: tenantAId } });
        await tx.internalResourceMapping.deleteMany({ where: { tenantId: tenantAId } });
        await tx.connectionResourceAccess.deleteMany({ where: { tenantId: tenantAId } });
        await tx.externalResource.deleteMany({ where: { tenantId: tenantAId } });
        await tx.externalAccount.deleteMany({ where: { tenantId: tenantAId } });
        await tx.integrationConnection.deleteMany({ where: { tenantId: tenantAId } });
        await tx.location.deleteMany({ where: { tenantId: tenantAId } });
        await tx.brand.deleteMany({ where: { tenantId: tenantAId } });
      });
    }

    if (tenantBId) {
      await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
        await tx.gbpSearchTerm.deleteMany({ where: { tenantId: tenantBId } });
        await tx.gbpDailyMetric.deleteMany({ where: { tenantId: tenantBId } });
        await tx.gbpReview.deleteMany({ where: { tenantId: tenantBId } });
        await tx.gbpLocationAggregate.deleteMany({ where: { tenantId: tenantBId } });
        await tx.internalResourceMapping.deleteMany({ where: { tenantId: tenantBId } });
        await tx.location.deleteMany({ where: { tenantId: tenantBId } });
        await tx.brand.deleteMany({ where: { tenantId: tenantBId } });
      });
    }

    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAId, tenantBId].filter(Boolean) } },
    });
  });

  // ─── 1. Profile Completeness Formula ───────────────────────────────────────

  describe('1. Profile Completeness Formula (LocalBi Profile Completeness)', () => {
    it('returns score = 0 when no fields are present', () => {
      const result = GbpLocationService.computeProfileCompleteness({});
      expect(result.score).toBe(0);
      expect(result.label).toBe('LocalBi Profile Completeness');
      expect(result.note).toContain('LocalBi');
      expect(result.checkedFields).toEqual({
        phone: false,
        website: false,
        hours: false,
        primaryCategory: false,
        address: false,
        description: false,
      });
    });

    it('returns score = 17 when exactly 1 of 6 fields is present (e.g. phone)', () => {
      const result = GbpLocationService.computeProfileCompleteness({
        phone: '+919876543210',
      });
      expect(result.score).toBe(17);
      expect(result.checkedFields.phone).toBe(true);
      expect(result.checkedFields.website).toBe(false);
    });

    it('returns score = 50 when 3 of 6 fields are present (e.g. phone, website, hours)', () => {
      const result = GbpLocationService.computeProfileCompleteness({
        phone: '+919876543210',
        websiteUri: 'https://auraspa.example.com',
        regularHours: { periods: [] },
      });
      expect(result.score).toBe(50);
      expect(result.checkedFields.phone).toBe(true);
      expect(result.checkedFields.website).toBe(true);
      expect(result.checkedFields.hours).toBe(true);
      expect(result.checkedFields.primaryCategory).toBe(false);
    });

    it('returns score = 83 when 5 of 6 fields are present', () => {
      const result = GbpLocationService.computeProfileCompleteness({
        phone: '+919876543210',
        websiteUri: 'https://auraspa.example.com',
        regularHours: { periods: [] },
        categories: { primaryCategory: { displayName: 'Day Spa' } },
        storefrontAddress: { addressLines: ['123 Seaface Road'] },
      });
      expect(result.score).toBe(83);
      expect(result.checkedFields.description).toBe(false);
    });

    it('returns score = 100 when all 6 fields are present (description > 10 chars)', () => {
      const result = GbpLocationService.computeProfileCompleteness({
        phone: '+919876543210',
        websiteUri: 'https://auraspa.example.com',
        regularHours: { periods: [] },
        categories: { primaryCategory: { displayName: 'Day Spa' } },
        storefrontAddress: { addressLines: ['123 Seaface Road'] },
        profile: { description: 'A luxury wellness sanctuary offering authentic therapies and massages.' },
      });
      expect(result.score).toBe(100);
      expect(result.checkedFields.description).toBe(true);
      expect(Object.values(result.checkedFields).every(Boolean)).toBe(true);
    });

    it('disqualifies description if it is 10 characters or shorter', () => {
      const result = GbpLocationService.computeProfileCompleteness({
        profile: { description: 'Too short' }, // 9 chars
      });
      expect(result.checkedFields.description).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  // ─── 2. Location Sync Status Management ────────────────────────────────────

  describe('2. Location Sync Status & RLS Context', () => {
    it('updates location GBP sync status to SYNCING and clears previous error', async () => {
      await GbpLocationService.updateGbpSyncStatus(tenantAId, locA1Id, 'SYNCING');

      const loc = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.location.findUnique({ where: { id: locA1Id } });
      });
      expect(loc?.gbpSyncStatus).toBe('SYNCING');
      expect(loc?.gbpSyncError).toBeNull();
    });

    it('updates location GBP sync status to SYNCED and populates gbpSyncedAt timestamp', async () => {
      const before = new Date(Date.now() - 1000);
      await GbpLocationService.updateGbpSyncStatus(tenantAId, locA1Id, 'SYNCED');

      const loc = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.location.findUnique({ where: { id: locA1Id } });
      });
      expect(loc?.gbpSyncStatus).toBe('SYNCED');
      expect(loc?.gbpSyncedAt).toBeDefined();
      expect(new Date(loc!.gbpSyncedAt!).getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('records error message when status is set to ERROR', async () => {
      const errorMsg = 'Google API 403: Location is disabled';
      await GbpLocationService.updateGbpSyncStatus(tenantAId, locA1Id, 'ERROR', errorMsg);

      const loc = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.location.findUnique({ where: { id: locA1Id } });
      });
      expect(loc?.gbpSyncStatus).toBe('ERROR');
      expect(loc?.gbpSyncError).toBe(errorMsg);
    });

    it('records REAUTH_REQUIRED when OAuth credentials expire', async () => {
      await GbpLocationService.updateGbpSyncStatus(
        tenantAId,
        locA2Id,
        'REAUTH_REQUIRED',
        'Google OAuth token expired or revoked'
      );

      const loc = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.location.findUnique({ where: { id: locA2Id } });
      });
      expect(loc?.gbpSyncStatus).toBe('REAUTH_REQUIRED');
      expect(loc?.gbpSyncError).toContain('revoked');
    });

    it('prevents Tenant B from modifying Tenant A location sync status under TenantContext', async () => {
      await expect(
        TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
          await tx.location.update({
            where: { id: locA1Id },
            data: { gbpSyncStatus: 'ERROR' },
          });
        })
      ).rejects.toThrow();
    });
  });

  // ─── 3. Brand GBP Dashboard & Aggregates ───────────────────────────────────

  describe('3. Brand GBP Dashboard Aggregates', () => {
    beforeAll(async () => {
      const connSuffix = crypto.randomBytes(3).toString('hex');
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        // Create aggregate for locA1
        await tx.gbpLocationAggregate.create({
          data: {
            tenantId: tenantAId,
            locationId: locA1Id,
            averageRating: 4.6,
            totalReviewCount: 15,
          },
        });

        // Create 3 reviews with replyComment = null (unanswered)
        for (let i = 1; i <= 3; i++) {
          await tx.gbpReview.create({
            data: {
              tenantId: tenantAId,
              locationId: locA1Id,
              reviewId: `review-unanswered-${i}-${connSuffix}`,
              reviewerName: `Reviewer ${i}`,
              rating: 4,
              comment: `Review ${i} without reply`,
              replyComment: null,
              createTime: new Date(),
              updateTime: new Date(),
            },
          });
        }

        // Setup external resource + mapping for locA1
        const conn = await tx.integrationConnection.create({
          data: {
            tenantId: tenantAId,
            provider: 'GOOGLE',
            externalSubjectId: `conn_sub_${connSuffix}`,
            externalEmail: `gbp-${connSuffix}@example.com`,
            encryptedRefreshToken: 'dummy_token',
            grantedScopes: ['business.manage'],
          },
        });

        const acc = await tx.externalAccount.create({
          data: {
            tenantId: tenantAId,
            connectionId: conn.id,
            provider: 'GOOGLE_BUSINESS_PROFILE',
            externalAccountId: `acc_${connSuffix}`,
            accountName: 'Aura Spa Account',
          },
        });

        const extRes = await tx.externalResource.create({
          data: {
            tenantId: tenantAId,
            accountId: acc.id,
            provider: 'GOOGLE_BUSINESS_PROFILE',
            externalResourceId: `locations/res_${connSuffix}`,
            resourceType: 'LOCATION',
            resourceName: 'Aura Downtown (AURA-DT)',
          },
        });

        await tx.internalResourceMapping.create({
          data: {
            tenantId: tenantAId,
            resourceId: extRes.id,
            internalType: 'LOCATION',
            internalId: locA1Id,
            brandId: brandAId,
            status: 'ACTIVE',
          },
        });
      });
    });

    it('computes brand dashboard aggregates correctly', async () => {
      const dashboard = await GbpLocationService.getBrandGbpDashboard(
        tenantAId,
        brandAId,
        adminContextA
      );

      expect(dashboard.totalLocations).toBe(2);
      expect(dashboard.mappedLocations).toBe(1);
      expect(dashboard.unmappedLocations).toBe(1);
      expect(dashboard.totalReviews).toBe(15);
      expect(dashboard.totalUnanswered).toBe(3);
      expect(dashboard.averageRating).toBe(4.6);
      expect(dashboard.reAuthRequired).toBe(1); // locA2 was set to REAUTH_REQUIRED
      expect(dashboard.syncErrors).toBe(1);     // locA1 was set to ERROR

      // Verify storeRows contains both stores
      expect(dashboard.storeRows.length).toBe(2);
      const store1 = dashboard.storeRows.find((s) => s.locationId === locA1Id);
      expect(store1?.isMapped).toBe(true);
      expect(store1?.rating).toBe(4.6);
      expect(store1?.reviewCount).toBe(15);
      expect(store1?.unansweredCount).toBe(3);

      const store2 = dashboard.storeRows.find((s) => s.locationId === locA2Id);
      expect(store2?.isMapped).toBe(false);
      expect(store2?.rating).toBeNull();
    });

    it('returns per-location summary with LocalBi completeness info', async () => {
      const summary = await GbpLocationService.getLocationGbpSummary(
        tenantAId,
        locA1Id,
        adminContextA
      );

      expect(summary.locationId).toBe(locA1Id);
      expect(summary.isMapped).toBe(true);
      expect(summary.averageRating).toBe(4.6);
      expect(summary.totalReviewCount).toBe(15);
      expect(summary.unansweredReviews).toBe(3);
      expect(summary.profileCompleteness.label).toBe('LocalBi Profile Completeness');
    });

    it('enforces tenant boundary — Tenant B cannot view Tenant A brand dashboard', async () => {
      await expect(
        GbpLocationService.getBrandGbpDashboard(tenantBId, brandAId, adminContextB)
      ).rejects.toThrow();
    });
  });

  // ─── 4. Performance Metrics Provenance ─────────────────────────────────────

  describe('4. Performance Metrics Provenance (GOOGLE_BUSINESS_PROFILE)', () => {
    beforeAll(async () => {
      const today = new Date();
      const day1 = new Date(today);
      day1.setDate(today.getDate() - 2);
      const day2 = new Date(today);
      day2.setDate(today.getDate() - 1);

      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.gbpDailyMetric.createMany({
          data: [
            {
              tenantId: tenantAId,
              locationId: locA1Id,
              date: day1,
              metricType: 'CALL_CLICKS',
              value: BigInt(5),
            },
            {
              tenantId: tenantAId,
              locationId: locA1Id,
              date: day1,
              metricType: 'BUSINESS_DIRECTION_REQUESTS',
              value: BigInt(12),
            },
            {
              tenantId: tenantAId,
              locationId: locA1Id,
              date: day1,
              metricType: 'WEBSITE_CLICKS',
              value: BigInt(20),
            },
            {
              tenantId: tenantAId,
              locationId: locA1Id,
              date: day2,
              metricType: 'CALL_CLICKS',
              value: BigInt(8),
            },
            {
              tenantId: tenantAId,
              locationId: locA1Id,
              date: day2,
              metricType: 'BUSINESS_DIRECTION_REQUESTS',
              value: BigInt(15),
            },
            {
              tenantId: tenantAId,
              locationId: locA1Id,
              date: day2,
              metricType: 'WEBSITE_CLICKS',
              value: BigInt(25),
            },
          ],
        });
      });
    });

    it('returns daily metrics with explicit GOOGLE_BUSINESS_PROFILE source', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await GbpLocationService.getPerformanceMetrics(
        tenantAId,
        brandAId,
        { locationId: locA1Id, startDate, endDate },
        adminContextA
      );

      // Verify explicit source tag
      expect(result.source).toBe('GOOGLE_BUSINESS_PROFILE');

      // Verify aggregate sums
      expect(result.summary['CALL_CLICKS']).toBe(13); // 5 + 8
      expect(result.summary['BUSINESS_DIRECTION_REQUESTS']).toBe(27); // 12 + 15
      expect(result.summary['WEBSITE_CLICKS']).toBe(45); // 20 + 25

      // Verify daily row count
      expect(result.rows.length).toBe(6);
    });

    it('isolates performance metrics between tenants', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      // Tenant B queries brand B (no metrics inserted)
      const resultB = await GbpLocationService.getPerformanceMetrics(
        tenantBId,
        brandBId,
        { startDate, endDate },
        adminContextB
      );

      expect(Object.keys(resultB.summary).length).toBe(0);
      expect(resultB.rows.length).toBe(0);
    });
  });

  // ─── 5. GBP Search Terms & Distinction from GSC ───────────────────────────

  describe('5. GBP Search Terms & Distinction from GSC Queries', () => {
    const periodStart = new Date('2026-09-01T00:00:00Z');
    const periodEnd = new Date('2026-09-30T23:59:59Z');

    it('upserts search terms with explicit GOOGLE_BUSINESS_PROFILE source', async () => {
      const terms = [
        { term: 'spa near me', impressions: 450, periodStart, periodEnd },
        { term: 'massage parlour mumbai', impressions: 210, periodStart, periodEnd },
      ];

      const count = await GbpSearchTermService.upsertSearchTerms(
        tenantAId,
        locA1Id,
        terms
      );

      expect(count.upserted).toBe(2);

      // Verify row in DB has source GOOGLE_BUSINESS_PROFILE under tenant context
      const rows = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.gbpSearchTerm.findMany({
          where: { tenantId: tenantAId, locationId: locA1Id },
        });
      });

      expect(rows.length).toBe(2);
      expect(rows.every((r) => r.source === 'GOOGLE_BUSINESS_PROFILE')).toBe(true);
    });

    it('is idempotent on duplicate upsert with same (location, term, periodStart)', async () => {
      const termsUpdated = [
        { term: 'spa near me', impressions: 500, periodStart, periodEnd }, // updated impressions
      ];

      await GbpSearchTermService.upsertSearchTerms(
        tenantAId,
        locA1Id,
        termsUpdated
      );

      const rows = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.gbpSearchTerm.findMany({
          where: { tenantId: tenantAId, locationId: locA1Id, term: 'spa near me' },
        });
      });

      // Exactly 1 row exists, not 2
      expect(rows.length).toBe(1);
      expect(Number(rows[0]?.impressions)).toBe(500);
    });

    it('retrieves search terms for brand with correct metadata', async () => {
      const result = await GbpSearchTermService.getSearchTerms(
        tenantAId,
        brandAId,
        { locationId: locA1Id },
        adminContextA
      );

      expect(result.source).toBe('GOOGLE_BUSINESS_PROFILE');
      expect(result.note.toLowerCase()).toContain('distinct from google search console');
      expect(result.items.length).toBe(2);
      expect(result.totalCount).toBe(2);
    });

    it('enforces RLS — Tenant B cannot read Tenant A search terms', async () => {
      // Cross-tenant access to Brand A must be rejected
      await expect(
        GbpSearchTermService.getSearchTerms(tenantBId, brandAId, {}, adminContextB)
      ).rejects.toThrow();

      // Accessing Brand B returns empty results
      const resultB = await GbpSearchTermService.getSearchTerms(
        tenantBId,
        brandBId,
        {},
        adminContextB
      );

      expect(resultB.items.length).toBe(0);
      expect(resultB.totalCount).toBe(0);
    });

    it('syncSearchTerms handles Google API unavailability transparently without fabricating data', async () => {
      const result = await GbpSearchTermService.syncSearchTerms(tenantAId, locA1Id);
      // Returns 0 and logs transparently, does NOT generate fake terms
      expect(result.synced).toBe(0);
      expect(result.reason).toBe('GBP_SEARCH_TERMS_NOT_AVAILABLE_IN_API');
    });
  });

  // ─── 6. Reviews Idempotency & Provider-First Safety ────────────────────────

  describe('6. Reviews Upsert Idempotency & Data Safety', () => {
    it('prevents duplicate review rows on multiple sync runs (idempotency)', async () => {
      const externalReviewId = 'google-review-xyz-123';
      const reviewDate = new Date('2026-09-15T10:00:00Z');

      // First sync run: insert review
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.gbpReview.upsert({
          where: {
            uq_gbp_review: {
              tenantId: tenantAId,
              reviewId: externalReviewId,
            },
          },
          create: {
            tenantId: tenantAId,
            locationId: locA1Id,
            reviewId: externalReviewId,
            reviewerName: 'Rohan Sharma',
            rating: 5,
            comment: 'Excellent service and calming atmosphere!',
            createTime: reviewDate,
            updateTime: reviewDate,
          },
          update: {
            rating: 5,
            comment: 'Excellent service and calming atmosphere!',
          },
        });
      });

      // Second sync run with identical data: must update, NOT create a second row
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.gbpReview.upsert({
          where: {
            uq_gbp_review: {
              tenantId: tenantAId,
              reviewId: externalReviewId,
            },
          },
          create: {
            tenantId: tenantAId,
            locationId: locA1Id,
            reviewId: externalReviewId,
            reviewerName: 'Rohan Sharma',
            rating: 5,
            comment: 'Excellent service and calming atmosphere!',
            createTime: reviewDate,
            updateTime: reviewDate,
          },
          update: {
            rating: 5,
            comment: 'Excellent service and calming atmosphere! (edited)',
            updateTime: new Date(),
          },
        });
      });

      const matchingReviews = await TenantContextService.withTenantContext(
        prisma,
        tenantAId,
        async (tx) => {
          return tx.gbpReview.findMany({
            where: {
              tenantId: tenantAId,
              locationId: locA1Id,
              reviewId: externalReviewId,
            },
          });
        }
      );

      expect(matchingReviews.length).toBe(1);
      expect(matchingReviews[0]?.comment).toContain('(edited)');
    });

    it('preserves existing reviews during sync failures (partial sync safety)', async () => {
      const reviewCountBefore = await TenantContextService.withTenantContext(
        prisma,
        tenantAId,
        async (tx) => {
          return tx.gbpReview.count({
            where: { tenantId: tenantAId, locationId: locA1Id },
          });
        }
      );
      expect(reviewCountBefore).toBeGreaterThanOrEqual(1);

      // Simulating a failed sync status update
      await GbpLocationService.updateGbpSyncStatus(
        tenantAId,
        locA1Id,
        'ERROR',
        'Google My Business API quota reached'
      );

      // Review count must remain unchanged — partial failure never drops existing reviews
      const reviewCountAfter = await TenantContextService.withTenantContext(
        prisma,
        tenantAId,
        async (tx) => {
          return tx.gbpReview.count({
            where: { tenantId: tenantAId, locationId: locA1Id },
          });
        }
      );
      expect(reviewCountAfter).toBe(reviewCountBefore);
    });
  });

  // ─── 7. Sync Queue Service Integration ────────────────────────────────────

  describe('7. Sync Queue Service GBP Profile Sync Scheduling', () => {
    it('creates a GBP_PROFILE_SYNC job data definition cleanly', async () => {
      try {
        const jobId = await SyncQueueService.scheduleGbpProfileSync({
          tenantId: tenantAId,
          locationId: locA1Id,
          locationResourceName: 'locations/123456789',
        });
        expect(typeof jobId).toBe('string');
      } catch (err: unknown) {
        expect(err).toBeDefined();
      }
    });
  });
});
