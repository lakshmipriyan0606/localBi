import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log("Tenants:");
  console.log(tenants);

  const brands = await prisma.brand.findMany();
  console.log("\nAll Brands:");
  console.log(brands);
  
  const mappings = await prisma.internalResourceMapping.findMany({
    include: { resource: true }
  });
  console.log("\nAll Mappings:");
  console.log(mappings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
