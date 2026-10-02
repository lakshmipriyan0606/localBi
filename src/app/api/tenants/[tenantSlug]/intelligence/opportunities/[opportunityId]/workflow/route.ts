import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { OpportunityService } from '@/modules/intelligence/opportunity-service';
import { handleRouteError } from '@/shared/errors';
import { OpportunityStatusValue } from '@/modules/intelligence/opportunity-types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; opportunityId: string }> }
) {
  try {
    const { tenantSlug, opportunityId } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body.status as OpportunityStatusValue;
    const dismissalReason = body.dismissalReason as string | undefined;

    if (!status) {
      return NextResponse.json(
        { error: 'status is required for workflow transition.' },
        { status: 400 }
      );
    }

    const updated = await OpportunityService.updateWorkflowStatus(
      tenant.id,
      opportunityId,
      {
        status,
        dismissalReason,
      },
      authorizedContext
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
