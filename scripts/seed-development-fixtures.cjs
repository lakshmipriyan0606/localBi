/**
 * Idempotent Seed Script for Development & Verification Fixtures
 *
 * Provisions:
 * - Operator / Agency Admin: operator@example.com (StrongPass123!Secure)
 * - Restricted Viewer: viewer.chennai@abcdental.example (StrongPass123!Secure)
 * - Tenant A: ABC Dental (Chennai - Anna Nagar, Salem - Fairlands, sc-domain:abcdental.example)
 * - Tenant B: XYZ Fitness (Dharmapuri - Town Centre, sc-domain:xyzfitness.example)
 * - Connections, Resources, Mappings & 30 Days of Reporting Metrics
 */

const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const crypto = require('node:crypto');

const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

async function main() {
  const migratorUrl =
    process.env.MIGRATOR_DATABASE_URL ||
    process.env.DIRECT_URL ||
    'postgresql://localbi_migrator:8c64a30a649493b0796970d65bdde5e7@127.0.0.1:5432/localbi?schema=public';

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: migratorUrl,
      },
    },
  });
  const passwordHash = await argon2.hash('StrongPass123!Secure', ARGON2_CONFIG);

  console.log('[SEED] Starting development fixture seeding...');

  try {
    // 1. Provision Users (Control-Plane / Global tables, no tenantId)
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

    console.log('[SEED] Users created/verified: operator@example.com and viewer.chennai@abcdental.example');

    // 2. Provision Tenant A: ABC Dental
    let tenantA = await prisma.tenant.findUnique({ where: { slug: 'abc-dental' } });
    if (!tenantA) {
      tenantA = await prisma.tenant.create({
        data: {
          name: 'ABC Dental',
          slug: 'abc-dental',
          timezone: 'Asia/Kolkata',
          plan: 'PRO',
          status: 'ACTIVE',
          version: 1,
        },
      });
    }

    // Execute Tenant A data inside Tenant A Context Transaction
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantA.id}', true)`);

      // Memberships for Tenant A
      await tx.tenantMembership.upsert({
        where: {
          uq_membership_tenant_user: {
            tenantId: tenantA.id,
            userId: operatorUser.id,
          },
        },
        create: {
          tenantId: tenantA.id,
          userId: operatorUser.id,
          role: 'CLIENT_OWNER',
          scopeMode: 'ALL',
          status: 'ACTIVE',
        },
        update: { role: 'CLIENT_OWNER', scopeMode: 'ALL', status: 'ACTIVE' },
      });

      // Brand for Tenant A
      let brandA = await tx.brand.findFirst({
        where: { tenantId: tenantA.id, slug: 'abc-dental' },
      });
      if (!brandA) {
        brandA = await tx.brand.create({
          data: {
            tenantId: tenantA.id,
            name: 'ABC Dental',
            slug: 'abc-dental',
            websiteUrl: 'https://abcdental.example',
            reportingTimezone: 'Asia/Kolkata',
            isArchived: false,
            version: 1,
          },
        });
      }

      // Locations for Tenant A
      let locA1 = await tx.location.findFirst({
        where: { tenantId: tenantA.id, storeCode: 'ABC-CHE-01' },
      });
      if (!locA1) {
        locA1 = await tx.location.create({
          data: {
            tenantId: tenantA.id,
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
        where: { tenantId: tenantA.id, storeCode: 'ABC-SLM-01' },
      });
      if (!locA2) {
        locA2 = await tx.location.create({
          data: {
            tenantId: tenantA.id,
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
            tenantId: tenantA.id,
            userId: viewerUser.id,
          },
        },
        create: {
          tenantId: tenantA.id,
          userId: viewerUser.id,
          role: 'CLIENT_VIEWER',
          scopeMode: 'RESTRICTED',
          status: 'ACTIVE',
        },
        update: { role: 'CLIENT_VIEWER', scopeMode: 'RESTRICTED', status: 'ACTIVE' },
      });

      await tx.membershipLocationGrant.deleteMany({
        where: { tenantId: tenantA.id, membershipId: viewerMembershipA.id },
      });
      await tx.membershipLocationGrant.create({
        data: {
          tenantId: tenantA.id,
          membershipId: viewerMembershipA.id,
          locationId: locA1.id,
        },
      });

      // Google Connection for Tenant A
      let connA = await tx.integrationConnection.findFirst({
        where: { tenantId: tenantA.id, provider: 'GOOGLE' },
      });
      if (!connA) {
        connA = await tx.integrationConnection.create({
          data: {
            tenantId: tenantA.id,
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

      // Discovered External Resources for Tenant A
      let extAccA = await tx.externalAccount.findFirst({
        where: { tenantId: tenantA.id, connectionId: connA.id },
      });
      if (!extAccA) {
        extAccA = await tx.externalAccount.create({
          data: {
            tenantId: tenantA.id,
            connectionId: connA.id,
            provider: 'GOOGLE',
            externalAccountId: 'accounts/10987654321',
            accountName: 'ABC Dental Group',
          },
        });
      }

      let extGscA = await tx.externalResource.findFirst({
        where: { tenantId: tenantA.id, connectionId: connA.id, resourceType: 'GSC_SITE' },
      });
      if (!extGscA) {
        extGscA = await tx.externalResource.create({
          data: {
            tenantId: tenantA.id,
            connectionId: connA.id,
            resourceType: 'GSC_SITE',
            externalResourceId: 'sc-domain:abcdental.example',
            displayName: 'sc-domain:abcdental.example',
            permissionLevel: 'siteFullUser',
            resourceMetadata: { propertyType: 'DOMAIN' },
          },
        });
      }

      let extGbpA1 = await tx.externalResource.findFirst({
        where: {
          tenantId: tenantA.id,
          connectionId: connA.id,
          externalResourceId: 'locations/abc-dental-anna-nagar',
        },
      });
      if (!extGbpA1) {
        extGbpA1 = await tx.externalResource.create({
          data: {
            tenantId: tenantA.id,
            connectionId: connA.id,
            accountId: extAccA.id,
            resourceType: 'GBP_LOCATION',
            externalResourceId: 'locations/abc-dental-anna-nagar',
            displayName: 'ABC Dental - Anna Nagar',
            permissionLevel: 'OWNER',
            resourceMetadata: {
              address: {
                addressLines: ['12, 2nd Avenue, Anna Nagar'],
                locality: 'Chennai',
                administrativeArea: 'Tamil Nadu',
                postalCode: '600040',
              },
            },
          },
        });
      }

      let extGbpA2 = await tx.externalResource.findFirst({
        where: {
          tenantId: tenantA.id,
          connectionId: connA.id,
          externalResourceId: 'locations/abc-dental-fairlands',
        },
      });
      if (!extGbpA2) {
        extGbpA2 = await tx.externalResource.create({
          data: {
            tenantId: tenantA.id,
            connectionId: connA.id,
            accountId: extAccA.id,
            resourceType: 'GBP_LOCATION',
            externalResourceId: 'locations/abc-dental-fairlands',
            displayName: 'ABC Dental - Fairlands',
            permissionLevel: 'OWNER',
            resourceMetadata: {
              address: {
                addressLines: ['45, Meyyanur Main Road, Fairlands'],
                locality: 'Salem',
                administrativeArea: 'Tamil Nadu',
                postalCode: '636016',
              },
            },
          },
        });
      }

      // Mappings for Tenant A
      await tx.mappedResource.upsert({
        where: {
          uq_mapped_resource_type: {
            tenantId: tenantA.id,
            externalResourceId: extGscA.id,
            internalResourceType: 'BRAND',
            internalResourceId: brandA.id,
          },
        },
        create: {
          tenantId: tenantA.id,
          externalResourceId: extGscA.id,
          internalResourceType: 'BRAND',
          internalResourceId: brandA.id,
        },
        update: {},
      });

      await tx.mappedResource.upsert({
        where: {
          uq_mapped_resource_type: {
            tenantId: tenantA.id,
            externalResourceId: extGbpA1.id,
            internalResourceType: 'LOCATION',
            internalResourceId: locA1.id,
          },
        },
        create: {
          tenantId: tenantA.id,
          externalResourceId: extGbpA1.id,
          internalResourceType: 'LOCATION',
          internalResourceId: locA1.id,
        },
        update: {},
      });

      await tx.mappedResource.upsert({
        where: {
          uq_mapped_resource_type: {
            tenantId: tenantA.id,
            externalResourceId: extGbpA2.id,
            internalResourceType: 'LOCATION',
            internalResourceId: locA2.id,
          },
        },
        create: {
          tenantId: tenantA.id,
          externalResourceId: extGbpA2.id,
          internalResourceType: 'LOCATION',
          internalResourceId: locA2.id,
        },
        update: {},
      });

      // GscProperty for Tenant A
      let gscPropA = await tx.gscProperty.findFirst({
        where: { tenantId: tenantA.id, propertyUrl: 'sc-domain:abcdental.example' },
      });
      if (!gscPropA) {
        gscPropA = await tx.gscProperty.create({
          data: {
            tenantId: tenantA.id,
            resourceId: extGscA.id,
            propertyUrl: 'sc-domain:abcdental.example',
            propertyType: 'DOMAIN',
          },
        });
      }

      // Seed 30 Days of Metrics for Tenant A
      console.log('[SEED] Seeding 30 days of GSC and GBP metrics for ABC Dental...');
      const now = new Date();
      for (let i = 30; i >= 1; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const daySeed = date.getDate() * 11 + date.getMonth() * 7;
        const impressions = 500 + (daySeed % 120);
        const clicks = Math.round(impressions * 0.048 + (daySeed % 4));
        const avgPos = 7.4 + (daySeed % 8) * 0.1;

        // GSC Daily Totals
        await tx.gscDailyPropertyTotal.upsert({
          where: {
            uq_gsc_property_total: {
              tenantId: tenantA.id,
              propertyId: gscPropA.id,
              date,
              searchType: 'WEB',
            },
          },
          create: {
            tenantId: tenantA.id,
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

        // GBP Daily Metrics - Location 1 (Chennai)
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
              uq_gbp_daily_metric: {
                tenantId: tenantA.id,
                locationId: locA1.id,
                date,
                metricType: m.metricType,
              },
            },
            create: {
              tenantId: tenantA.id,
              locationId: locA1.id,
              date,
              metricType: m.metricType,
              value: m.value,
            },
            update: { value: m.value },
          });
        }

        // GBP Daily Metrics - Location 2 (Salem)
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
              uq_gbp_daily_metric: {
                tenantId: tenantA.id,
                locationId: locA2.id,
                date,
                metricType: m.metricType,
              },
            },
            create: {
              tenantId: tenantA.id,
              locationId: locA2.id,
              date,
              metricType: m.metricType,
              value: m.value,
            },
            update: { value: m.value },
          });
        }
      }

      // Seed Dimension Queries for Tenant A
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
              tenantId: tenantA.id,
              propertyId: gscPropA.id,
              queryHash,
            },
          },
          create: {
            tenantId: tenantA.id,
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
              tenantId: tenantA.id,
              propertyId: gscPropA.id,
              date: today,
              searchType: 'WEB',
              queryId: gscQuery.id,
            },
          },
          create: {
            tenantId: tenantA.id,
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

    // 3. Provision Tenant B: XYZ Fitness
    console.log('[SEED] Provisioning Tenant B: XYZ Fitness...');
    let tenantB = await prisma.tenant.findUnique({ where: { slug: 'xyz-fitness' } });
    if (!tenantB) {
      tenantB = await prisma.tenant.create({
        data: {
          name: 'XYZ Fitness',
          slug: 'xyz-fitness',
          timezone: 'Asia/Kolkata',
          plan: 'STANDARD',
          status: 'ACTIVE',
          version: 1,
        },
      });
    }

    // Execute Tenant B data inside Tenant B Context Transaction
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', '${tenantB.id}', true)`);

      // Memberships for Tenant B
      await tx.tenantMembership.upsert({
        where: {
          uq_membership_tenant_user: {
            tenantId: tenantB.id,
            userId: operatorUser.id,
          },
        },
        create: {
          tenantId: tenantB.id,
          userId: operatorUser.id,
          role: 'CLIENT_OWNER',
          scopeMode: 'ALL',
          status: 'ACTIVE',
        },
        update: { role: 'CLIENT_OWNER', scopeMode: 'ALL', status: 'ACTIVE' },
      });

      // Brand for Tenant B
      let brandB = await tx.brand.findFirst({
        where: { tenantId: tenantB.id, slug: 'xyz-fitness' },
      });
      if (!brandB) {
        brandB = await tx.brand.create({
          data: {
            tenantId: tenantB.id,
            name: 'XYZ Fitness',
            slug: 'xyz-fitness',
            websiteUrl: 'https://xyzfitness.example',
            reportingTimezone: 'Asia/Kolkata',
            isArchived: false,
            version: 1,
          },
        });
      }

      // Location for Tenant B
      let locB1 = await tx.location.findFirst({
        where: { tenantId: tenantB.id, storeCode: 'XYZ-DPI-01' },
      });
      if (!locB1) {
        locB1 = await tx.location.create({
          data: {
            tenantId: tenantB.id,
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

      // Google Connection for Tenant B
      let connB = await tx.integrationConnection.findFirst({
        where: { tenantId: tenantB.id, provider: 'GOOGLE' },
      });
      if (!connB) {
        connB = await tx.integrationConnection.create({
          data: {
            tenantId: tenantB.id,
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

      // Discovered External Resources for Tenant B
      let extAccB = await tx.externalAccount.findFirst({
        where: { tenantId: tenantB.id, connectionId: connB.id },
      });
      if (!extAccB) {
        extAccB = await tx.externalAccount.create({
          data: {
            tenantId: tenantB.id,
            connectionId: connB.id,
            provider: 'GOOGLE',
            externalAccountId: 'accounts/10987654321',
            accountName: 'XYZ Fitness Hub',
          },
        });
      }

      let extGscB = await tx.externalResource.findFirst({
        where: { tenantId: tenantB.id, connectionId: connB.id, resourceType: 'GSC_SITE' },
      });
      if (!extGscB) {
        extGscB = await tx.externalResource.create({
          data: {
            tenantId: tenantB.id,
            connectionId: connB.id,
            resourceType: 'GSC_SITE',
            externalResourceId: 'sc-domain:xyzfitness.example',
            displayName: 'sc-domain:xyzfitness.example',
            permissionLevel: 'siteFullUser',
            resourceMetadata: { propertyType: 'DOMAIN' },
          },
        });
      }

      let extGbpB1 = await tx.externalResource.findFirst({
        where: {
          tenantId: tenantB.id,
          connectionId: connB.id,
          externalResourceId: 'locations/xyz-fitness-dharmapuri',
        },
      });
      if (!extGbpB1) {
        extGbpB1 = await tx.externalResource.create({
          data: {
            tenantId: tenantB.id,
            connectionId: connB.id,
            accountId: extAccB.id,
            resourceType: 'GBP_LOCATION',
            externalResourceId: 'locations/xyz-fitness-dharmapuri',
            displayName: 'XYZ Fitness - Dharmapuri',
            permissionLevel: 'OWNER',
            resourceMetadata: {
              address: {
                addressLines: ['108, Gandhi Road, Town Centre'],
                locality: 'Dharmapuri',
                administrativeArea: 'Tamil Nadu',
                postalCode: '636701',
              },
            },
          },
        });
      }

      // Mappings for Tenant B
      await tx.mappedResource.upsert({
        where: {
          uq_mapped_resource_type: {
            tenantId: tenantB.id,
            externalResourceId: extGscB.id,
            internalResourceType: 'BRAND',
            internalResourceId: brandB.id,
          },
        },
        create: {
          tenantId: tenantB.id,
          externalResourceId: extGscB.id,
          internalResourceType: 'BRAND',
          internalResourceId: brandB.id,
        },
        update: {},
      });

      await tx.mappedResource.upsert({
        where: {
          uq_mapped_resource_type: {
            tenantId: tenantB.id,
            externalResourceId: extGbpB1.id,
            internalResourceType: 'LOCATION',
            internalResourceId: locB1.id,
          },
        },
        create: {
          tenantId: tenantB.id,
          externalResourceId: extGbpB1.id,
          internalResourceType: 'LOCATION',
          internalResourceId: locB1.id,
        },
        update: {},
      });

      // GscProperty for Tenant B
      let gscPropB = await tx.gscProperty.findFirst({
        where: { tenantId: tenantB.id, propertyUrl: 'sc-domain:xyzfitness.example' },
      });
      if (!gscPropB) {
        gscPropB = await tx.gscProperty.create({
          data: {
            tenantId: tenantB.id,
            resourceId: extGscB.id,
            propertyUrl: 'sc-domain:xyzfitness.example',
            propertyType: 'DOMAIN',
          },
        });
      }

      // Seed 30 Days of Metrics for Tenant B
      console.log('[SEED] Seeding 30 days of GSC and GBP metrics for XYZ Fitness...');
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
              tenantId: tenantB.id,
              propertyId: gscPropB.id,
              date,
              searchType: 'WEB',
            },
          },
          create: {
            tenantId: tenantB.id,
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
              uq_gbp_daily_metric: {
                tenantId: tenantB.id,
                locationId: locB1.id,
                date,
                metricType: m.metricType,
              },
            },
            create: {
              tenantId: tenantB.id,
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

    console.log('[SEED] ✅ Development & Verification Fixtures successfully seeded!');
    console.log('Credentials:');
    console.log('  Operator: operator@example.com / StrongPass123!Secure');
    console.log('  Viewer:   viewer.chennai@abcdental.example / StrongPass123!Secure');
    console.log('Tenants:');
    console.log('  - ABC Dental (/t/abc-dental)');
    console.log('  - XYZ Fitness (/t/xyz-fitness)');
  } catch (err) {
    console.error('[SEED] ❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
