import { prisma } from '../src/shared/database/client';
import { GoogleOAuthService } from '../src/modules/integrations/google/google-oauth-service';

async function main() {
  const tenantId = 'cmu9ec3t6000oubjgorjpb8zu';
  const connectionId = 'conn_4fe205170ad752fdf6c756b6';

  const connection = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return tx.integrationConnection.findUnique({
      where: {
        uq_connection_tenant_id: { tenantId, id: connectionId }
      }
    });
  });

  if (!connection) {
    console.log('No connection found');
    return;
  }

  console.log('Found connection for:', connection.externalEmail);

  try {
    const accessToken = await GoogleOAuthService.refreshAccessToken(
      connection.encryptedRefreshToken,
      tenantId,
      connectionId
    );

    console.log('Google Access Token refreshed successfully!');

    // 1. Check Google Search Console sites
    console.log('Calling Google Search Console API (https://www.googleapis.com/webmasters/v3/sites)...');
    const gscRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('GSC HTTP Status:', gscRes.status, gscRes.statusText);
    const gscData = await gscRes.json();
    console.log('GSC Data:', JSON.stringify(gscData, null, 2));

    // 2. Check GBP accounts
    console.log('Calling GBP Accounts API (https://mybusinessaccountmanagement.googleapis.com/v1/accounts)...');
    const gbpRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('GBP HTTP Status:', gbpRes.status, gbpRes.statusText);
    const gbpData = await gbpRes.json();
    console.log('GBP Data:', JSON.stringify(gbpData, null, 2));

  } catch (err: any) {
    console.error('Error in test:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
