import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { BacklinkVerificationService } from '@/modules/seo-authority/backlink-verification-service';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized');

    const body = await request.json();
    const { linkingUrl, targetUrl } = body;

    if (!linkingUrl || !targetUrl) {
      return NextResponse.json(
        { success: false, error: 'linkingUrl and targetUrl are required' },
        { status: 400 }
      );
    }

    const verification = await BacklinkVerificationService.verifyLink(
      linkingUrl,
      targetUrl
    );

    return NextResponse.json({ success: true, data: verification });
  } catch (error) {
    return handleRouteError(error, 'Failed to verify external link');
  }
}
