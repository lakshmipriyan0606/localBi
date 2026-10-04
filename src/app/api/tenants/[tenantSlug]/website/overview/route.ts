import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SiteStudioService } from '@/modules/page-builder/site-studio-service';
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
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId') || authorizedContext.brandId;

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'A brandId is required to view website overview.' },
        { status: 400 }
      );
    }

    const overview = await SiteStudioService.getSiteOverview(
      authorizedContext.tenantId,
      brandId
    );

    return NextResponse.json({ success: true, overview });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch site overview.');
  }
}
