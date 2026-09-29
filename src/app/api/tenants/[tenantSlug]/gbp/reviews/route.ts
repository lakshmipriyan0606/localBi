import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { GbpReviewsService } from '@/modules/reports/gbp-reviews-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
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

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    const locationId = searchParams.get('locationId') || undefined;
    const filterBy = (searchParams.get('filterBy') as any) || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const data = await GbpReviewsService.listReviews({
      tenantId: tenant.id,
      brandId,
      ...(locationId ? { locationId } : {}),
      filterBy,
      page,
      pageSize,
      context: authorizedContext,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
