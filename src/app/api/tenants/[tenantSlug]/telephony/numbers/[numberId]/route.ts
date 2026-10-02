import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { VirtualNumberService } from '@/modules/telephony/virtual-number-service';
import { handleRouteError } from '@/shared/errors';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; numberId: string }> }
) {
  try {
    const { tenantSlug, numberId } = await params;
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

    const result = await VirtualNumberService.releaseNumber({
      tenantId: tenant.id,
      virtualNumberId: numberId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
