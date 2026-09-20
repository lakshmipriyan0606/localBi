import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { ResourceDiscoveryService } from '../src/modules/integrations/resource-discovery-service';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.$queryRawUnsafe(`SELECT * FROM tenants WHERE slug = 'lakshmi-food'`);
  const tenantId = (tenants as any[])[0].id;
  
  await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
    const conn = await tx.integrationConnection.findFirst({
      where: { tenantId, provider: 'GOOGLE' }
    });
    
    if (conn) {
      console.log('Syncing...');
      await ResourceDiscoveryService.discoverAndSyncResources(tenantId, conn.id, 'lakshmi-food');
      console.log('Sync complete!');
    } else {
      console.log('No connection found.');
    }
  });
}
main().finally(() => prisma.$disconnect());
