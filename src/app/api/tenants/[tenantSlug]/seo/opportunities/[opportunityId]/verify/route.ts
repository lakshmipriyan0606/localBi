import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SeoVerificationService } from '@/modules/seo-intelligence/seo-verification-service';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; opportunityId: string }> }
) {
  try {
    const { tenantSlug, opportunityId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized');

    const result = await SeoVerificationService.verifyImplementation(
      {
        tenantId: authorizedContext.tenantId,
        opportunityId,
      },
      authorizedContext
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to verify recommendation implementation');
  }
}
