import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { ClientAccountService } from '@/modules/agency/client-account-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search') || undefined;
    const statusParam = searchParams.get('status') as 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | null;

    const result = await ClientAccountService.listClientAccounts(
      tenant.id,
      {
        page,
        pageSize,
        search,
        status: statusParam || undefined,
      },
      authorizedContext
    );

    return NextResponse.json({
      success: true,
      data: {
        clients: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
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

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const body = await request.json();

    const created = await ClientAccountService.createClientAccount(
      tenant.id,
      {
        name: body.name,
        slug: body.slug,
        primaryContact: body.primaryContact,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        timezone: body.timezone,
        locale: body.locale,
      },
      authorizedContext
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
