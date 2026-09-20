import { prisma } from '../src/shared/database/client';

async function main() {
  const connections = await prisma.integrationConnection.findMany();
  console.log('All connections:', JSON.stringify(connections, null, 2));
  await prisma.$disconnect();
}

main();
