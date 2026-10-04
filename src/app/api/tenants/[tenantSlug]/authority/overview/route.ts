import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SeoAuthorityOverviewService } from '@/modules/seo-authority/seo-authority-overview-service';
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
    if (!authorizedContext) throw new Error('Unauthorized');

    const { searchParams } = new URL(request.url);
    let brandId = searchParams.get('brandId') || '';
    let webSurfaceId = searchParams.get('webSurfaceId') || '';

    // If not supplied, pick the default brand and surface for this tenant
    if (!brandId) {
      const firstBrand = await prisma.brand.findFirst({
        where: { tenantId: authorizedContext.tenantId, isArchived: false },
        orderBy: { createdAt: 'asc' },
      });
      brandId = firstBrand?.id || '';
    }

    if (!webSurfaceId && brandId) {
      const firstSurface = await prisma.webSurface.findFirst({
        where: { tenantId: authorizedContext.tenantId, brandId },
        orderBy: { createdAt: 'asc' },
      });
      webSurfaceId = firstSurface?.id || '';
    }

    const overview = await SeoAuthorityOverviewService.getOverview(
      authorizedContext.tenantId,
      brandId,
      webSurfaceId
    );

    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch SEO authority overview');
  }
}
