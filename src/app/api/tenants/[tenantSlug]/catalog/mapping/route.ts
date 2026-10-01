import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { StoreProductService } from '@/modules/catalog/store-product-service';
import { Action, assertAuthorizedAction } from '@/shared/authorization/roles';
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

    assertAuthorizedAction(authorizedContext.role, Action.STORE_PRODUCT_MANAGE);

    const body = await request.json();
    const { brandId, storeId, updates, productIds } = body;

    if (!brandId || !storeId) {
      return NextResponse.json(
        { success: false, error: { message: 'brandId and storeId are required' } },
        { status: 400 }
      );
    }

    // Support either direct list of productIds or detailed updates with overrides
    if (updates && Array.isArray(updates)) {
      const result = await StoreProductService.bulkUpdateMappings(
        authorizedContext.tenantId,
        brandId,
        storeId,
        updates
      );
      return NextResponse.json({ success: true, ...result });
    } else if (productIds && Array.isArray(productIds)) {
      const result = await StoreProductService.assignProductsToStore(
        authorizedContext.tenantId,
        brandId,
        storeId,
        productIds
      );
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { success: false, error: { message: 'Either updates or productIds must be provided' } },
      { status: 400 }
    );
  } catch (error) {
    return handleRouteError(error, 'Failed to update catalog mappings.');
  }
}
