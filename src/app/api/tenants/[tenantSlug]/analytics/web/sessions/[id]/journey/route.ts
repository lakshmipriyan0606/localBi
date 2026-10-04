import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { WebAnalyticsService } from '@/modules/analytics/web-analytics-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  _req: NextRequest,
  segmentData: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  try {
    const { tenantSlug, id: sessionId } = await segmentData.params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 403 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.DASHBOARD_VIEW);

    const journey = await WebAnalyticsService.getSessionJourney(tenant.id, sessionId);
    return NextResponse.json({ sessionId, journey });
  } catch (error) {
    return handleRouteError(error, 'Error fetching session journey');
  }
}
