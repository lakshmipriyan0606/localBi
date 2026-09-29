import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { handleRouteError } from '@/shared/errors';
import { GbpPostsService } from '@/modules/reports/gbp-posts-service';
import { AppError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);
    const { authorizedContext, tenant } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) throw new Error('Tenant context not found');

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId') || undefined;
    const brandId = searchParams.get('brandId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const data = await GbpPostsService.listPosts({
      tenantId: tenant.id,
      ...(locationId ? { locationId } : {}),
      ...(brandId ? { brandId } : {}),
      page,
      pageSize,
      context: authorizedContext,
    });

    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);
    const { authorizedContext, tenant } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) throw new Error('Tenant context not found');

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      throw new AppError({ code: 'VALIDATION_FAILED', message: 'locationId is required', statusCode: 400 });
    }

    const data = await request.json();
    const newPost = await GbpPostsService.createPost(authorizedContext, tenant.id, locationId, data);
    return NextResponse.json(newPost);
  } catch (error) {
    return handleRouteError(error);
  }
}
