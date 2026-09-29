import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { Ga4AnalyticsService } from '@/modules/analytics/ga4-service';
import { handleRouteError } from '@/shared/errors';
import { logger } from '@/shared/observability/logger';

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
    const locationId = searchParams.get('locationId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    logger.info(
      { tenantSlug, brandId, locationId, startDate, endDate },
      'Fetching GA4 report from Ga4AnalyticsService'
    );

    const data = await Ga4AnalyticsService.getTenantGa4Data({
      tenantSlug,
      brandId,
      locationId,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Error in GA4 reporting API');
    return handleRouteError(error);
  }
}
