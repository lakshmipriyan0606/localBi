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

    const view = searchParams.get('view') || 'overview';
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    if (view === 'simple') {
      const result = await KeywordService.listBrandKeywords(
        authorizedContext.tenantId,
        brandId,
        { status, search, page, limit },
        authorizedContext
      );
      return NextResponse.json({ success: true, ...result });
    }

    // Default 'overview' / 'performance' view: Rich SEO Performance Overview + Summary KPIs
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!, 10) : 30;
    const movementParam = searchParams.get('movement');
    const movement = (movementParam === 'IMPROVED' || movementParam === 'DECLINED' || movementParam === 'UNCHANGED' || movementParam === 'NEW' || movementParam === 'UNRANKED' || movementParam === 'ALL') ? movementParam : undefined;
    const source = searchParams.get('source') || undefined;
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || undefined;
    const storeId = searchParams.get('storeId') || undefined;

    const result = await KeywordService.getKeywordPerformanceOverview(
      authorizedContext.tenantId,
      brandId,
      {
        status,
        search,
        source,
        movement,
        storeId,
        days,
        sortBy,
        sortDir,
        page,
        limit,
      },
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
      const { brandId, propertyId, queries, minClicks, minImpressions } = body;
      if (!brandId || (!propertyId && (!queries || !Array.isArray(queries) || queries.length === 0))) {
        return NextResponse.json(
          { error: 'brandId and propertyId or non-empty queries array are required for GSC import' },
          { status: 400 }
        );
      }

      const result = await KeywordService.importFromGsc(
        authorizedContext.tenantId,
        brandId,
        queries && Array.isArray(queries) ? queries : propertyId,
        queries && Array.isArray(queries) ? authorizedContext : { minClicks, minImpressions },
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

      await KeywordService.setKeywordStatus(
        authorizedContext.tenantId,
        keywordId,
        status,
        authorizedContext
      );
      return NextResponse.json({ success: true, keywordId, status });
    }

    if (action === 'delete') {
      const { keywordId } = body;
      if (!keywordId) {
        return NextResponse.json(
          { error: 'keywordId is required for deletion' },
          { status: 400 }
        );
      }

      const result = await KeywordService.deleteKeyword(
        authorizedContext.tenantId,
        keywordId,
        authorizedContext
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'assign_store') {
      const { storeId, keywordId, priority, trackingEnabled } = body;
      if (!storeId || !keywordId) {
        return NextResponse.json(
          { error: 'storeId and keywordId are required for store assignment' },
          { status: 400 }
        );
      }

      const assignment = await KeywordService.assignToStore(
        authorizedContext.tenantId,
        storeId,
        keywordId,
        { priority, trackingEnabled },
        authorizedContext
      );
      return NextResponse.json({ success: true, assignment });
    }

    if (action === 'toggle_store') {
      const { storeKeywordId, enabled } = body;
      if (!storeKeywordId || typeof enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'storeKeywordId and enabled boolean are required' },
          { status: 400 }
        );
      }

      await KeywordService.toggleStoreKeywordTracking(
        authorizedContext.tenantId,
        storeKeywordId,
        enabled,
        authorizedContext
      );
      return NextResponse.json({ success: true, storeKeywordId, enabled });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    return handleRouteError(error, 'Failed to process keyword operation.');
  }
}

export async function DELETE(
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
    const keywordId = searchParams.get('keywordId');

    if (!keywordId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: keywordId' },
        { status: 400 }
      );
    }

    const result = await KeywordService.deleteKeyword(
      authorizedContext.tenantId,
      keywordId,
      authorizedContext
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete keyword.');
  }
}
