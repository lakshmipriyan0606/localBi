import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { MerchantDashboardService } from '@/modules/merchant/merchant-dashboard-service';
import { MerchantCatalogService } from '@/modules/merchant/merchant-catalog-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; storeId: string }> }
) {
  try {
    const { tenantSlug, storeId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const result = await MerchantDashboardService.getStoreInventoryDashboard(authorizedContext, storeId);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch Store local inventory dashboard.');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; storeId: string }> }
) {
  try {
    const { tenantSlug, storeId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json().catch(() => ({}));
    const force = body.force ?? false;

    const result = await MerchantCatalogService.syncStoreInventory(authorizedContext, storeId, { force });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to sync Store local inventory.');
  }
}
