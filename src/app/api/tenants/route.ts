import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '../../../modules/auth/cookies';
import { ContextResolver } from '../../../modules/auth/context-resolver';
import { TenantService } from '../../../modules/tenancy/tenant-service';
import { AppError } from '../../../shared/errors';

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
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list organizations.' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { user } = await ContextResolver.requireAuthenticatedUser(rawToken);

    const body = await request.json();
    const { name, slug, timezone } = body;

    const tenant = await TenantService.createTenant({ name, slug, timezone }, user.id);

    return NextResponse.json({
      success: true,
      tenant,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create organization.' } },
      { status: 500 }
    );
  }
}
