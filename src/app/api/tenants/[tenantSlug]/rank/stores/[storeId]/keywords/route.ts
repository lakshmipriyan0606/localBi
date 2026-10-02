import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { KeywordService } from '@/modules/rank/keyword-service';
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

    const keywords = await KeywordService.listStoreKeywords(
      authorizedContext.tenantId,
      storeId,
      authorizedContext
    );

    return NextResponse.json({ success: true, keywords });
  } catch (error) {
    return handleRouteError(error, 'Failed to list store keywords.');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; storeId: string }> }
) {
  try {
    const { tenantSlug, storeId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const { keywordId, trackingEnabled = true, priority = 1 } = body;

    if (!keywordId) {
      return NextResponse.json(
        { error: 'keywordId is required' },
        { status: 400 }
      );
    }

    const mapping = await KeywordService.assignToStore(
      authorizedContext.tenantId,
      storeId,
      keywordId,
      { trackingEnabled, priority },
      authorizedContext
    );

    return NextResponse.json({ success: true, mapping });
  } catch (error) {
    return handleRouteError(error, 'Failed to assign keyword to store.');
  }
}
