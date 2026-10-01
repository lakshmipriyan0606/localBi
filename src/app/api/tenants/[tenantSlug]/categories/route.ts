import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { CategoryService } from '@/modules/catalog/category-service';
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
    const status = searchParams.get('status') || undefined;

    const categories = await CategoryService.listCategories(authorizedContext.tenantId, {
      brandId,
      status,
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    return handleRouteError(error, 'Failed to list categories.');
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

    assertAuthorizedAction(authorizedContext.role, Action.CATEGORY_MANAGE);

    const body = await request.json();

    const category = await CategoryService.createCategory(authorizedContext.tenantId, {
      brandId: body.brandId,
      name: body.name,
      slug: body.slug,
      description: body.description,
      parentId: body.parentId,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create category.');
  }
}
