import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ResourceDiscoveryService } from '@/modules/integrations/resource-discovery-service';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { handleRouteError, createResourceNotFoundError } from '@/shared/errors';

export async function GET(
  _request: NextRequest,
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

    AuthorizationService.assertCan(authorizedContext, Action.TENANT_VIEW);

    const data = await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      const accounts = await tx.externalAccount.findMany({
        where: { tenantId: tenant.id },
        include: {
          resources: {
            where: { tenantId: tenant.id },
            include: {
              internalMappings: {
                where: { tenantId: tenant.id },
              },
            },
          },
        },
      });

      return accounts;
    });

    return NextResponse.json({ success: true, data });
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

    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_MAP);

    const body = await request.json().catch(() => ({}));
    const connectionId = body.connectionId as string | undefined;

    // Resolve connection
    const connection = await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      return connectionId
        ? tx.integrationConnection.findUnique({
            where: { uq_connection_tenant_id: { tenantId: tenant.id, id: connectionId } },
          })
        : tx.integrationConnection.findFirst({
            where: { tenantId: tenant.id, status: 'ACTIVE' },
          });
    });

    if (!connection) {
      throw createResourceNotFoundError('IntegrationConnection', connectionId || 'active');
    }

    const result = await ResourceDiscoveryService.discoverAndSyncResources(
      tenant.id,
      connection.id,
      tenant.slug
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
