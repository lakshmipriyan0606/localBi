import { PrismaClient } from '@prisma/client';
import { SyncQueueService } from '../src/modules/sync/sync-queue';

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public' }
  }
});

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: 'lakshmi-food' }});
  if (!tenants.length) return console.log('Tenant not found');
  
  const tenantId = tenants[0].id;
  console.log('Enqueuing full sync for tenant:', tenantId);
  
  await SyncQueueService.scheduleTenantFullSync(tenantId);
  console.log('Sync job enqueued!');
}

main().then(() => process.exit(0)).catch(console.error);
