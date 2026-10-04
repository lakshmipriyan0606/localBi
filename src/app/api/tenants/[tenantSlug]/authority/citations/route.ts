import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { CitationIntelligenceService } from '@/modules/seo-authority/citation-intelligence-service';
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
    let storeId = searchParams.get('storeId') || '';

    // If storeId not provided, select first store in tenant
    if (!storeId) {
      const firstStore = await prisma.location.findFirst({
        where: { tenantId: authorizedContext.tenantId },
        orderBy: { createdAt: 'asc' },
      });
      storeId = firstStore?.id || '';
    }

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'No stores available for this tenant' },
        { status: 404 }
      );
    }

    const overview = await CitationIntelligenceService.getStoreCitationOverview(
      authorizedContext.tenantId,
      storeId
    );

    if (!overview) {
      return NextResponse.json(
        { success: false, error: 'Store not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: overview });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch store citation intelligence');
  }
}
