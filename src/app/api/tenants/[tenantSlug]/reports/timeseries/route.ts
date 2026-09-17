import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ReportingService } from '@/modules/reports/reporting-service';
import { handleRouteError, createValidationError } from '@/shared/errors';

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
    const brandId = searchParams.get('brandId');
    const locationId = searchParams.get('locationId') || undefined;

    if (!brandId) {
      throw createValidationError('Missing required query parameter: brandId');
    }

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const startDate = searchParams.get('startDate') || thirtyDaysAgo.toISOString().slice(0, 10);
    const endDate = searchParams.get('endDate') || today.toISOString().slice(0, 10);

    const timeseries = await ReportingService.getTimeseries({
      tenantId: tenant.id,
      brandId,
      locationId,
      startDate,
      endDate,
      context: authorizedContext,
    });

    return NextResponse.json({ success: true, data: timeseries });
  } catch (error) {
    return handleRouteError(error);
  }
}
