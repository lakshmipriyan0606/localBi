import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { handleRouteError } from '@/shared/errors';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; resourceId: string }> }
) {
  try {
    const { tenantSlug, resourceId } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_DISCONNECT);

    await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      // Delete internal mappings first
      await tx.internalResourceMapping.deleteMany({
        where: { resourceId, tenantId: tenant.id }
      });
      // Delete connection access
      await tx.connectionResourceAccess.deleteMany({
        where: { resourceId, tenantId: tenant.id }
      });
      // Delete the actual resource
      await tx.externalResource.deleteMany({
        where: { id: resourceId, tenantId: tenant.id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
