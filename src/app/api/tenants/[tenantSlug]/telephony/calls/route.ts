import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService, Role } from '@/shared/authorization/policy';
import { CallDashboardService } from '@/modules/telephony/call-dashboard-service';
import { handleRouteError } from '@/shared/errors';
import { CallStatus } from '@/modules/telephony/telephony-types';

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

    const role = authorizedContext.role;
    const hasFullPiiAccess = role === Role.CLIENT_OWNER || role === Role.CLIENT_ADMIN;

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId') || undefined;
    const storeId = searchParams.get('storeId') || undefined;
    const status = (searchParams.get('status') as CallStatus) || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await CallDashboardService.listCalls({
      tenantId: tenant.id,
      brandId,
      storeId,
      status,
      page,
      limit,
      hasFullPiiAccess,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
