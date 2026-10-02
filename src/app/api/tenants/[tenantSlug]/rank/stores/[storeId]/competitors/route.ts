import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { CompetitorService } from '@/modules/rank/competitor-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; storeId: string }> }
) {
  try {
    const { tenantSlug, storeId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const competitors = await CompetitorService.getStoreCompetitors(
      authorizedContext.tenantId,
      storeId,
      authorizedContext,
      limit
    );

    return NextResponse.json({ success: true, competitors });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch store competitors.');
  }
}
