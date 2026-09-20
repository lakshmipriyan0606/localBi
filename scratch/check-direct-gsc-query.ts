import { prisma } from '../src/shared/database/client';
import { GoogleOAuthService } from '../src/modules/integrations/google/google-oauth-service';

async function main() {
  const tenantId = 'cmu9ec3t6000oubjgorjpb8zu';
  const connectionId = 'conn_4fe205170ad752fdf6c756b6';

  const connection = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return tx.integrationConnection.findUnique({
      where: { uq_connection_tenant_id: { tenantId, id: connectionId } }
    });
  });

  const accessToken = await GoogleOAuthService.refreshAccessToken(
    connection!.encryptedRefreshToken,
    tenantId,
    connectionId
  );

  const siteUrl = 'https://lakshmipriyan-portfolio.vercel.app/';
  const encoded = encodeURIComponent(siteUrl);

  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: '2026-09-01',
      endDate: '2026-09-19',
      dimensions: ['date'],
    }),
  });

  console.log('Query direct status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Query direct response:', text);

  await prisma.$disconnect();
}

main();
