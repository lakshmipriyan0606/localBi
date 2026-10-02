import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { MerchantCatalogService } from '@/modules/merchant/merchant-catalog-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; brandId: string }> }
) {
  try {
    const { tenantSlug, brandId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const config = await MerchantCatalogService.getBrandMerchantConfig(authorizedContext, brandId);

    return NextResponse.json({ success: true, config });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch Brand Merchant Center configuration.');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; brandId: string }> }
) {
  try {
    const { tenantSlug, brandId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const { merchantAccountId, targetCountry, contentLanguage, defaultCurrency, feedLabel } = body;

    const config = await MerchantCatalogService.mapBrandToMerchantAccount(authorizedContext, {
      brandId,
      merchantAccountId,
      targetCountry,
      contentLanguage,
      defaultCurrency,
      feedLabel,
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    return handleRouteError(error, 'Failed to update Brand Merchant Center configuration.');
  }
}
