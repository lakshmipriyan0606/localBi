import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { BacklinkOpportunityBridge } from '@/modules/seo-authority/backlink-opportunity-bridge';
import { prisma } from '@/shared/database/client';
import { handleRouteError } from '@/shared/errors';
import { CompetitorBacklinkGapCandidate } from '@/modules/seo-authority/authority-types';

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

    const body = await request.json();
    const { candidate, brandId, webSurfaceId } = body;

    if (!candidate || !candidate.domain) {
      return NextResponse.json(
        { success: false, error: 'Valid candidate domain object is required' },
        { status: 400 }
      );
    }

    let finalBrandId = brandId;
    if (!finalBrandId) {
      const firstBrand = await prisma.brand.findFirst({
        where: { tenantId: authorizedContext.tenantId, isArchived: false },
      });
      finalBrandId = firstBrand?.id || '';
    }

    let finalWebSurfaceId = webSurfaceId;
    if (!finalWebSurfaceId && finalBrandId) {
      const firstSurface = await prisma.webSurface.findFirst({
        where: { tenantId: authorizedContext.tenantId, brandId: finalBrandId },
      });
      finalWebSurfaceId = firstSurface?.id || '';
    }

    const opportunityId = await BacklinkOpportunityBridge.createOpportunityFromCandidate(
      authorizedContext.tenantId,
      finalBrandId,
      finalWebSurfaceId,
      candidate as CompetitorBacklinkGapCandidate
    );

    return NextResponse.json({ success: true, opportunityId });
  } catch (error) {
    return handleRouteError(error, 'Failed to create backlink opportunity');
  }
}
