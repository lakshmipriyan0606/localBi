import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { SyncQueueService } from '@/modules/sync/sync-queue';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { handleRouteError } from '@/shared/errors';

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
      const [runs, cursors] = await Promise.all([
        tx.syncRun.findMany({
          where: { tenantId: tenant.id },
          orderBy: { startedAt: 'desc' },
          take: 20,
        }),
        tx.syncCursor.findMany({
          where: { tenantId: tenant.id },
        }),
      ]);

      return { runs, cursors };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
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

    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_MAP);

    const result = await SyncQueueService.scheduleTenantFullSync(tenant.id);

    return NextResponse.json({
      success: true,
      message: 'Data sync started! Updating your Google search and store reports in the background.',
      data: result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
