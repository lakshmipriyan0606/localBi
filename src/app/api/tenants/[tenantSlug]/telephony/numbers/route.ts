import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { VirtualNumberService } from '@/modules/telephony/virtual-number-service';
import { handleRouteError } from '@/shared/errors';
import { VirtualNumberStatus } from '@/modules/telephony/telephony-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.CALL_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const isAvailableQuery = searchParams.get('available') === 'true';

    if (isAvailableQuery) {
      const countryCode = searchParams.get('countryCode') || undefined;
      const pattern = searchParams.get('pattern') || undefined;
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const providerName = searchParams.get('provider') || undefined;

      const available = await VirtualNumberService.listAvailableNumbers({
        providerName,
        countryCode,
        pattern,
        limit,
      });

      return NextResponse.json({ items: available });
    }

    const brandId = searchParams.get('brandId') || undefined;
    const storeId = searchParams.get('storeId') || undefined;
    const status = (searchParams.get('status') as VirtualNumberStatus) || undefined;

    const numbers = await VirtualNumberService.listVirtualNumbers({
      tenantId: tenant.id,
      brandId,
      storeId,
      status,
    });

    return NextResponse.json({ items: numbers });
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

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.CALL_MANAGE_NUMBERS);

    const body = await request.json();
    const {
      brandId,
      storeId,
      webSurfaceId,
      phoneNumber,
      countryCode,
      providerName,
      capabilities,
    } = body;

    const result = await VirtualNumberService.provisionAndAssignNumber({
      tenantId: tenant.id,
      brandId,
      storeId,
      webSurfaceId,
      phoneNumber,
      countryCode,
      providerName,
      capabilities,
      webhookBaseUrl: request.nextUrl.origin,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
