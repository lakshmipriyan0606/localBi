import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { GbpReviewsService } from '@/modules/reports/gbp-reviews-service';
import { handleRouteError } from '@/shared/errors';
import { logger } from '@/shared/observability/logger';

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
        const { GoogleConnectionResolver } = await import('@/modules/integrations/google/google-connection-resolver');
        const { TenantContextService } = await import('@/shared/database/tenant-context');
        
        return await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
          const locMappings = await tx.internalResourceMapping.findMany({
            where: { tenantId: tenant.id, internalType: 'LOCATION', ...(locationId ? { internalId: locationId } : {}) },
            include: { resource: { include: { account: true } } }
          });

          let totalProcessed = 0;
          let googleResponseDetails: any = null;
          let rawGoogleReviews: any = null;

          for (const mapping of locMappings) {
            try {
              const resolved = await GoogleConnectionResolver.resolveForLocation(tx, tenant.id, mapping.internalId);
              const accessToken = await GoogleOAuthService.refreshAccessToken(resolved.encryptedRefreshToken, tenant.id, resolved.connectionId);

              const cleanAccountId = mapping.resource.account?.externalAccountId.replace('accounts/', '') || '';
              const res = await GbpReviewSyncJob.execute(accessToken, {
                type: 'GBP_REVIEW_SYNC',
                tenantId: tenant.id,
                connectionId: resolved.connectionId,
                locationId: mapping.internalId,
                accountId: cleanAccountId,
                locationResourceName: resolved.externalResourceId,
                businessKey: `${tenant.id}:gbp_reviews:${mapping.internalId}`,
              });
              totalProcessed += res.processed;
              googleResponseDetails = res;
            } catch (syncErr) {
              logger.warn({ syncErr, locationId: mapping.internalId }, 'Failed review sync for location');
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
