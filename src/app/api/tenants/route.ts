import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '../../../modules/auth/cookies';
import { ContextResolver } from '../../../modules/auth/context-resolver';
import { TenantService } from '../../../modules/tenancy/tenant-service';
import { handleRouteError } from '../../../shared/errors';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { user } = await ContextResolver.requireAuthenticatedUser(rawToken);

    const tenants = await TenantService.listUserTenants(user.id);

    return NextResponse.json({
      success: true,
      tenants,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to list clients.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { user } = await ContextResolver.requireAuthenticatedUser(rawToken);

    const body = await request.json();
    const { name, slug, timezone, contactEmail, industry, website } = body;

    const tenant = await TenantService.createTenant({ name, slug, timezone, contactEmail, industry, website }, user.id);

    return NextResponse.json({
      success: true,
      tenant,
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create client.');
  }
}
