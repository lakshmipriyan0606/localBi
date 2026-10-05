import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { ThemeService } from '@/modules/page-builder/theme-service';
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
    const brandId = await SiteStudioService.resolveBrandId(
      authorizedContext.tenantId,
      searchParams.get('brandId') || authorizedContext.brandId
    );

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'No active brand found for this organization.' },
        { status: 404 }
      );
    }

    const theme = await ThemeService.getThemeForBrand(
      authorizedContext.tenantId,
      brandId
    );

    return NextResponse.json({ success: true, theme, brandId });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch brand design theme.');
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
      body.brandId || authorizedContext.brandId
    );

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'A brand is required to update theme.' },
        { status: 400 }
      );
    }

    const updated = await ThemeService.upsertThemeForBrand(
      authorizedContext.tenantId,
      brandId,
      {
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        accentColor: body.accentColor,
        backgroundColor: body.backgroundColor,
        textColor: body.textColor,
        fontHeading: body.fontHeading,
        fontBody: body.fontBody,
        buttonRadius: body.buttonRadius,
        cardRadius: body.cardRadius,
        customCss: body.customCss,
      }
    );

    return NextResponse.json({ success: true, theme: updated });
  } catch (error) {
    return handleRouteError(error, 'Failed to update brand design theme.');
  }
}
