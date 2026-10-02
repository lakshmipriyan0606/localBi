import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { KeywordService } from '@/modules/rank/keyword-service';
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
    const brandId = searchParams.get('brandId');
    if (!brandId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: brandId' },
        { status: 400 }
      );
    }

    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const result = await KeywordService.listBrandKeywords(
      authorizedContext.tenantId,
      brandId,
      { status, search, page, limit },
      authorizedContext
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to list brand keywords.');
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
    const action = body.action || 'create';

    if (action === 'create') {
      const { brandId, term, tags } = body;
      if (!brandId || !term) {
        return NextResponse.json(
          { error: 'brandId and term are required' },
          { status: 400 }
        );
      }

      const keyword = await KeywordService.addKeyword(
        authorizedContext.tenantId,
        brandId,
        term,
        { tags },
        authorizedContext
      );
      return NextResponse.json({ success: true, keyword });
    }

    if (action === 'import_gsc') {
      const { brandId, propertyId, minClicks, minImpressions } = body;
      if (!brandId || !propertyId) {
        return NextResponse.json(
          { error: 'brandId and propertyId are required for GSC import' },
          { status: 400 }
        );
      }

      const result = await KeywordService.importFromGsc(
        authorizedContext.tenantId,
        brandId,
        propertyId,
        { minClicks, minImpressions },
        authorizedContext
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'import_gbp') {
      const { brandId, locationId, minSearches } = body;
      if (!brandId || !locationId) {
        return NextResponse.json(
          { error: 'brandId and locationId are required for GBP import' },
          { status: 400 }
        );
      }

      const result = await KeywordService.importFromGbp(
        authorizedContext.tenantId,
        brandId,
        locationId,
        { minSearches },
        authorizedContext
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'update_status') {
      const { keywordId, status } = body;
      if (!keywordId || !status) {
        return NextResponse.json(
          { error: 'keywordId and status are required' },
          { status: 400 }
        );
      }

      const keyword = await KeywordService.setKeywordStatus(
        authorizedContext.tenantId,
        keywordId,
        status,
        authorizedContext
      );
      return NextResponse.json({ success: true, keyword });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    return handleRouteError(error, 'Failed to process keyword operation.');
  }
}
