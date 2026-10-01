import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { VisitorService } from '@/modules/visitors/visitor-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  _req: NextRequest,
  segmentData: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await segmentData.params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 403 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.DASHBOARD_VIEW);

    const [visitors, stats] = await Promise.all([
      VisitorService.getTenantVisitors(tenant.id),
      VisitorService.getTenantVisitorStats(tenant.id),
    ]);

    return NextResponse.json({
      visitors,
      stats,
      realCount: visitors.length,
    });
  } catch (error) {
    return handleRouteError(error, 'Error fetching tenant visitors');
  }
}

export async function DELETE(
  _req: NextRequest,
  segmentData: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await segmentData.params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 403 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.TENANT_UPDATE);

    await VisitorService.clearRealVisitors(tenant.id);
    return NextResponse.json({ success: true, message: 'Visitor logs reset successfully.' });
  } catch (error) {
    return handleRouteError(error, 'Error resetting visitors');
  }
}
