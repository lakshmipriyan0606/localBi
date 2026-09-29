const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const resources = await prisma.externalResource.findMany();
  console.log(JSON.stringify(resources, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
