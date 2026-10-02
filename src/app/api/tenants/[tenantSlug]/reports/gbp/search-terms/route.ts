import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { GbpSearchTermService } from '@/modules/reports/gbp-search-term-service';
import { handleRouteError } from '@/shared/errors';

/**
 * GET /api/tenants/[tenantSlug]/reports/gbp/search-terms
 *
 * Returns GBP keyword impression data (source: GOOGLE_BUSINESS_PROFILE).
 *
 * IMPORTANT DATA PROVENANCE:
 * - These are GBP search terms from the Business Profile Performance API
 * - They are DISTINCT from Google Search Console queries (which are in /reports/gsc/*)
 * - UI MUST label these "GBP Search Terms" and NEVER mix with GSC data
 *
 * Note: The GBP Performance API does not currently expose keyword-level impressions.
 * This endpoint returns empty results (not an error) when no data is available.
 * It will activate automatically when the API exposes the data.
 *
 * Query params:
 *   brandId (required)
 *   locationId (optional)
 *   periodStart (ISO date, optional)
 *   periodEnd (ISO date, optional)
 *   limit (default: 100)
 *   offset (default: 0)
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
    const rawPeriodStart = searchParams.get('periodStart');
    const rawPeriodEnd = searchParams.get('periodEnd');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const periodStart = rawPeriodStart ? new Date(rawPeriodStart) : undefined;
    const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd) : undefined;

    const data = await GbpSearchTermService.getSearchTerms(
      tenant.id,
      brandId,
      { locationId, periodStart, periodEnd, limit, offset },
      authorizedContext
    );

    return NextResponse.json({
      success: true,
      data,
      meta: {
        provenance: 'GOOGLE_BUSINESS_PROFILE',
        disclaimer: 'GBP search terms are distinct from Google Search Console queries. The Business Profile Performance API does not currently expose keyword-level impressions. Results will be empty until the API provides this data.',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
