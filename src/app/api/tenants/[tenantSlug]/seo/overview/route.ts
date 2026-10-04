import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SeoOverviewService } from '@/modules/seo-intelligence/seo-overview-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized');

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId') || undefined;

    const stats = await SeoOverviewService.getOverview(
      authorizedContext.tenantId,
      brandId,
      authorizedContext
    );

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch SEO overview metrics');
  }
}
