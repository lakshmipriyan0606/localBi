import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '../../../../../modules/auth/cookies';
import { ContextResolver } from '../../../../../modules/auth/context-resolver';
import { TenantService } from '../../../../../modules/tenancy/tenant-service';
import { handleRouteError } from '../../../../../shared/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    return NextResponse.json({
      success: true,
      tenant,
      role: authorizedContext.role,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch organization settings.');
  }
}

export async function PUT(
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
    const { name, timezone, version } = body;

    if (version === undefined || typeof version !== 'number') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Current version integer is required for optimistic locking' } },
        { status: 400 }
      );
    }

    const updated = await TenantService.updateTenantSettings(
      authorizedContext.tenantId,
      version,
      { name, timezone },
      authorizedContext
    );

    return NextResponse.json({ success: true, tenant: updated });
  } catch (error) {
    return handleRouteError(error, 'Failed to update organization settings.');
  }
}
