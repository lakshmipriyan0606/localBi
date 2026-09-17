/**
 * Idempotent TypeScript Seed Script for Development & Verification Fixtures
 * Run via: npx tsx scripts/seed-development-fixtures.ts
 */

import { prisma } from '../src/shared/database/client';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { TenantService } from '../src/modules/tenancy/tenant-service';
import { Role, ScopeMode } from '../src/shared/authorization/policy';
import argon2 from 'argon2';
import crypto from 'node:crypto';

const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

async function main() {
  console.log('[SEED] Starting TypeScript development fixture seeding...');
  const passwordHash = await argon2.hash('StrongPass123!Secure', ARGON2_CONFIG);

  try {
    // 1. Provision Users (Control-Plane / Global tables, no tenant context needed)
    const operatorUser = await prisma.user.upsert({
      where: { email: 'operator@example.com' },
      create: {
        email: 'operator@example.com',
        fullName: 'Agency Operator',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
      update: { status: 'ACTIVE' },
    });

    await prisma.userCredential.upsert({
      where: { userId: operatorUser.id },
      create: {
        userId: operatorUser.id,
        passwordHash,
        failedLoginAttempts: 0,
      },
      update: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const viewerUser = await prisma.user.upsert({
      where: { email: 'viewer.chennai@abcdental.example' },
      create: {
        email: 'viewer.chennai@abcdental.example',
        fullName: 'Chennai Clinic Manager',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
      update: { status: 'ACTIVE' },
    });

    await prisma.userCredential.upsert({
      where: { userId: viewerUser.id },
      create: {
        userId: viewerUser.id,
        passwordHash,
        failedLoginAttempts: 0,
      },
      update: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    console.log('[SEED] Users ready: operator@example.com, viewer.chennai@abcdental.example');

    // 2. Tenant A: ABC Dental
    let tenantA = await prisma.tenant.findUnique({ where: { slug: 'abc-dental' } });
    if (!tenantA) {
      const created = await TenantService.createTenant(
        { name: 'ABC Dental', slug: 'abc-dental', timezone: 'Asia/Kolkata' },
        operatorUser.id
      );
      tenantA = await prisma.tenant.findUniqueOrThrow({ where: { id: created.id } });
    } else {
      await TenantContextService.withTenantContext(prisma, tenantA.id, async (tx) => {
        await tx.tenantMembership.upsert({
          where: {
            uq_membership_tenant_user: {
              tenantId: tenantA!.id,
              userId: operatorUser.id,
            },
          },
          create: {
            tenantId: tenantA!.id,
            userId: operatorUser.id,
            role: Role.CLIENT_OWNER,
            scopeMode: ScopeMode.ALL,
            status: 'ACTIVE',
          },
          update: { role: Role.CLIENT_OWNER, scopeMode: ScopeMode.ALL, status: 'ACTIVE' },
        });
      });
    }

    const tenantAId = tenantA.id;

    // Seed Tenant A Data inside Tenant Context
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      // Brand
      let brandA = await tx.brand.findFirst({
        where: { tenantId: tenantAId, slug: 'abc-dental' },
      });
      if (!brandA) {
        brandA = await tx.brand.create({
          data: {
            tenantId: tenantAId,
            name: 'ABC Dental',
            slug: 'abc-dental',
            isArchived: false,
            version: 1,
          },
        });
      }

      // Locations
      let locA1 = await tx.location.findFirst({
        where: { tenantId: tenantAId, storeCode: 'ABC-CHE-01' },
      });
      if (!locA1) {
        locA1 = await tx.location.create({
          data: {
            tenantId: tenantAId,
            brandId: brandA.id,
            name: 'Chennai - Anna Nagar',
            storeCode: 'ABC-CHE-01',
            addressLine1: '12, 2nd Avenue, Anna Nagar',
            city: 'Chennai',
            state: 'Tamil Nadu',
            postalCode: '600040',
            country: 'IN',
            timezone: 'Asia/Kolkata',
            isArchived: false,
            version: 1,
          },
        });
      }

      let locA2 = await tx.location.findFirst({
        where: { tenantId: tenantAId, storeCode: 'ABC-SLM-01' },
      });
      if (!locA2) {
        locA2 = await tx.location.create({
          data: {
            tenantId: tenantAId,
            brandId: brandA.id,
            name: 'Salem - Fairlands',
            storeCode: 'ABC-SLM-01',
            addressLine1: '45, Meyyanur Main Road, Fairlands',
            city: 'Salem',
            state: 'Tamil Nadu',
            postalCode: '636016',
            country: 'IN',
            timezone: 'Asia/Kolkata',
            isArchived: false,
            version: 1,
          },
        });
      }

      // Restricted Viewer Membership for Tenant A (Chennai only)
      const viewerMembershipA = await tx.tenantMembership.upsert({
        where: {
          uq_membership_tenant_user: {
            tenantId: tenantAId,
            userId: viewerUser.id,
          },
        },
        create: {
          tenantId: tenantAId,
          userId: viewerUser.id,
          role: Role.VIEWER,
          scopeMode: ScopeMode.RESTRICTED,
          status: 'ACTIVE',
        },
        update: { role: Role.VIEWER, scopeMode: ScopeMode.RESTRICTED, status: 'ACTIVE' },
      });

      await tx.locationAccessScope.deleteMany({
        where: { tenantId: tenantAId, membershipId: viewerMembershipA.id },
      });
      await tx.locationAccessScope.create({
        data: {
          tenantId: tenantAId,
          membershipId: viewerMembershipA.id,
          locationId: locA1.id,
        },
      });

      // Google Connection
      let connA = await tx.integrationConnection.findFirst({
        where: { tenantId: tenantAId, provider: 'GOOGLE' },
      });
      if (!connA) {
        connA = await tx.integrationConnection.create({
          data: {
            tenantId: tenantAId,
            provider: 'GOOGLE',
            externalSubjectId: 'sub_abc_agency_operator',
            externalEmail: 'operator@example.com',
            encryptedRefreshToken: 'v1:mock-enc-refresh-token',
            grantedScopes: [
              'https://www.googleapis.com/auth/business.manage',
              'https://www.googleapis.com/auth/webmasters.readonly',
            ],
            status: 'ACTIVE',
          },
        });
      }

      // External Account & Resources
      let extAccA = await tx.externalAccount.findFirst({
        where: { tenantId: tenantAId, connectionId: connA.id, provider: 'GOOGLE_BUSINESS_PROFILE' },
      });
      if (!extAccA) {
        extAccA = await tx.externalAccount.create({
          data: {
            tenantId: tenantAId,
            connectionId: connA.id,
            provider: 'GOOGLE_BUSINESS_PROFILE',
            externalAccountId: 'accounts/10987654321',
            accountName: 'ABC Dental Group',
          },
        });
      }

      let extAccGscA = await tx.externalAccount.findFirst({
        where: { tenantId: tenantAId, connectionId: connA.id, provider: 'GOOGLE_SEARCH_CONSOLE' },
      });
      if (!extAccGscA) {
        extAccGscA = await tx.externalAccount.create({
          data: {
            tenantId: tenantAId,
            connectionId: connA.id,
            provider: 'GOOGLE_SEARCH_CONSOLE',
            externalAccountId: 'gsc_default',
            accountName: 'GSC Default Account',
          },
        });
      }

      let extGscA = await tx.externalResource.findFirst({
        where: { tenantId: tenantAId, externalResourceId: 'sc-domain:abcdental.example' },
      });
      if (!extGscA) {
        extGscA = await tx.externalResource.create({
          data: {
            tenantId: tenantAId,
            accountId: extAccGscA.id,
            provider: 'GOOGLE_SEARCH_CONSOLE',
            externalResourceId: 'sc-domain:abcdental.example',
            resourceType: 'PROPERTY',
            resourceName: 'sc-domain:abcdental.example',
          },
        });
      }

      let extGbpA1 = await tx.externalResource.findFirst({
        where: { tenantId: tenantAId, externalResourceId: 'locations/abc-dental-anna-nagar' },
      });
      if (!extGbpA1) {
        extGbpA1 = await tx.externalResource.create({
          data: {
            tenantId: tenantAId,
            accountId: extAccA.id,
            provider: 'GOOGLE_BUSINESS_PROFILE',
            externalResourceId: 'locations/abc-dental-anna-nagar',
            resourceType: 'LOCATION',
            resourceName: 'ABC Dental - Anna Nagar',
          },
        });
      }

      let extGbpA2 = await tx.externalResource.findFirst({
        where: { tenantId: tenantAId, externalResourceId: 'locations/abc-dental-fairlands' },
      });
      if (!extGbpA2) {
        extGbpA2 = await tx.externalResource.create({
          data: {
            tenantId: tenantAId,
            accountId: extAccA.id,
            provider: 'GOOGLE_BUSINESS_PROFILE',
            externalResourceId: 'locations/abc-dental-fairlands',
            resourceType: 'LOCATION',
            resourceName: 'ABC Dental - Fairlands',
          },
        });
      }

      // Mappings
      await tx.internalResourceMapping.deleteMany({
        where: { tenantId: tenantAId },
      });

      await tx.internalResourceMapping.create({
        data: {
          tenantId: tenantAId,
          internalType: 'BRAND',
          internalId: brandA.id,
          resourceId: extGscA.id,
        },
      });

      await tx.internalResourceMapping.create({
        data: {
          tenantId: tenantAId,
          internalType: 'LOCATION',
          internalId: locA1.id,
          resourceId: extGbpA1.id,
        },
      });

      await tx.internalResourceMapping.create({
        data: {
          tenantId: tenantAId,
          internalType: 'LOCATION',
          internalId: locA2.id,
          resourceId: extGbpA2.id,
        },
      });

      // GscProperty
      let gscPropA = await tx.gscProperty.findFirst({
        where: { tenantId: tenantAId, propertyUrl: 'sc-domain:abcdental.example' },
      });
      if (!gscPropA) {
        gscPropA = await tx.gscProperty.create({
          data: {
            tenantId: tenantAId,
            resourceId: extGscA.id,
            propertyUrl: 'sc-domain:abcdental.example',
            propertyType: 'DOMAIN',
          },
        });
      }

      // 30 Days of Metrics
      console.log('[SEED] Seeding 30 days of metrics for ABC Dental...');
      const now = new Date();
      for (let i = 30; i >= 1; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const daySeed = date.getDate() * 11 + date.getMonth() * 7;
        const impressions = 500 + (daySeed % 120);
        const clicks = Math.round(impressions * 0.048 + (daySeed % 4));
        const avgPos = 7.4 + (daySeed % 8) * 0.1;

        await tx.gscDailyPropertyTotal.upsert({
          where: {
            uq_gsc_property_total: {
              tenantId: tenantAId,
              propertyId: gscPropA.id,
              date,
              searchType: 'WEB',
            },
          },
          create: {
            tenantId: tenantAId,
            propertyId: gscPropA.id,
            date,
            searchType: 'WEB',
            dataState: 'FINAL',
            clicks,
            impressions,
            sumPositionImpressions: avgPos * impressions,
            freshnessTimestamp: now,
          },
          update: { clicks, impressions, sumPositionImpressions: avgPos * impressions },
        });

        // GBP Location 1 (Chennai)
        const loc1Views = 300 + (daySeed % 80);
        const loc1Calls = 18 + (daySeed % 7);
        const loc1Dirs = 35 + (daySeed % 12);
        const loc1Web = 22 + (daySeed % 9);

        const loc1Metrics = [
          { metricType: 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', value: BigInt(Math.round(loc1Views * 0.4)) },
          { metricType: 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH', value: BigInt(Math.round(loc1Views * 0.6)) },
          { metricType: 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', value: BigInt(Math.round(loc1Views * 0.3)) },
          { metricType: 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', value: BigInt(Math.round(loc1Views * 0.7)) },
          { metricType: 'CALL_CLICKS', value: BigInt(loc1Calls) },
          { metricType: 'BUSINESS_DIRECTION_REQUESTS', value: BigInt(loc1Dirs) },
          { metricType: 'WEBSITE_CLICKS', value: BigInt(loc1Web) },
        ];

        for (const m of loc1Metrics) {
          await tx.gbpDailyMetric.upsert({
            where: {
              uq_gbp_metric: {
                tenantId: tenantAId,
                locationId: locA1.id,
                date,
                metricType: m.metricType,
              },
            },
            create: {
              tenantId: tenantAId,
              locationId: locA1.id,
              date,
              metricType: m.metricType,
              value: m.value,
            },
            update: { value: m.value },
          });
        }

        // GBP Location 2 (Salem)
        const loc2Views = 180 + (daySeed % 50);
        const loc2Calls = 10 + (daySeed % 5);
        const loc2Dirs = 20 + (daySeed % 8);
        const loc2Web = 14 + (daySeed % 6);

        const loc2Metrics = [
          { metricType: 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', value: BigInt(Math.round(loc2Views * 0.4)) },
          { metricType: 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH', value: BigInt(Math.round(loc2Views * 0.6)) },
          { metricType: 'CALL_CLICKS', value: BigInt(loc2Calls) },
          { metricType: 'BUSINESS_DIRECTION_REQUESTS', value: BigInt(loc2Dirs) },
          { metricType: 'WEBSITE_CLICKS', value: BigInt(loc2Web) },
        ];

        for (const m of loc2Metrics) {
          await tx.gbpDailyMetric.upsert({
            where: {
              uq_gbp_metric: {
                tenantId: tenantAId,
                locationId: locA2.id,
                date,
                metricType: m.metricType,
              },
            },
            create: {
              tenantId: tenantAId,
              locationId: locA2.id,
              date,
              metricType: m.metricType,
              value: m.value,
            },
            update: { value: m.value },
          });
        }
      }

      // Query Dimensions for Tenant A
      const sampleQueries = [
        { text: 'best dentist anna nagar', clicks: 145, impressions: 2200, pos: 3.2 },
        { text: 'root canal specialist chennai', clicks: 98, impressions: 1650, pos: 4.1 },
        { text: 'teeth whitening salem', clicks: 76, impressions: 1100, pos: 2.8 },
        { text: 'dental implants fairlands', clicks: 54, impressions: 890, pos: 5.4 },
        { text: 'abc dental clinic phone number', clicks: 42, impressions: 320, pos: 1.1 },
      ];

      for (const q of sampleQueries) {
        const queryHash = crypto.createHash('sha256').update(q.text).digest('hex');
        const gscQuery = await tx.gscQuery.upsert({
          where: {
            uq_gsc_query_hash: {
              tenantId: tenantAId,
              propertyId: gscPropA.id,
              queryHash,
            },
          },
          create: {
            tenantId: tenantAId,
            propertyId: gscPropA.id,
            queryHash,
            queryText: q.text,
          },
          update: {},
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await tx.gscDailyQueryMetric.upsert({
          where: {
            uq_gsc_query_metric: {
              tenantId: tenantAId,
              propertyId: gscPropA.id,
              date: today,
              searchType: 'WEB',
              queryId: gscQuery.id,
            },
          },
          create: {
            tenantId: tenantAId,
            propertyId: gscPropA.id,
            date: today,
            searchType: 'WEB',
            queryId: gscQuery.id,
            clicks: q.clicks,
            impressions: q.impressions,
            sumPositionImpressions: q.pos * q.impressions,
          },
          update: { clicks: q.clicks, impressions: q.impressions, sumPositionImpressions: q.pos * q.impressions },
        });
      }
    });

    // 3. Tenant B: XYZ Fitness
    console.log('[SEED] Provisioning Tenant B: XYZ Fitness...');
    let tenantB = await prisma.tenant.findUnique({ where: { slug: 'xyz-fitness' } });
    if (!tenantB) {
      const created = await TenantService.createTenant(
        { name: 'XYZ Fitness', slug: 'xyz-fitness', timezone: 'Asia/Kolkata' },
        operatorUser.id
      );
      tenantB = await prisma.tenant.findUniqueOrThrow({ where: { id: created.id } });
    } else {
      await TenantContextService.withTenantContext(prisma, tenantB.id, async (tx) => {
        await tx.tenantMembership.upsert({
          where: {
            uq_membership_tenant_user: {
              tenantId: tenantB!.id,
              userId: operatorUser.id,
            },
          },
          create: {
            tenantId: tenantB!.id,
            userId: operatorUser.id,
            role: Role.CLIENT_OWNER,
            scopeMode: ScopeMode.ALL,
            status: 'ACTIVE',
          },
          update: { role: Role.CLIENT_OWNER, scopeMode: ScopeMode.ALL, status: 'ACTIVE' },
        });
      });
    }

    const tenantBId = tenantB.id;

    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      let brandB = await tx.brand.findFirst({
        where: { tenantId: tenantBId, slug: 'xyz-fitness' },
      });
      if (!brandB) {
        brandB = await tx.brand.create({
          data: {
            tenantId: tenantBId,
            name: 'XYZ Fitness',
            slug: 'xyz-fitness',
            isArchived: false,
            version: 1,
          },
        });
      }

      let locB1 = await tx.location.findFirst({
        where: { tenantId: tenantBId, storeCode: 'XYZ-DPI-01' },
      });
      if (!locB1) {
        locB1 = await tx.location.create({
          data: {
            tenantId: tenantBId,
            brandId: brandB.id,
            name: 'Dharmapuri - Town Centre',
            storeCode: 'XYZ-DPI-01',
            addressLine1: '108, Gandhi Road, Town Centre',
            city: 'Dharmapuri',
            state: 'Tamil Nadu',
            postalCode: '636701',
            country: 'IN',
            timezone: 'Asia/Kolkata',
            isArchived: false,
            version: 1,
          },
        });
      }

      let connB = await tx.integrationConnection.findFirst({
        where: { tenantId: tenantBId, provider: 'GOOGLE' },
      });
      if (!connB) {
        connB = await tx.integrationConnection.create({
          data: {
            tenantId: tenantBId,
            provider: 'GOOGLE',
            externalSubjectId: 'sub_xyz_agency_operator',
            externalEmail: 'operator@example.com',
            encryptedRefreshToken: 'v1:mock-enc-refresh-token',
            grantedScopes: [
              'https://www.googleapis.com/auth/business.manage',
              'https://www.googleapis.com/auth/webmasters.readonly',
            ],
            status: 'ACTIVE',
          },
        });
      }

      let extAccB = await tx.externalAccount.findFirst({
        where: { tenantId: tenantBId, connectionId: connB.id, provider: 'GOOGLE_BUSINESS_PROFILE' },
      });
      if (!extAccB) {
        extAccB = await tx.externalAccount.create({
          data: {
            tenantId: tenantBId,
            connectionId: connB.id,
            provider: 'GOOGLE_BUSINESS_PROFILE',
            externalAccountId: 'accounts/10987654321',
            accountName: 'XYZ Fitness Hub',
          },
        });
      }

      let extAccGscB = await tx.externalAccount.findFirst({
        where: { tenantId: tenantBId, connectionId: connB.id, provider: 'GOOGLE_SEARCH_CONSOLE' },
      });
      if (!extAccGscB) {
        extAccGscB = await tx.externalAccount.create({
          data: {
            tenantId: tenantBId,
            connectionId: connB.id,
            provider: 'GOOGLE_SEARCH_CONSOLE',
            externalAccountId: 'gsc_default_b',
            accountName: 'GSC Default Account B',
          },
        });
      }

      let extGscB = await tx.externalResource.findFirst({
        where: { tenantId: tenantBId, externalResourceId: 'sc-domain:xyzfitness.example' },
      });
      if (!extGscB) {
        extGscB = await tx.externalResource.create({
          data: {
            tenantId: tenantBId,
            accountId: extAccGscB.id,
            provider: 'GOOGLE_SEARCH_CONSOLE',
            externalResourceId: 'sc-domain:xyzfitness.example',
            resourceType: 'PROPERTY',
            resourceName: 'sc-domain:xyzfitness.example',
          },
        });
      }

      let extGbpB1 = await tx.externalResource.findFirst({
        where: { tenantId: tenantBId, externalResourceId: 'locations/xyz-fitness-dharmapuri' },
      });
      if (!extGbpB1) {
        extGbpB1 = await tx.externalResource.create({
          data: {
            tenantId: tenantBId,
            accountId: extAccB.id,
            provider: 'GOOGLE_BUSINESS_PROFILE',
            externalResourceId: 'locations/xyz-fitness-dharmapuri',
            resourceType: 'LOCATION',
            resourceName: 'XYZ Fitness - Dharmapuri',
          },
        });
      }

      await tx.internalResourceMapping.deleteMany({
        where: { tenantId: tenantBId },
      });

      await tx.internalResourceMapping.create({
        data: {
          tenantId: tenantBId,
          internalType: 'BRAND',
          internalId: brandB.id,
          resourceId: extGscB.id,
        },
      });

      await tx.internalResourceMapping.create({
        data: {
          tenantId: tenantBId,
          internalType: 'LOCATION',
          internalId: locB1.id,
          resourceId: extGbpB1.id,
        },
      });

      let gscPropB = await tx.gscProperty.findFirst({
        where: { tenantId: tenantBId, propertyUrl: 'sc-domain:xyzfitness.example' },
      });
      if (!gscPropB) {
        gscPropB = await tx.gscProperty.create({
          data: {
            tenantId: tenantBId,
            resourceId: extGscB.id,
            propertyUrl: 'sc-domain:xyzfitness.example',
            propertyType: 'DOMAIN',
          },
        });
      }

      console.log('[SEED] Seeding 30 days of metrics for XYZ Fitness...');
      const now = new Date();
      for (let i = 30; i >= 1; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const daySeed = date.getDate() * 7 + date.getMonth() * 5;
        const impressions = 320 + (daySeed % 90);
        const clicks = Math.round(impressions * 0.038 + (daySeed % 3));
        const avgPos = 11.2 + (daySeed % 8) * 0.15;

        await tx.gscDailyPropertyTotal.upsert({
          where: {
            uq_gsc_property_total: {
              tenantId: tenantBId,
              propertyId: gscPropB.id,
              date,
              searchType: 'WEB',
            },
          },
          create: {
            tenantId: tenantBId,
            propertyId: gscPropB.id,
            date,
            searchType: 'WEB',
            dataState: 'FINAL',
            clicks,
            impressions,
            sumPositionImpressions: avgPos * impressions,
            freshnessTimestamp: now,
          },
          update: { clicks, impressions, sumPositionImpressions: avgPos * impressions },
        });

        const locBViews = 150 + (daySeed % 40);
        const locBCalls = 9 + (daySeed % 4);
        const locBDirs = 16 + (daySeed % 6);
        const locBWeb = 11 + (daySeed % 5);

        const locBMetrics = [
          { metricType: 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', value: BigInt(Math.round(locBViews * 0.45)) },
          { metricType: 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH', value: BigInt(Math.round(locBViews * 0.55)) },
          { metricType: 'CALL_CLICKS', value: BigInt(locBCalls) },
          { metricType: 'BUSINESS_DIRECTION_REQUESTS', value: BigInt(locBDirs) },
          { metricType: 'WEBSITE_CLICKS', value: BigInt(locBWeb) },
        ];

        for (const m of locBMetrics) {
          await tx.gbpDailyMetric.upsert({
            where: {
              uq_gbp_metric: {
                tenantId: tenantBId,
                locationId: locB1.id,
                date,
                metricType: m.metricType,
              },
            },
            create: {
              tenantId: tenantBId,
              locationId: locB1.id,
              date,
              metricType: m.metricType,
              value: m.value,
            },
            update: { value: m.value },
          });
        }
      }
    });

    console.log('[SEED] ✅ Development fixtures seeded successfully with strict tenant context!');
    console.log('Credentials:');
    console.log('  Operator: operator@example.com / StrongPass123!Secure');
    console.log('  Viewer:   viewer.chennai@abcdental.example / StrongPass123!Secure');
  } catch (err) {
    console.error('[SEED] ❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
