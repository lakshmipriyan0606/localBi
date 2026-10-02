import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { MerchantDiagnosticsService } from '@/modules/merchant/merchant-diagnostics-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; brandId: string }> }
) {
  try {
    const { tenantSlug, brandId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const { searchParams } = new URL(request.url);
    const severity = (searchParams.get('severity') as any) || undefined;
    const isResolved = searchParams.get('isResolved') ? searchParams.get('isResolved') === 'true' : false;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const result = await MerchantDiagnosticsService.listBrandIssues(authorizedContext, brandId, {
      severity,
      isResolved,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to list Brand Merchant issues.');
  }
}
