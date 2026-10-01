import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { SyncQueueService } from '@/modules/sync/sync-queue';
import { SyncWorkerService } from '@/modules/sync/sync-worker';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { handleRouteError } from '@/shared/errors';
import { logger } from '@/shared/observability/logger';

export const maxDuration = 60;

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
    const provider = (body?.provider || request.nextUrl.searchParams.get('provider') || 'ALL') as 'GSC' | 'GBP' | 'ALL';

    // 1. Run direct sync immediately so tenant sees fresh data without waiting for background worker
    const directSync = await SyncWorkerService.syncTenantDirect(tenant.id, provider);

    // 2. Also register queue jobs asynchronously without blocking the response
    SyncQueueService.scheduleTenantFullSync(tenant.id).catch((err) => {
      logger.warn({ err: (err as Error).message }, 'Background queue scheduling non-blocking warning');
    });

    const metricsCount = provider === 'GBP' ? directSync.gbpRows : directSync.gscRows;
    const providerLabel = provider === 'GBP' ? 'Google Business Profile' : 'Search Console';

    return NextResponse.json({
      success: true,
      message: `Data synchronized with Google! Ingested ${metricsCount} ${providerLabel} metrics.`,
      data: {
        directSync,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
