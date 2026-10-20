import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { PortalDomainService } from '@/modules/agency/portal-domain-service';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; domainId: string }> }
) {
  try {
    const { tenantSlug, domainId } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const isProduction =
      process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    const body = await request.json().catch(() => ({}));

    if (isProduction && body?.simulated === true) {
      return NextResponse.json(
        { success: false, error: 'Development verification bypass cannot be used in production.' },
        { status: 400 }
      );
    }

    const allowSimulated = !isProduction && body?.simulated === true;

    const verified = await PortalDomainService.verifyPortalDomain(
      tenant.id,
      domainId,
      authorizedContext,
      { simulatedVerification: allowSimulated }
    );

    return NextResponse.json({ success: true, data: verified });
  } catch (error) {
    return handleRouteError(error);
  }
}
