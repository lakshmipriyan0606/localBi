import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('TENANTS:', tenants);
  const brands = await prisma.brand.findMany();
  console.log('BRANDS:', brands);
}

main().catch(console.error).finally(() => prisma.$disconnect());
