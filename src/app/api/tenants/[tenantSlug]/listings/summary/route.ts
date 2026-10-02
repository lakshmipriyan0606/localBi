import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ListingService } from '@/modules/listings/listing-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.LISTING_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId') || undefined;

    if (brandId) {
      AuthorizationService.assertBrandAccess(authorizedContext, brandId);
    }

    const summary = await ListingService.getListingSummary(tenant.id, brandId);

    return NextResponse.json({ data: summary });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch listings summary', { params });
  }
}
