import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { handleRouteError } from '@/shared/errors';
import { GbpPostsService } from '@/modules/reports/gbp-posts-service';
import { AppError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);
    const { authorizedContext, tenant } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) throw new Error('Tenant context not found');

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      throw new AppError({ code: 'VALIDATION_FAILED', message: 'locationId is required', statusCode: 400 });
    }

    const count = await GbpPostsService.syncPostsFromGoogle(authorizedContext, tenant.id, locationId);
    return NextResponse.json({ success: true, count });
  } catch (error) {
    return handleRouteError(error);
  }
}
