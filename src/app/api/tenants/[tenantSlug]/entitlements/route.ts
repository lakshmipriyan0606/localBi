import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { EntitlementService } from '@/modules/agency/entitlement-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const clientAccountId = searchParams.get('clientAccountId') || undefined;

    const entitlements = await EntitlementService.getEntitlements(
      tenant.id,
      clientAccountId
    );

    return NextResponse.json({ success: true, data: entitlements });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const body = await request.json();
    const { featureKey, enabled, limits, clientAccountId } = body;

    if (!featureKey) {
      return NextResponse.json({ error: 'featureKey is required' }, { status: 400 });
    }

    if (clientAccountId) {
      await EntitlementService.setClientEntitlement(
        tenant.id,
        clientAccountId,
        featureKey,
        enabled ?? true,
        limits || {},
        authorizedContext
      );
    } else {
      await EntitlementService.setTenantEntitlement(
        tenant.id,
        featureKey,
        enabled ?? true,
        limits || {},
        authorizedContext
      );
    }

    const updated = await EntitlementService.getEntitlements(tenant.id, clientAccountId);
    const updatedDto = updated[featureKey] || { featureKey, enabled: enabled ?? true, limits: limits || {}, source: 'MANUAL_OVERRIDE' as const };
    return NextResponse.json({ success: true, data: updatedDto });
  } catch (error) {
    return handleRouteError(error);
  }
}
