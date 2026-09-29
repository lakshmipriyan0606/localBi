import { PrismaClient } from '@prisma/client';

// Use migrator URL to bypass RLS and see all tenant data
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.MIGRATOR_DATABASE_URL || process.env.DIRECT_URL
    }
  }
});

async function main() {
  // Find all incorrectly stored GA4 resources (stored as GOOGLE_BUSINESS_PROFILE but named "GA4 Property:")
  const badGa4Resources = await prisma.externalResource.findMany({
    where: {
      provider: 'GOOGLE_BUSINESS_PROFILE',
      resourceName: { startsWith: 'GA4 Property:' }
    }
  });

  console.log(`Found ${badGa4Resources.length} incorrectly stored GA4 resource(s):`);
  badGa4Resources.forEach(r => console.log(' -', r.resourceName, `(id: ${r.id}, resourceId: ${r.externalResourceId})`));

  for (const r of badGa4Resources) {
    await prisma.internalResourceMapping.deleteMany({ where: { resourceId: r.id } });
    await prisma.connectionResourceAccess.deleteMany({ where: { resourceId: r.id } });
    await prisma.externalResource.delete({ where: { id: r.id } });
    console.log('  ✓ Deleted:', r.resourceName);
  }

  // Also show all remaining resources
  const all = await prisma.externalResource.findMany({
    select: { id: true, provider: true, resourceType: true, resourceName: true, externalResourceId: true }
  });
  console.log('\nRemaining resources:', all.length);
  all.forEach(r => console.log(' -', r.provider, r.resourceType, r.resourceName));

  console.log('\nDone.');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
