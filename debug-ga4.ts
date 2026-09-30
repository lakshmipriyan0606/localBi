import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const connections = await prisma.integrationConnection.findMany({
    where: {
      externalEmail: { contains: 'lakshmipriyan' }
    },
    include: { tenant: true }
  });
  console.log("Connections containing 'lakshmipriyan':", connections.map(c => ({ tenant: c.tenant.slug, email: c.externalEmail, provider: c.provider, scopes: c.grantedScopes })));
  
  const mappings = await prisma.internalResourceMapping.findMany({
    where: {
      tenant: {
        slug: 'lakshmi-food'
      }
    },
    include: { resource: true }
  });
  console.log("\nMappings for lakshmi-food:", mappings.map(m => ({ provider: m.resource.provider, resName: m.resource.resourceName })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
