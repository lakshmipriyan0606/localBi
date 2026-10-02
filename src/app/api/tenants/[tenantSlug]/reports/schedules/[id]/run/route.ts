import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ReportScheduleService } from '@/modules/reporting/report-schedule-service';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  try {
    const { tenantSlug, id } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.REPORT_SCHEDULE);

    const body = await request.json().catch(() => ({}));
    const forceResend = Boolean(body.forceResend);

    const result = await ReportScheduleService.executeScheduledRun(tenant.id, id, {
      forceResend,
      token: token || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
