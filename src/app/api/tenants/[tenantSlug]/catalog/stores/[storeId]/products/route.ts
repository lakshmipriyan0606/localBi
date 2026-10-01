import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { StoreProductService } from '@/modules/catalog/store-product-service';
import { Action, assertAuthorizedAction } from '@/shared/authorization/roles';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; storeId: string }> }
) {
  try {
    const { tenantSlug, storeId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    assertAuthorizedAction(authorizedContext.role, Action.PRODUCT_VIEW);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const isAvailable =
      searchParams.get('isAvailable') === 'true'
        ? true
        : searchParams.get('isAvailable') === 'false'
        ? false
        : undefined;

    const mappings = await StoreProductService.listProductsForStore(
      authorizedContext.tenantId,
      storeId,
      { search, categoryId, isAvailable }
    );

    const summary = await StoreProductService.getStoreCatalogSummary(
      authorizedContext.tenantId,
      storeId
    );

    return NextResponse.json({ success: true, mappings, summary });
  } catch (error) {
    return handleRouteError(error, 'Failed to list store products.');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; storeId: string }> }
) {
  try {
    const { tenantSlug, storeId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    assertAuthorizedAction(authorizedContext.role, Action.STORE_PRODUCT_MANAGE);

    const body = await request.json();
    const { brandId, updates } = body;

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: { message: 'brandId is required for store product mapping' } },
        { status: 400 }
      );
    }

    const result = await StoreProductService.bulkUpdateMappings(
      authorizedContext.tenantId,
      brandId,
      storeId,
      updates || []
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to update store product mappings.');
  }
}
