import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { GbpLocationService } from '@/modules/reports/gbp-location-service';
import { handleRouteError } from '@/shared/errors';

/**
 * GET /api/tenants/[tenantSlug]/reports/gbp/performance
 *
 * Returns GBP performance metrics (calls, directions, impressions, website clicks)
 * sourced exclusively from GOOGLE_BUSINESS_PROFILE (gbp_daily_metrics table).
 *
 * Query params:
 *   brandId (required)
 *   locationId (optional, scopes to single store)
 *   startDate (ISO date, default: 30 days ago)
 *   endDate   (ISO date, default: today)
 *   metrics   (comma-separated list, default: all)
 *
 * Data provenance:
 *   - All rows carry metricType from GBP Performance API
 *   - NEVER mixed with GSC queries (which are source=GSC)
 *   - UI MUST label these as "Google Business Profile Actions"
 *     and LocalBi's own attribution events as "LocalBi Website Actions"
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext, tenant } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    const locationId = searchParams.get('locationId') || undefined;

    // Parse and validate dates
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const rawStart = searchParams.get('startDate');
    const rawEnd = searchParams.get('endDate');
    const startDate = rawStart ? new Date(rawStart) : defaultStart;
    const endDate = rawEnd ? new Date(rawEnd) : now;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate or endDate' }, { status: 400 });
    }
    if (startDate > endDate) {
      return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 });
    }

    const metricsParam = searchParams.get('metrics');
    const metrics = metricsParam ? metricsParam.split(',').map((m) => m.trim()).filter(Boolean) : undefined;

    const data = await GbpLocationService.getPerformanceMetrics(
      tenant.id,
      brandId,
      { locationId, startDate, endDate, metrics },
      authorizedContext
    );

    return NextResponse.json({
      success: true,
      data,
      meta: {
        provenance: 'GOOGLE_BUSINESS_PROFILE',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        note: 'Metrics sourced from Google Business Profile Performance API. Distinct from Google Search Console and LocalBi attribution data.',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
