import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { GbpReviewsService } from '@/modules/reports/gbp-reviews-service';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext, tenant } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const body = await request.json();
    const { brandId, locationId } = body;

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    const forceDirect = request.nextUrl.searchParams.get('forceDirect') === 'true';

    if (forceDirect) {
      try {
        const { prisma } = await import('@/shared/database/client');
        const { GbpReviewSyncJob } = await import('@/modules/sync/jobs/gbp-review-sync-job');
        const { GoogleOAuthService } = await import('@/modules/integrations/google/google-oauth-service');
        const { TenantContextService } = await import('@/shared/database/tenant-context');
        
        return await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
          const locMappings = await tx.internalResourceMapping.findMany({
            where: { tenantId: tenant.id, internalType: 'LOCATION', ...(locationId ? { internalId: locationId } : {}) },
            include: { resource: true }
          });
          const accounts = await tx.externalAccount.findMany({ where: { tenantId: tenant.id } });
          const connection = await tx.integrationConnection.findFirst({ where: { tenantId: tenant.id, status: 'ACTIVE' } });
          
          if (!connection) throw new Error('No active connection');
          
          let accessToken: string;
          if (connection.encryptedRefreshToken && connection.encryptedRefreshToken !== 'service-account-mock-token') {
            accessToken = await GoogleOAuthService.refreshAccessToken(connection.encryptedRefreshToken, tenant.id, connection.id);
          } else {
            const { getAuthenticatedGoogleClient } = await import('@/shared/lib/google-auth');
            const auth = getAuthenticatedGoogleClient();
            const token = await auth.getAccessToken();
            if (!token) throw new Error('No service account token');
            accessToken = token;
          }

          let totalProcessed = 0;
          let googleResponseDetails: any = null;
          let rawGoogleReviews: any = null;
          for (const mapping of locMappings) {
            const account = accounts.find(a => a.id === mapping.resource.accountId);
            if (account) {
              const cleanAccountId = account.externalAccountId.replace('accounts/', '');
              const cleanLocationId = mapping.resource.externalResourceId.replace('locations/', '');
              
              // Raw fetch for debugging
              const url = `https://mybusiness.googleapis.com/v4/accounts/${cleanAccountId}/locations/${cleanLocationId}/reviews?pageSize=50`;
              const rawRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
              if (rawRes.ok) {
                rawGoogleReviews = await rawRes.json();
              } else {
                rawGoogleReviews = { error: await rawRes.text(), status: rawRes.status };
              }

              const res = await GbpReviewSyncJob.execute(accessToken, {
                type: 'GBP_REVIEW_SYNC',
                tenantId: tenant.id,
                locationId: mapping.internalId,
                accountId: cleanAccountId,
                locationResourceName: mapping.resource.externalResourceId
              });
              totalProcessed += res.processed;
              googleResponseDetails = res;
            }
          }
          return NextResponse.json({ success: true, inline: true, processed: totalProcessed, details: googleResponseDetails, rawGoogleReviews });
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message, stack: err.stack, inlineError: true }, { status: 500 });
      }
    }

    const data = await GbpReviewsService.enqueueManualSync(
      tenant.id,
      brandId,
      locationId,
      authorizedContext
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
