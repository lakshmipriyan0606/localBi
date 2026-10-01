import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/client';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { GoogleApiClient } from '@/modules/integrations/google/google-api-client';
import { SyncWorkerService } from '@/modules/sync/sync-worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const tenants = await prisma.tenant.findMany();
    const connections = await prisma.integrationConnection.findMany();
    const mappings = await prisma.internalResourceMapping.findMany();
    const resources = await prisma.externalResource.findMany();
    const brands = await prisma.brand.findMany();
    const gscProperties = await prisma.gscProperty.findMany();
    const gscTotals = await prisma.gscDailyPropertyTotal.findMany({ take: 20 });
    const gscQueries = await prisma.gscDailyQueryMetric.findMany({ take: 20 });
    const syncRuns = await prisma.syncRun.findMany({ orderBy: { startedAt: 'desc' }, take: 10 });
    const syncCursors = await prisma.syncCursor.findMany();

    const searchParams = req.nextUrl.searchParams;
    let syncResult: any = null;
    let gscApiDirectTest: any = null;

    const tenant = tenants[0];
    const activeConnection = connections.find(c => c.status === 'ACTIVE');

    if (searchParams.get('testGsc') === 'true' && tenant && activeConnection) {
      try {
        const accessToken = await GoogleOAuthService.refreshAccessToken(
          activeConnection.encryptedRefreshToken,
          tenant.id,
          activeConnection.id,
          true
        );

        const propertyUrl = 'https://lakshmipriyan-portfolio.vercel.app/';
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
        const endDate = today.toISOString().slice(0, 10);

        // Test sites list
        const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const sitesData = await sitesRes.json().catch(() => null);

        // Test search analytics query
        let queryData: any = null;
        let queryError: any = null;
        try {
          const rows = await GoogleApiClient.queryGscSearchAnalytics(
            accessToken,
            propertyUrl,
            startDate,
            endDate,
            ['date'],
            'WEB'
          );
          queryData = rows;
        } catch (e: any) {
          queryError = { message: e.message, stack: e.stack };
        }

        gscApiDirectTest = {
          tokenOk: Boolean(accessToken),
          sitesList: sitesData,
          queryStartDate: startDate,
          queryEndDate: endDate,
          queryRows: queryData,
          queryError,
        };
      } catch (err: any) {
        gscApiDirectTest = { error: err.message, stack: err.stack };
      }
    }

    if (searchParams.get('runSync') === 'true' && tenant && activeConnection) {
      try {
        const accessToken = await GoogleOAuthService.refreshAccessToken(
          activeConnection.encryptedRefreshToken,
          tenant.id,
          activeConnection.id,
          true
        );
        const prop = gscProperties[0];
        if (!prop) {
          throw new Error('No GscProperty found in database');
        }
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
        const endDate = today.toISOString().slice(0, 10);

        try {
          const directRows = await (SyncWorkerService as any).processGscJob({
            type: 'GSC_SYNC',
            tenantId: tenant.id,
            propertyId: prop.id,
            propertyUrl: prop.propertyUrl,
            startDate,
            endDate,
            searchType: 'WEB',
            businessKey: `${tenant.id}:gsc:${prop.id}:${startDate}:${endDate}:WEB`,
          }, accessToken);
          syncResult = { success: true, directRows };
        } catch (jobErr: any) {
          syncResult = { success: false, processGscJobError: jobErr.message, stack: jobErr.stack };
        }
      } catch (err: any) {
        syncResult = { success: false, error: err.message, stack: err.stack };
      }
    }

    const payload = {
      tenants,
      brands,
      connections: connections.map(c => ({ ...c, encryptedRefreshToken: c.encryptedRefreshToken ? '[PRESENT]' : '[NONE]' })),
      mappings,
      resources,
      gscProperties,
      gscTotalsCount: gscTotals.length,
      gscTotals,
      gscQueriesCount: gscQueries.length,
      syncRuns,
      syncCursors,
      gscApiDirectTest,
      syncResult,
    };

    return new Response(JSON.stringify(payload, (_, v) => typeof v === 'bigint' ? v.toString() : v), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

