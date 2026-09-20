import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.$queryRawUnsafe(`SELECT * FROM tenants`);
  console.log('Tenants:', tenants);
  const conns = await prisma.$queryRawUnsafe(`SELECT * FROM integration_connections`);
  console.log('Connections:', conns);
}
main().finally(() => prisma.$disconnect());
