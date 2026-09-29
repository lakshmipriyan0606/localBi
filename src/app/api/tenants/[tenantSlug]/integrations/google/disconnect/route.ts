import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { handleRouteError, createResourceNotFoundError } from '@/shared/errors';
import { logger } from '@/shared/observability/logger';

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

    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_DISCONNECT);

    const body = await request.json().catch(() => ({}));
    const connectionId = body.connectionId as string | undefined;

    await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      const connection = connectionId
        ? await tx.integrationConnection.findUnique({
            where: {
              uq_connection_tenant_id: { tenantId: tenant.id, id: connectionId },
            },
          })
        : await tx.integrationConnection.findFirst({
            where: { tenantId: tenant.id, status: 'ACTIVE' },
          });

      if (!connection) {
        throw createResourceNotFoundError('IntegrationConnection', connectionId || 'active');
      }

      // Mark connection REVOKED
      await tx.integrationConnection.update({
        where: { id: connection.id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

      // Revoke access on connection resource grants
      await tx.connectionResourceAccess.updateMany({
        where: { connectionId: connection.id },
        data: { canAccess: false },
      });

      // Mark all in-flight or queued sync runs for this tenant as ABORTED_ORPHAN
      await tx.syncRun.updateMany({
        where: {
          tenantId: tenant.id,
          status: 'RUNNING',
          provider: { in: ['GSC', 'GBP', 'GBP_REVIEWS'] },
        },
        data: {
          status: 'ABORTED_ORPHAN',
          completedAt: new Date(),
          errorCode: 'CONNECTION_REVOKED_BY_USER',
        },
      });

      logger.info({ tenantId: tenant.id, connectionId: connection.id }, 'Revoked Google integration connection and aborted active sync runs');
    });

    return NextResponse.json({
      success: true,
      message: 'Google integration disconnected successfully',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
