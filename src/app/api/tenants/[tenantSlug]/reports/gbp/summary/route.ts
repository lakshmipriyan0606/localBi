import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { GbpLocationService } from '@/modules/reports/gbp-location-service';
import { handleRouteError } from '@/shared/errors';

/**
 * GET /api/tenants/[tenantSlug]/reports/gbp/summary
 *
 * Returns brand-wide GBP dashboard summary:
 * - mapped / unmapped locations
 * - sync health (errors, reauth required)
 * - total reviews, unanswered reviews, avg rating
 * - per-store table rows with GBP status, rating, 30-day performance
 *
 * Source: GOOGLE_BUSINESS_PROFILE (DB snapshot — no live Google calls)
 * Never mixes with GSC, GA4, or LocalBi attribution metrics.
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

    const data = await GbpLocationService.getBrandGbpDashboard(
      tenant.id,
      brandId,
      authorizedContext
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
