import { PrismaClient } from '@prisma/client';
import { GoogleOAuthService } from '../src/modules/integrations/google/google-oauth-service';

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public' }
  }
});

async function main() {
  const connections = await prisma.integrationConnection.findMany({
    where: { id: 'conn_4fe205170ad752fdf6c756b6' }
  });

  if (!connections.length) {
    console.log('No connections found');
    return;
  }

  const conn = connections[0];
  console.log('Using connection:', conn.id, 'Tenant:', conn.tenantId);

  try {
    const accessToken = await GoogleOAuthService.refreshAccessToken(
      conn.encryptedRefreshToken,
      conn.tenantId,
      conn.id
    );

    console.log('Got access token:', accessToken.substring(0, 15) + '...');

    const propertyUrl = 'https://lakshmipriyan-portfolio.vercel.app/';
    
    // Test 1: with encodeURIComponent
    let url1 = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propertyUrl)}/searchAnalytics/query`;
    console.log('\nFetching:', url1);
    const res1 = await fetch(url1, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: '2026-08-01', endDate: '2026-09-20', dimensions: ['date'], type: 'web' })
    });
    console.log('Response 1 Status:', res1.status);
    console.log('Response 1 Body:', await res1.text());

  } catch (err) {
    console.error('Error fetching token:', err);
  }
}

main().then(() => process.exit(0)).catch(console.error);
