import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { RankRunService } from '@/modules/rank/rank-run-service';
import { SyncQueueService } from '@/modules/sync/sync-queue';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') || undefined;
    const keywordId = searchParams.get('keywordId');
    const isTrend = searchParams.get('trend') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
    const latestOnly = searchParams.get('latest') === 'true';
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!, 10) : 30;

    if (!keywordId) {
      return NextResponse.json(
        { error: 'keywordId is a required query parameter' },
        { status: 400 }
      );
    }

    if (isTrend) {
      const trend = await RankRunService.getKeywordHistoricalTrend(
        authorizedContext.tenantId,
        keywordId,
        { storeId, days },
        authorizedContext
      );
      return NextResponse.json({ success: true, trend });
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required when requesting specific store runs' },
        { status: 400 }
      );
    }

    if (latestOnly) {
      const run = await RankRunService.getLatestRun(
        authorizedContext.tenantId,
        storeId,
        keywordId,
        authorizedContext
      );
      return NextResponse.json({ success: true, run });
    }

    const runs = await RankRunService.getHistoricalRuns(
      authorizedContext.tenantId,
      storeId,
      keywordId,
      limit,
      authorizedContext
    );

    return NextResponse.json({ success: true, runs });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch rank runs.');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const { storeId, keywordId, force = false, isAsync = false, gridSize, radiusKm } = body;

    if (!storeId || !keywordId) {
      return NextResponse.json(
        { error: 'storeId and keywordId are required' },
        { status: 400 }
      );
    }

    if (isAsync) {
      const job = await SyncQueueService.scheduleRankScan({
        tenantId: authorizedContext.tenantId,
        storeId,
        keywordId,
        force,
      });
      return NextResponse.json({
        success: true,
        queued: true,
        jobId: job.id,
      });
    }

    const run = await RankRunService.triggerRankRun(
      authorizedContext.tenantId,
      storeId,
      keywordId,
      { force, gridSize, radiusKm },
      authorizedContext
    );

    return NextResponse.json({ success: true, run });
  } catch (error) {
    return handleRouteError(error, 'Failed to trigger rank scan.');
  }
}
