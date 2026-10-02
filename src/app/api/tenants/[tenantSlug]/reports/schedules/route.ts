import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ReportScheduleService } from '@/modules/reporting/report-schedule-service';
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

    const schedules = await ReportScheduleService.listSchedules(tenant.id, brandId);
    return NextResponse.json({ success: true, data: schedules });
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

    AuthorizationService.assertCan(authorizedContext, Action.REPORT_SCHEDULE);

    const body = await request.json();
    if (!body.brandId || !body.name || !body.recipients || !Array.isArray(body.recipients)) {
      return NextResponse.json(
        { error: 'Missing required schedule fields: brandId, name, recipients array' },
        { status: 400 }
      );
    }

    const schedule = await ReportScheduleService.createSchedule({
      tenantId: tenant.id,
      brandId: body.brandId,
      name: body.name,
      frequency: body.frequency || 'WEEKLY',
      timezone: body.timezone || tenant.timezone,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      hourOfDay: body.hourOfDay,
      recipients: body.recipients,
      format: body.format || 'PDF',
      surfaceId: body.webSurfaceId,
      storeIds: body.storeIds,
      userId: user?.id,
    });

    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
