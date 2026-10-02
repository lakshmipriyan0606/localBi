import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ExecutiveReportingService } from '@/modules/reporting/executive-reporting-service';
import { ClientReportContextService } from '@/modules/reporting/client-report-context-service';
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
    const brandId = searchParams.get('brandId');
    if (!brandId) {
      return NextResponse.json({ error: 'brandId query parameter required' }, { status: 400 });
    }

    const snapshots = await ExecutiveReportingService.listSnapshots(tenant.id, brandId);
    return NextResponse.json({ success: true, data: snapshots });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext, user } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.REPORT_VIEW);

    const body = await request.json();
    const context = await ClientReportContextService.resolveContext({
      token,
      tenantSlug,
      brandId: body.brandId,
      webSurfaceId: body.webSurfaceId,
      storeIds: body.storeIds,
      datePreset: body.datePreset,
      customStartDate: body.startDate,
      customEndDate: body.endDate,
    });

    const result = await ExecutiveReportingService.createSnapshot(
      context,
      body.title,
      user?.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
