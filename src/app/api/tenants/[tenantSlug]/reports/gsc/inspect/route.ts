import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { GscIndexingService } from '@/modules/integrations/google/gsc-indexing-service';
import { handleRouteError, createValidationError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.DASHBOARD_VIEW);

    const body = await request.json();
    const url = body.url;

    if (!url || typeof url !== 'string') {
      throw createValidationError('Missing required field: url');
    }

    const inspection = await GscIndexingService.inspectUrl(tenant.id, url.trim());

    return NextResponse.json({ success: true, data: inspection });
  } catch (error) {
    return handleRouteError(error);
  }
}
