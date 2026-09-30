import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = "cmucqibzt0000ubj02iu7yob7";
  const internalId = "cmucsfjj10001ubm0x4g8bkr2";
  
  // 1. Find the mapping using the exact query from the logs
  const exactQuery = await prisma.internalResourceMapping.findFirst({
    where: {
      tenantId: tenantId,
      resource: {
        provider: 'GOOGLE_ANALYTICS_4',
      },
      internalType: 'BRAND',
      internalId: internalId
    },
    include: { resource: true }
  });
  console.log("Result of exact query:", !!exactQuery);
  if (exactQuery) console.log(exactQuery.resource.provider);

  // 2. Find ALL GA4 mappings for this tenant
  const allGa4Mappings = await prisma.internalResourceMapping.findMany({
    where: {
      tenantId: tenantId,
      resource: {
        provider: 'GOOGLE_ANALYTICS_4',
      },
    },
    include: { resource: true }
  });
  console.log("All GA4 mappings count:", allGa4Mappings.length);
  if (allGa4Mappings.length > 0) {
    console.log("First GA4 mapping internalType:", allGa4Mappings[0].internalType);
    console.log("First GA4 mapping internalId:", allGa4Mappings[0].internalId);
  }

  // 3. Find ALL mappings for this internalId
  const allMappingsForBrand = await prisma.internalResourceMapping.findMany({
    where: {
      tenantId: tenantId,
      internalId: internalId
    },
    include: { resource: true }
  });
  console.log("All mappings for this brand:");
  allMappingsForBrand.forEach(m => console.log(`- ${m.resource.provider} (${m.resource.resourceType})`));

}

main().catch(console.error).finally(() => prisma.$disconnect());
