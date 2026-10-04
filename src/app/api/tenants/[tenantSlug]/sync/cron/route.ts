import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { CronSchedulerService } from '@/modules/sync/cron-scheduler';
import { logger } from '@/shared/observability/logger';

/**
 * POST /api/tenants/[tenantSlug]/sync/cron
 *
 * Manually triggers a named cron/periodic sync job immediately.
 * Body: { "jobName": "gsc-periodic-sync" | "ga4-periodic-sync" | "rank-scheduler" | "merchant-periodic-sync" | "listing-periodic-sync" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  try {
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized');


    const body = await request.json().catch(() => ({}));
    const { jobName } = body as { jobName?: string };

    if (!jobName) {
      return NextResponse.json(
        { error: 'jobName is required', availableJobs: CronSchedulerService.getJobDefinitions() },
        { status: 400 }
      );
    }

    logger.info(
      { tenantId: context.tenantId, jobName },
      'Manual cron trigger via API'
    );

    const result = await CronSchedulerService.triggerNow(jobName);

    return NextResponse.json({ success: true, jobName, result });
  } catch (err: any) {
    if (err?.code === 'UNAUTHORIZED' || err?.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (err?.message?.startsWith('Unknown cron job:')) {
      return NextResponse.json(
        { error: err.message, availableJobs: CronSchedulerService.getJobDefinitions() },
        { status: 404 }
      );
    }
    logger.error({ err, tenantSlug }, 'Cron trigger API error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/tenants/[tenantSlug]/sync/cron
 *
 * Returns the list of all registered cron jobs with their schedules.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  try {
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized');


    return NextResponse.json({
      jobs: CronSchedulerService.getJobDefinitions(),
    });
  } catch (err: any) {
    if (err?.code === 'UNAUTHORIZED' || err?.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
