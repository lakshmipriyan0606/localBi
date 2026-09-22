import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext, user } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_CONNECT);

    const returnUrl = request.nextUrl.searchParams.get('returnUrl') || `/client/${tenant.slug}/integrations`;
    const authorizationUrl = GoogleOAuthService.getAuthorizationUrl(tenant.id, user.id, returnUrl);

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

