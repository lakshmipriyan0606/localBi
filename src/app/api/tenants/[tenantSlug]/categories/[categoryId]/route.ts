import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { CategoryService } from '@/modules/catalog/category-service';
import { Action, assertAuthorizedAction } from '@/shared/authorization/roles';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; categoryId: string }> }
) {
  try {
    const { tenantSlug, categoryId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    assertAuthorizedAction(authorizedContext.role, Action.PRODUCT_VIEW);

    const category = await CategoryService.getCategory(authorizedContext.tenantId, categoryId);

    return NextResponse.json({ success: true, category });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch category.');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; categoryId: string }> }
) {
  try {
    const { tenantSlug, categoryId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    assertAuthorizedAction(authorizedContext.role, Action.CATEGORY_MANAGE);

    const body = await request.json();

    const category = await CategoryService.updateCategory(
      authorizedContext.tenantId,
      categoryId,
      {
        name: body.name,
        slug: body.slug,
        description: body.description,
        parentId: body.parentId,
        sortOrder: body.sortOrder,
        status: body.status,
      }
    );

    return NextResponse.json({ success: true, category });
  } catch (error) {
    return handleRouteError(error, 'Failed to update category.');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; categoryId: string }> }
) {
  try {
    const { tenantSlug, categoryId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    assertAuthorizedAction(authorizedContext.role, Action.CATEGORY_MANAGE);

    const category = await CategoryService.archiveCategory(authorizedContext.tenantId, categoryId);

    return NextResponse.json({ success: true, message: 'Category archived successfully', category });
  } catch (error) {
    return handleRouteError(error, 'Failed to archive category.');
  }
}
