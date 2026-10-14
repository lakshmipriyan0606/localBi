import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { OverviewService } from '@/modules/overview/overview-service';
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
    const daysParam = searchParams.get('days');
    const brandId = searchParams.get('brandId') || undefined;
    const days = daysParam ? parseInt(daysParam, 10) : undefined;

    const overviewData = await OverviewService.getOverviewData(
      tenant.id,
      tenant.slug,
      authorizedContext,
      {
        brandId,
        days: days && !isNaN(days) ? days : 30,
      }
    );

    return NextResponse.json({ success: true, data: overviewData });
  } catch (error) {
    return handleRouteError(error);
  }
}
