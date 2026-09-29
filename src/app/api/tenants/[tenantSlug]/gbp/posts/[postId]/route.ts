import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { handleRouteError } from '@/shared/errors';
import { GbpPostsService } from '@/modules/reports/gbp-posts-service';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; postId: string }> }
) {
  try {
    const { tenantSlug, postId } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);
    const { authorizedContext, tenant } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) throw new Error('Tenant context not found');

    const { searchParams } = new URL(_request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 });
    }

    await GbpPostsService.deletePost(authorizedContext, tenant.id, locationId, postId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
