import { PrismaClient } from '@prisma/client';
import { GoogleOAuthService } from '../src/modules/integrations/google/google-oauth-service';

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public' }
  }
});

async function main() {
  const connections = await prisma.integrationConnection.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  if (!connections.length) {
    console.log('No connections found');
    return;
  }

  const conn = connections[0];
  console.log('Using connection:', conn.id, 'Tenant:', conn.tenantId);

  try {
    const accessToken = await GoogleOAuthService.refreshAccessToken(
      conn.encryptedRefreshToken!,
      conn.tenantId,
      conn.id
    );

    console.log('Got access token:', accessToken.substring(0, 15) + '...');

    const url = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
    console.log('\nFetching GBP Accounts:', url);
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('Response Status:', res.status);
    console.log('Response Body:', await res.text());

  } catch (err) {
    console.error('Error fetching token:', err);
  }
}

main().then(() => process.exit(0)).catch(console.error);
