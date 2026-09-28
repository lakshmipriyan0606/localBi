import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const migratorUrlMatch = envFile.match(/MIGRATOR_DATABASE_URL=(.+)/);
process.env.DATABASE_URL = migratorUrlMatch[1].trim();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const gsc = await prisma.gscProperty.findMany();
  const maps = await prisma.internalResourceMapping.findMany();
  const res = await prisma.externalResource.findMany();
  const acc = await prisma.externalAccount.findMany();
  const conn = await prisma.integrationConnection.findMany();
  
  console.log("gsc:", JSON.stringify(gsc, null, 2));
  console.log("maps:", JSON.stringify(maps, null, 2));
  console.log("res:", JSON.stringify(res, null, 2));
  console.log("conn:", JSON.stringify(conn, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
