import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { BacklinkRepository } from '@/modules/seo-authority/backlink-repository';
import { prisma } from '@/shared/database/client';
import { handleRouteError } from '@/shared/errors';
import { FollowState, BacklinkStatus } from '@/modules/seo-authority/authority-types';

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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const followState = (searchParams.get('followState') as FollowState) || undefined;
    const status = (searchParams.get('status') as BacklinkStatus) || undefined;
    const search = searchParams.get('search') || undefined;

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

    const result = await BacklinkRepository.listBacklinks(
      authorizedContext.tenantId,
      brandId,
      webSurfaceId,
      { page, limit, followState, status, search }
    );

    return NextResponse.json({
      success: true,
      data: result.items,
      totalCount: result.totalCount,
      page,
      limit,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch backlinks list');
  }
}
