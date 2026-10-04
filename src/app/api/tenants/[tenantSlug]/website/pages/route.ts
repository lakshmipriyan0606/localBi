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
        { success: false, error: 'A brandId is required to list website pages.' },
        { status: 400 }
      );
    }

    const pages = await SiteStudioService.listSitePages(
      authorizedContext.tenantId,
      brandId
    );

    return NextResponse.json({ success: true, pages });
  } catch (error) {
    return handleRouteError(error, 'Failed to list website pages.');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const brandId = body.brandId || authorizedContext.brandId;

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'A brandId is required to create a landing page.' },
        { status: 400 }
      );
    }

    const newPage = await SiteStudioService.createLandingPage(
      authorizedContext.tenantId,
      brandId,
      {
        name: body.name,
        pageType: body.pageType || 'LANDING',
        slug: body.slug,
        citySlug: body.citySlug,
        storeId: body.storeId,
        categoryId: body.categoryId,
        productId: body.productId,
      }
    );

    return NextResponse.json({ success: true, page: newPage });
  } catch (error) {
    return handleRouteError(error, 'Failed to create landing page.');
  }
}
