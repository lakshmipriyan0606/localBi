import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SeoAnalysisService } from '@/modules/seo-intelligence/seo-analysis-service';
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

    const body = await request.json();
    const {
      brandId,
      webSurfaceId,
      pageId,
      targetUrl,
      keyword,
      searchLocation,
      country = 'IN',
      device = 'DESKTOP',
      storeId,
      competitorOverrides,
    } = body;

    if (!brandId || !webSurfaceId || !targetUrl || !keyword || !searchLocation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: brandId, webSurfaceId, targetUrl, keyword, searchLocation',
        },
        { status: 400 }
      );
    }

    const result = await SeoAnalysisService.startAnalysis(
      {
        tenantId: authorizedContext.tenantId,
        brandId,
        webSurfaceId,
        pageId,
        targetUrl,
        keyword,
        searchLocation,
        country,
        device,
        storeId,
        competitorOverrides,
      },
      authorizedContext
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to initiate SEO analysis');
  }
}
