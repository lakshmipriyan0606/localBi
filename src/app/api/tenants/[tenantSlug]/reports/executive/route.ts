import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ExecutiveReportingService } from '@/modules/reporting/executive-reporting-service';
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

    AuthorizationService.assertCan(authorizedContext, Action.REPORT_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId') || undefined;
    const webSurfaceId = searchParams.get('webSurfaceId') || undefined;
    const datePreset = searchParams.get('datePreset') || undefined;
    const customStartDate = searchParams.get('startDate') || undefined;
    const customEndDate = searchParams.get('endDate') || undefined;
    const storeIdsParam = searchParams.get('storeIds');
    const storeIds = storeIdsParam ? storeIdsParam.split(',').filter(Boolean) : undefined;
    const enableComparison = searchParams.get('compare') !== 'false';

    const report = await ExecutiveReportingService.getExecutiveReport({
      token,
      tenantSlug,
      brandId,
      webSurfaceId,
      storeIds,
      datePreset,
      customStartDate,
      customEndDate,
      enableComparison,
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return handleRouteError(error);
  }
}
