import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { ProductService } from '@/modules/catalog/product-service';
import { Action, assertAuthorizedAction } from '@/shared/authorization/roles';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; productId: string }> }
) {
  try {
    const { tenantSlug, productId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    assertAuthorizedAction(authorizedContext.role, Action.PRODUCT_VIEW);

    const product = await ProductService.getProduct(authorizedContext.tenantId, productId);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch product.');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; productId: string }> }
) {
  try {
    const { tenantSlug, productId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    assertAuthorizedAction(authorizedContext.role, Action.PRODUCT_UPDATE);

    const body = await request.json();

    const product = await ProductService.updateProduct(
      authorizedContext.tenantId,
      productId,
      {
        name: body.name,
        sku: body.sku,
        slug: body.slug,
        categoryId: body.categoryId,
        shortDescription: body.shortDescription,
        description: body.description,
        basePrice: body.basePrice !== undefined ? (body.basePrice !== null ? Number(body.basePrice) : null) : undefined,
        currency: body.currency,
        status: body.status,
        publishStatus: body.publishStatus,
        featured: body.featured,
      }
    );

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return handleRouteError(error, 'Failed to update product.');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; productId: string }> }
) {
  try {
    const { tenantSlug, productId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    assertAuthorizedAction(authorizedContext.role, Action.PRODUCT_DELETE);

    const product = await ProductService.archiveProduct(authorizedContext.tenantId, productId);

    return NextResponse.json({ success: true, message: 'Product archived successfully', product });
  } catch (error) {
    return handleRouteError(error, 'Failed to archive product.');
  }
}
