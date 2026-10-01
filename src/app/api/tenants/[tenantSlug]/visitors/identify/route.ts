import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { VisitorService } from '@/modules/visitors/visitor-service';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  req: NextRequest,
  segmentData: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await segmentData.params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 403 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.DASHBOARD_VIEW);

    const body = await req.json();
    const { deviceFingerprint, phone, name, email } = body;

    if (!deviceFingerprint || !phone) {
      return NextResponse.json(
        { error: 'deviceFingerprint and phone are required.' },
        { status: 400 }
      );
    }

    const updated = await VisitorService.identifyVisitor({
      tenantId: tenant.id,
      deviceFingerprint,
      phone,
      name,
      email,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Device session not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: updated,
      message: `Phone ${phone} successfully stitched to device ${deviceFingerprint} for ${tenantSlug}`,
    });
  } catch (error) {
    return handleRouteError(error, 'Error identifying visitor');
  }
}
