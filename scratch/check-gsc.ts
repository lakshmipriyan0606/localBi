import { PrismaClient } from '@prisma/client';
import { GoogleApiClient } from '../src/modules/integrations/google/google-api-client';
import { GoogleOAuthService } from '../src/modules/integrations/google/google-oauth-service';
import { TenantContextService } from '../src/shared/database/tenant-context';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.$queryRawUnsafe(`SELECT * FROM tenants WHERE slug = 'lakshmi-food'`);
  const tenantId = (tenants as any[])[0].id;
  
  await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
    const conn = await tx.integrationConnection.findFirst({
      where: { tenantId, status: 'ACTIVE', provider: 'GOOGLE' }
    });

    if (conn && conn.encryptedRefreshToken) {
      console.log('Refreshing token...');
      const accessToken = await GoogleOAuthService.refreshAccessToken(conn.encryptedRefreshToken, tenantId, conn.id);
      console.log('Token refreshed.');
      const sites = await GoogleApiClient.discoverGscResources(accessToken, 'lakshmi-food');
      console.log('Discovered GSC Sites:');
      console.log(JSON.stringify(sites, null, 2));
    } else {
      console.log('No active connection found.');
    }
  });
}
main().finally(() => prisma.$disconnect());
