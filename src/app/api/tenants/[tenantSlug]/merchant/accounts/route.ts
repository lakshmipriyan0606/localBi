import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { MerchantCatalogService } from '@/modules/merchant/merchant-catalog-service';
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
    const connectionId = searchParams.get('connectionId') || 'default';

    const accounts = await MerchantCatalogService.discoverAccounts(authorizedContext, connectionId);

    return NextResponse.json({ success: true, accounts });
  } catch (error) {
    return handleRouteError(error, 'Failed to discover Merchant Center accounts.');
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
    const { brandId, merchantAccountId, targetCountry, contentLanguage, defaultCurrency, feedLabel } = body;

    if (!brandId || !merchantAccountId) {
      return NextResponse.json(
        { error: 'brandId and merchantAccountId are required.' },
        { status: 400 }
      );
    }

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
    return handleRouteError(error, 'Failed to map Brand to Merchant Center account.');
  }
}
