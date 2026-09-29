import { prisma } from '../shared/database/client';
import { GbpReviewSyncJob } from '../modules/sync/jobs/gbp-review-sync-job';
import { getAuthenticatedGoogleClient } from '../shared/lib/google-auth';

async function main() {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'lakshmi-food' } });
    if (!tenant) throw new Error('no tenant');
    
    const locMappings = await prisma.internalResourceMapping.findMany({
      where: { tenantId: tenant.id, internalType: 'LOCATION' },
      include: { resource: true }
    });
    if (locMappings.length === 0) throw new Error('no loc mappings');
    
    const account = await prisma.externalAccount.findFirst({ where: { tenantId: tenant.id } });
    if (!account) throw new Error('no account');
    
    const mapping = locMappings[0];
    
    const auth = getAuthenticatedGoogleClient();
    const token = await auth.getAccessToken();
    if (!token) throw new Error('No access token');
    
    console.log('Got token, running job...');
    const result = await GbpReviewSyncJob.execute(token, {
      type: 'GBP_REVIEW_SYNC',
      tenantId: tenant.id,
      locationId: mapping.internalId,
      locationResourceName: mapping.resource.externalResourceId,
      accountId: account.externalAccountId.replace('accounts/', ''),
    });
    console.log('Result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
