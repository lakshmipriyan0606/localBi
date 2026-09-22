import { PrismaClient } from '@prisma/client';
import { GoogleOAuthService } from '../src/modules/integrations/google/google-oauth-service';
import { GoogleApiClient } from '../src/modules/integrations/google/google-api-client';

const prisma = new PrismaClient();

async function test() {
  const connection = await prisma.integrationConnection.findFirst({
    where: { provider: 'GOOGLE' }
  });

  if (!connection || !connection.encryptedRefreshToken) {
    console.log('No connection or refresh token found.');
    return;
  }

  console.log(`Found connection for Tenant ${connection.tenantId}`);

  try {
    const accessToken = await GoogleOAuthService.refreshAccessToken(
      connection.encryptedRefreshToken,
      connection.tenantId,
      connection.id
    );

    console.log('Refreshed token successfully. Fetching GSC sites...');

    const gscSites = await GoogleApiClient.discoverGscResources(accessToken, 'system');
    console.log('GSC Sites returned by Google API:');
    console.log(JSON.stringify(gscSites, null, 2));

    const normalizedUrl = 'https://lakshmipriyan-portfolio.vercel.app/';
    let hostname = new URL(normalizedUrl).hostname;
    const baseHostname = hostname.replace(/^www\./, "");
    
    console.log(`\nTesting match against normalizedUrl: ${normalizedUrl}`);
    console.log(`hostname: ${hostname}, baseHostname: ${baseHostname}`);
    
    const isVerified = gscSites.some((s) => {
      const resId = s.externalResourceId.toLowerCase();
      console.log(`Checking site: ${resId}`);
      console.log(`  - match normalized: ${resId === normalizedUrl.toLowerCase()}`);
      console.log(`  - includes hostname: ${resId.includes(hostname.toLowerCase())}`);
      console.log(`  - includes baseHostname: ${resId.includes(baseHostname.toLowerCase())}`);
      return (
        resId === normalizedUrl.toLowerCase() ||
        resId.includes(hostname.toLowerCase()) ||
        resId.includes(baseHostname.toLowerCase())
      );
    });

    console.log(`Final isVerified result: ${isVerified}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
