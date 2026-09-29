import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const resources = await prisma.externalResource.findMany({
  select: { id: true, provider: true, resourceType: true, resourceName: true, externalResourceId: true }
});

console.log(JSON.stringify(resources, null, 2));
await prisma.$disconnect();
