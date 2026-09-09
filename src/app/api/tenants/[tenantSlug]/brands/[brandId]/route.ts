import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '../../../../../../modules/auth/cookies';
import { ContextResolver } from '../../../../../../modules/auth/context-resolver';
import { BrandService } from '../../../../../../modules/brands/brand-service';
import { AppError } from '../../../../../../shared/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; brandId: string }> }
) {
  try {
    const { tenantSlug, brandId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const brand = await BrandService.getBrandById(authorizedContext.tenantId, brandId, authorizedContext);
    return NextResponse.json({ success: true, brand });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch brand.' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; brandId: string }> }
) {
  try {
    const { tenantSlug, brandId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const { name, slug, version } = body;

    const brand = await BrandService.updateBrand(
      authorizedContext.tenantId,
      brandId,
      version,
      { name, slug },
      authorizedContext
    );

    return NextResponse.json({ success: true, brand });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update brand.' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; brandId: string }> }
) {
  try {
    const { tenantSlug, brandId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const { searchParams } = new URL(request.url);
    const versionStr = searchParams.get('version');
    const version = versionStr ? parseInt(versionStr, 10) : 1;

    const brand = await BrandService.archiveBrand(
      authorizedContext.tenantId,
      brandId,
      version,
      authorizedContext
    );

    return NextResponse.json({ success: true, brand });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to archive brand.' } },
      { status: 500 }
    );
  }
}
