import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ReportingService } from '@/modules/reports/reporting-service';
import { handleRouteError, createValidationError } from '@/shared/errors';
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
    const brandId = searchParams.get('brandId');
    const locationId = searchParams.get('locationId') || undefined;
    const webSurfaceId = searchParams.get('webSurfaceId') || undefined;
    const mode = (searchParams.get('mode') as 'LOCALBI' | 'ORIGINAL' | 'COMPARE') || undefined;

    if (!brandId) {
      throw createValidationError('Missing required query parameter: brandId');
    }

    // Default to last 30 days if not specified
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const startDate = searchParams.get('startDate') || thirtyDaysAgo.toISOString().slice(0, 10);
    const endDate = searchParams.get('endDate') || today.toISOString().slice(0, 10);

    logger.info(
      { brandId, locationId, webSurfaceId, mode, startDate, endDate },
      'Calling ReportingService.getPerformanceSummary'
    );

    const summary = await ReportingService.getPerformanceSummary({
      tenantId: tenant.id,
      brandId,
      locationId,
      webSurfaceId,
      mode,
      startDate,
      endDate,
      context: authorizedContext,
    });

    logger.info({ summary }, 'ReportingService returned summary');

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    logger.error({ error }, 'Error in reports summary API');
    return handleRouteError(error);
  }
}
