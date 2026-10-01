import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { ProductService } from '@/modules/catalog/product-service';
import { Action, assertAuthorizedAction } from '@/shared/authorization/roles';
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

    assertAuthorizedAction(authorizedContext.role, Action.PRODUCT_VIEW);

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const status = searchParams.get('status') || undefined;
    const publishStatus = searchParams.get('publishStatus') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const filters = {
      page,
      limit,
      ...(brandId ? { brandId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status } : {}),
      ...(publishStatus ? { publishStatus } : {}),
      ...(search ? { search } : {}),
    };

    const result = await ProductService.listProducts(authorizedContext.tenantId, filters);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to list products.');
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

    assertAuthorizedAction(authorizedContext.role, Action.PRODUCT_CREATE);

    const body = await request.json();

    const product = await ProductService.createProduct(authorizedContext.tenantId, {
      brandId: body.brandId,
      name: body.name,
      sku: body.sku,
      slug: body.slug,
      categoryId: body.categoryId,
      shortDescription: body.shortDescription,
      description: body.description,
      basePrice: body.basePrice !== undefined ? Number(body.basePrice) : null,
      currency: body.currency,
      status: body.status,
      publishStatus: body.publishStatus,
      featured: body.featured,
      media: body.media,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create product.');
  }
}
