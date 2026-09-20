import { PrismaClient } from '@prisma/client';
import { SyncWorkerService } from '../src/modules/sync/sync-worker';
import { GoogleOAuthService } from '../src/modules/integrations/google/google-oauth-service';

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public' }
  }
});

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: 'lakshmi-food' }});
  if (!tenants.length) return console.log('Tenant not found');
  const tenantId = tenants[0].id;

  const props = await prisma.gscProperty.findMany({ where: { tenantId }});
  if (!props.length) return console.log('No GSC properties mapped');
  const prop = props[0];

  const connections = await prisma.integrationConnection.findMany({
    where: { tenantId, status: 'ACTIVE' },
  });
  if (!connections.length) return console.log('No active connection');
  const conn = connections[0];

  const accessToken = await GoogleOAuthService.refreshAccessToken(
    conn.encryptedRefreshToken,
    conn.tenantId,
    conn.id
  );

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  console.log('Running SyncWorkerService for:', prop.propertyUrl);
  
  await SyncWorkerService['processGscJob']({
    type: 'GSC_SYNC',
    tenantId,
    propertyId: prop.id,
    propertyUrl: prop.propertyUrl,
    startDate,
    endDate,
    searchType: 'WEB',
    businessKey: `${tenantId}:gsc:${prop.id}:${startDate}:${endDate}:WEB`
  }, accessToken);

  console.log('Finished processing!');
  
  const metrics = await prisma.gscDailyPropertyTotal.findMany({ where: { tenantId }});
  console.log('Ingested Metrics:', metrics.length);
}

main().then(() => process.exit(0)).catch(console.error);
