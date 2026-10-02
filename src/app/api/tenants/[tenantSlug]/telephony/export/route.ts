import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService, Role } from '@/shared/authorization/policy';
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

    AuthorizationService.assertCan(authorizedContext, Action.CALL_EXPORT);

    const role = authorizedContext.role;
    const hasFullPiiAccess = role === Role.CLIENT_OWNER || role === Role.CLIENT_ADMIN;

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId') || undefined;
    const storeId = searchParams.get('storeId') || undefined;

    const csvContent = await CallDashboardService.exportCallsCsv({
      tenantId: tenant.id,
      brandId,
      storeId,
      hasFullPiiAccess,
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="call-tracking-${tenantSlug}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
