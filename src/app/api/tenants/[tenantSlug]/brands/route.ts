import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '../../../../../modules/auth/cookies';
import { ContextResolver } from '../../../../../modules/auth/context-resolver';
import { BrandService } from '../../../../../modules/brands/brand-service';
import { handleRouteError } from '../../../../../shared/errors';

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
    const search = searchParams.get('search');
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const options: { search?: string; page: number; limit: number; includeArchived: boolean } = {
      page,
      limit,
      includeArchived,
    };
    if (search) options.search = search;

    const result = await BrandService.listBrands(
      authorizedContext.tenantId,
      options,
      authorizedContext
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to list brands.');
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
    const { name, slug } = body;

    const brand = await BrandService.createBrand(
      authorizedContext.tenantId,
      { name, slug },
      authorizedContext
    );

    return NextResponse.json({ success: true, brand }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create brand.');
  }
}
