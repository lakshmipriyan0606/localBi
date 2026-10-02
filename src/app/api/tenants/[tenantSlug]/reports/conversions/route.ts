import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { AttributionService } from '@/modules/attribution/attribution-service';
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

    AuthorizationService.assertCan(authorizedContext, Action.DASHBOARD_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId') || undefined;
    const webSurfaceId = searchParams.get('webSurfaceId') || undefined;
    const storeId = searchParams.get('storeId') || undefined;

    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days default

    const [summary, stores, products, pages] = await Promise.all([
      AttributionService.getConversionSummary({
        tenantId: tenant.id,
        brandId,
        webSurfaceId,
        storeId,
        startDate,
        endDate,
      }),
      AttributionService.getStoreConversions({
        tenantId: tenant.id,
        brandId,
        webSurfaceId,
        startDate,
        endDate,
      }),
      AttributionService.getProductConversions({
        tenantId: tenant.id,
        brandId,
        webSurfaceId,
        storeId,
        startDate,
        endDate,
      }),
      AttributionService.getPageConversions({
        tenantId: tenant.id,
        brandId,
        webSurfaceId,
        storeId,
        startDate,
        endDate,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        stores,
        products,
        pages,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
