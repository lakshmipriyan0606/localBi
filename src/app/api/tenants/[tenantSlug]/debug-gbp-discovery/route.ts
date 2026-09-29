import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);
    const { tenant } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' });

    const { prisma } = await import('@/shared/database/client');
    const { TenantContextService } = await import('@/shared/database/tenant-context');
    const { GoogleOAuthService } = await import('@/modules/integrations/google/google-oauth-service');

    return TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      // Step 1: Get the active connection
      const connection = await tx.integrationConnection.findFirst({
        where: { tenantId: tenant.id, status: 'ACTIVE' }
      });

      if (!connection) {
        return NextResponse.json({
          step: 'CONNECTION',
          error: 'No active integration connection found in DB. You must connect your Google account first!',
          tenantId: tenant.id
        });
      }

      // Step 2: Get a fresh access token
      let accessToken: string;
      try {
        accessToken = await GoogleOAuthService.refreshAccessToken(
          connection.encryptedRefreshToken,
          tenant.id,
          connection.id
        );
      } catch (err: any) {
        return NextResponse.json({
          step: 'TOKEN_REFRESH',
          error: 'Failed to get access token from Google. Your OAuth token may be expired/revoked.',
          message: err.message,
          connectionEmail: connection.externalEmail
        });
      }

      // Step 3: Call accounts API directly
      const accountsRes = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const accountsBody = accountsRes.ok ? await accountsRes.json() : { error: await accountsRes.text(), status: accountsRes.status };

      // Step 4: Call wildcard accounts/- directly  
      const wildcardRes = await fetch(
        'https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title,storeCode,storefrontAddress,metadata',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const wildcardBody = wildcardRes.ok ? await wildcardRes.json() : { error: await wildcardRes.text(), status: wildcardRes.status };

      // Step 5: Also try v4 wildcard
      const v4WildcardRes = await fetch(
        'https://mybusiness.googleapis.com/v4/accounts/-/locations',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const v4WildcardBody = v4WildcardRes.ok ? await v4WildcardRes.json() : { error: await v4WildcardRes.text(), status: v4WildcardRes.status };

      return NextResponse.json({
        success: true,
        connectionEmail: connection.externalEmail,
        step1_accountsApi: {
          status: accountsRes.status,
          body: accountsBody
        },
        step2_v1WildcardLocations: {
          status: wildcardRes.status,
          body: wildcardBody
        },
        step3_v4WildcardLocations: {
          status: v4WildcardRes.status,
          body: v4WildcardBody
        }
      });
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
