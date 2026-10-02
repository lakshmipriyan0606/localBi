import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { OpportunityService } from '@/modules/intelligence/opportunity-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  _request: NextRequest,
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

    AuthorizationService.assertCan(authorizedContext, Action.OPPORTUNITY_VIEW);

    const opportunity = await OpportunityService.getOpportunityById(
      tenant.id,
      opportunityId,
      authorizedContext
    );

    return NextResponse.json(opportunity);
  } catch (error) {
    return handleRouteError(error);
  }
}
