const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const properties = await prisma.gscProperty.findMany();
  console.log('GSC Properties:', JSON.stringify(properties, null, 2));

  const connections = await prisma.integrationConnection.findMany();
  console.log('Connections:', JSON.stringify(connections.map(c => ({
    id: c.id,
    tenantId: c.tenantId,
    status: c.status,
    externalEmail: c.externalEmail
  })), null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
