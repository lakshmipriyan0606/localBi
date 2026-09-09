import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '../../../../../../modules/auth/cookies';
import { ContextResolver } from '../../../../../../modules/auth/context-resolver';
import { LocationService } from '../../../../../../modules/locations/location-service';
import { AppError } from '../../../../../../shared/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; locationId: string }> }
) {
  try {
    const { tenantSlug, locationId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const location = await LocationService.getLocationById(
      authorizedContext.tenantId,
      locationId,
      authorizedContext
    );

    return NextResponse.json({ success: true, location });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch location.' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; locationId: string }> }
) {
  try {
    const { tenantSlug, locationId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const { version, ...data } = body;

    const location = await LocationService.updateLocation(
      authorizedContext.tenantId,
      locationId,
      version,
      data,
      authorizedContext
    );

    return NextResponse.json({ success: true, location });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update location.' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; locationId: string }> }
) {
  try {
    const { tenantSlug, locationId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const { searchParams } = new URL(request.url);
    const versionStr = searchParams.get('version');
    const version = versionStr ? parseInt(versionStr, 10) : 1;

    const location = await LocationService.archiveLocation(
      authorizedContext.tenantId,
      locationId,
      version,
      authorizedContext
    );

    return NextResponse.json({ success: true, location });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to archive location.' } },
      { status: 500 }
    );
  }
}
