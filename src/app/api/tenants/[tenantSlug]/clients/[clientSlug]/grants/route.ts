import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { ClientAccountService } from '@/modules/agency/client-account-service';
import { AccessGrantService } from '@/modules/agency/access-grant-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; clientSlug: string }> }
) {
  try {
    const { tenantSlug, clientSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const client = await ClientAccountService.getClientAccount(
      tenant.id,
      { slug: clientSlug },
      authorizedContext
    );

    const grants = await AccessGrantService.listGrantsForClient(
      tenant.id,
      client.id,
      authorizedContext
    );

    return NextResponse.json({ success: true, data: grants });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; clientSlug: string }> }
) {
  try {
    const { tenantSlug, clientSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const client = await ClientAccountService.getClientAccount(
      tenant.id,
      { slug: clientSlug },
      authorizedContext
    );

    const body = await request.json();

    const grant = await AccessGrantService.grantAccess(
      tenant.id,
      {
        userId: body.userId,
        clientAccountId: client.id,
        role: body.role,
        scopeType: body.scopeType || 'CLIENT',
        brandId: body.brandId,
        locationId: body.locationId,
      },
      authorizedContext
    );

    return NextResponse.json({ success: true, data: grant }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
