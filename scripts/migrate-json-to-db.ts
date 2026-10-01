/**
 * One-time migration: seeds existing JSON file data into the DB.
 * Run with: npx ts-node --project tsconfig.json -e "require('./scripts/migrate-json-to-db.ts')"
 * Or: npx tsx scripts/migrate-json-to-db.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), '.data');

async function migrateMicrosites() {
  const file = path.join(DATA_DIR, 'microsites.json');
  if (!fs.existsSync(file)) {
    console.log('No microsites.json found, skipping.');
    return;
  }
  const items: Record<string, unknown>[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
  console.log(`Migrating ${items.length} microsites...`);

  for (const item of items) {
    const tenantSlug = (item['tenantSlug'] as string) || 'default';
    const subdomain = (item['subdomain'] as string) || '';
    if (!subdomain) continue;

    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) {
      console.warn(`  Tenant not found for slug: ${tenantSlug}, skipping ${subdomain}`);
      continue;
    }

    try {
      await prisma.microsite.upsert({
        where: { uq_microsite_subdomain: { tenantId: tenant.id, subdomain } },
        create: {
          tenantId: tenant.id,
          subdomain,
          brandId: (item['brandId'] as string) ?? null,
          brandName: (item['brandName'] as string) ?? 'Storefront',
          locationId: (item['locationId'] as string) ?? null,
          locationName: (item['locationName'] as string) ?? null,
          tagline: (item['tagline'] as string) ?? null,
          aboutStory: (item['aboutStory'] as string) ?? null,
          primaryColor: (item['primaryColor'] as string) ?? '#4F46E5',
          secondaryColor: (item['secondaryColor'] as string) ?? null,
          font: (item['font'] as string) ?? 'Inter',
          phone: (item['phone'] as string) ?? '',
          whatsapp: (item['whatsapp'] as string) ?? '',
          address: (item['address'] as string) ?? '',
          city: (item['city'] as string) ?? '',
          state: (item['state'] as string) ?? null,
          postalCode: (item['postalCode'] as string) ?? null,
          hours: (item['hours'] as string) ?? '9:00 AM - 9:00 PM',
          googleRating: (item['googleRating'] as number) ?? 4.9,
          reviewCount: (item['reviewCount'] as number) ?? 0,
          googleMapsUrl: (item['googleMapsUrl'] as string) ?? '',
          heroImageUrl: (item['heroImageUrl'] as string) ?? '',
          menuItems: (item['menuItems'] as object) ?? [],
          published: (item['published'] as boolean) ?? false,
          status: (item['status'] as string) ?? 'DRAFT',
          customDomain: (item['customDomain'] as string) ?? null,
          customDomainStatus: (item['customDomainStatus'] as string) ?? 'NOT_CONNECTED',
          industry: (item['industry'] as string) ?? null,
          templateId: (item['templateId'] as string) ?? 'restaurant',
          theme: (item['theme'] as object) ?? null,
          pages: (item['pages'] as object) ?? [],
          sections: (item['sections'] as object) ?? [],
          draftData: (item['draftData'] as object) ?? null,
          publishedData: (item['publishedData'] as object) ?? null,
          lastPublishedAt: item['lastPublishedAt'] ? new Date(item['lastPublishedAt'] as string) : null,
          version: (item['version'] as number) ?? 1,
        },
        update: {},
      });
      console.log(`  ✓ Microsite ${subdomain} (tenant: ${tenantSlug})`);
    } catch (err) {
      console.error(`  ✗ Failed to migrate ${subdomain}:`, err);
    }
  }
}

async function migrateVisitors() {
  const file = path.join(DATA_DIR, 'real_visitors.json');
  if (!fs.existsSync(file)) {
    console.log('No real_visitors.json found, skipping.');
    return;
  }
  const items: Record<string, unknown>[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
  console.log(`Migrating ${items.length} visitors...`);

  for (const item of items) {
    const tenantSlug = (item['tenantSlug'] as string) || '';
    const deviceFingerprint = (item['deviceFingerprint'] as string) || '';
    if (!tenantSlug || !deviceFingerprint) continue;

    const tenant = await prisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) {
      console.warn(`  Tenant not found for slug: ${tenantSlug}, skipping visitor ${deviceFingerprint}`);
      continue;
    }

    try {
      await prisma.micrositeVisitor.upsert({
        where: { uq_visitor_fingerprint: { tenantId: tenant.id, deviceFingerprint } },
        create: {
          tenantId: tenant.id,
          tenantSlug,
          deviceFingerprint,
          isIdentified: (item['isIdentified'] as boolean) ?? false,
          identifiedUser: (item['identifiedUser'] as object) ?? null,
          intentLevel: (item['intentLevel'] as string) ?? 'LOW',
          pageViews: (item['pageViews'] as object) ?? [],
          deviceInfo: (item['deviceInfo'] as object) ?? {
            platform: 'Unknown',
            browser: 'Unknown',
            screenResolution: '1920x1080',
            timezone: 'UTC',
          },
          trafficSource: (item['trafficSource'] as object) ?? { referrer: '', channel: 'Direct' },
          conversions: (item['conversions'] as object) ?? [],
          firstSeenAt: item['firstSeenAt'] ? new Date(item['firstSeenAt'] as string) : new Date(),
          lastSeenAt: item['lastSeenAt'] ? new Date(item['lastSeenAt'] as string) : new Date(),
        },
        update: {},
      });
      console.log(`  ✓ Visitor ${deviceFingerprint} (tenant: ${tenantSlug})`);
    } catch (err) {
      console.error(`  ✗ Failed to migrate visitor ${deviceFingerprint}:`, err);
    }
  }
}

async function main() {
  console.log('=== LocalBi JSON → DB Migration ===\n');
  await migrateMicrosites();
  console.log('');
  await migrateVisitors();
  console.log('\n✅ Migration complete.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
