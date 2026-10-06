import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { BrandDesignImportService } from '@/modules/page-builder/brand-design-import';
import { SiteStudioService } from '@/modules/page-builder/site-studio-service';
import { handleRouteError } from '@/shared/errors';

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
    const { source, url, brandId } = body;

    let draftDesign;

    if (source === 'ORIGINAL_SURFACE') {
      const targetBrandId = await SiteStudioService.resolveBrandId(
        authorizedContext.tenantId,
        brandId
      );
      if (!targetBrandId) {
        return NextResponse.json(
          { success: false, error: 'A brand is required to import from original surface.' },
          { status: 400 }
        );
      }
      draftDesign = await BrandDesignImportService.importFromOriginalSurface(
        authorizedContext.tenantId,
        targetBrandId
      );
    } else if (url) {
      draftDesign = await BrandDesignImportService.importFromUrl(url);
    } else {
      return NextResponse.json(
        { success: false, error: 'Either a valid website URL or source="ORIGINAL_SURFACE" must be provided.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, draftDesign });
  } catch (error) {
    return handleRouteError(error, 'Failed to import brand design.');
  }
}
