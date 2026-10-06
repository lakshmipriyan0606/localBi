import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { NavigationService } from '@/modules/page-builder/navigation-service';
import { SiteStudioService } from '@/modules/page-builder/site-studio-service';
import { prisma } from '@/shared/database/client';
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
    const brandId = await SiteStudioService.resolveBrandId(
      authorizedContext.tenantId,
      searchParams.get('brandId')
    );

    if (!brandId) {
      return NextResponse.json({
        success: true,
        navigation: { headerItems: [], footerItems: [] },
      });
    }

    const surface = await SiteStudioService.getOrCreateLocalBiSurface(
      authorizedContext.tenantId,
      brandId
    );

    const navigation = await NavigationService.getNavigation(
      authorizedContext.tenantId,
      surface.id
    );

    return NextResponse.json({ success: true, navigation, brandId });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch site navigation.');
  }
}

export async function PUT(
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
    const brandId = await SiteStudioService.resolveBrandId(
      authorizedContext.tenantId,
      body.brandId
    );

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'A brand is required to update navigation.' },
        { status: 400 }
      );
    }

    const surface = await SiteStudioService.getOrCreateLocalBiSurface(
      authorizedContext.tenantId,
      brandId
    );

    const updated = await NavigationService.saveNavigation(
      authorizedContext.tenantId,
      surface.id,
      {
        headerItems: body.headerItems || [],
        footerItems: body.footerItems || [],
      }
    );

    return NextResponse.json({ success: true, navigation: updated });
  } catch (error) {
    return handleRouteError(error, 'Failed to update site navigation.');
  }
}
