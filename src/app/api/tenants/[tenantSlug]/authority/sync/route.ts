import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { BacklinkSyncService } from '@/modules/seo-authority/backlink-sync-service';
import { prisma } from '@/shared/database/client';
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
    if (!authorizedContext) throw new Error('Unauthorized');

    const body = await request.json().catch(() => ({}));
    let brandId = body.brandId || '';
    let webSurfaceId = body.webSurfaceId || '';

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

    if (!webSurfaceId) {
      return NextResponse.json(
        { success: false, error: 'No active website surface found to sync' },
        { status: 400 }
      );
    }

    const result = await BacklinkSyncService.syncBacklinksForSurface(
      authorizedContext.tenantId,
      brandId,
      webSurfaceId
    );

    return NextResponse.json({ success: result.success, data: result });
  } catch (error) {
    return handleRouteError(error, 'Failed to trigger backlink sync');
  }
}
