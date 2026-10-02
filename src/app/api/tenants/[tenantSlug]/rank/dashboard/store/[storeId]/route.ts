import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { RankRunService } from '@/modules/rank/rank-run-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; storeId: string }> }
) {
  try {
    const { tenantSlug, storeId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const dashboard = await RankRunService.getStoreRankDashboard(
      authorizedContext.tenantId,
      storeId,
      authorizedContext
    );

    return NextResponse.json({ success: true, dashboard });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch store rank dashboard.');
  }
}
