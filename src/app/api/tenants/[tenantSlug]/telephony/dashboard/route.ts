import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { CallDashboardService } from '@/modules/telephony/call-dashboard-service';
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

    AuthorizationService.assertCan(authorizedContext, Action.CALL_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId') || undefined;
    const storeId = searchParams.get('storeId') || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const [summary, funnel, storeSummaries] = await Promise.all([
      CallDashboardService.getCallSummary({
        tenantId: tenant.id,
        brandId,
        storeId,
        startDate,
        endDate,
      }),
      CallDashboardService.getCallFunnelComparison({
        tenantId: tenant.id,
        brandId,
        storeId,
        startDate,
        endDate,
      }),
      brandId
        ? CallDashboardService.getStoreCallSummaries({
            tenantId: tenant.id,
            brandId,
            startDate,
            endDate,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      summary,
      funnel,
      storeSummaries,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
