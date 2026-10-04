import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { ClientAccountService } from '@/modules/agency/client-account-service';
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

    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
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

    const existing = await ClientAccountService.getClientAccount(
      tenant.id,
      { slug: clientSlug },
      authorizedContext
    );

    const body = await request.json();

    const updated = await ClientAccountService.updateClientAccount(
      tenant.id,
      existing.id,
      {
        name: body.name,
        primaryContact: body.primaryContact,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        timezone: body.timezone,
        locale: body.locale,
      },
      authorizedContext
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
