import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { AccessGrantService } from '@/modules/agency/access-grant-service';
import { handleRouteError } from '@/shared/errors';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; clientSlug: string; grantId: string }> }
) {
  try {
    const { tenantSlug, grantId } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    await AccessGrantService.revokeGrant(tenant.id, grantId, authorizedContext);

    return NextResponse.json({ success: true, message: 'Access grant revoked' });
  } catch (error) {
    return handleRouteError(error);
  }
}
