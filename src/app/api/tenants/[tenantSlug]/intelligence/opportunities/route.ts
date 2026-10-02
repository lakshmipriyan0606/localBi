import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { OpportunityService } from '@/modules/intelligence/opportunity-service';
import { handleRouteError } from '@/shared/errors';
import {
  OpportunityStatusValue,
  OpportunityPriorityValue,
  OpportunityTypeValue,
  OpportunityActionTypeValue,
} from '@/modules/intelligence/opportunity-types';

export async function GET(
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

    AuthorizationService.assertCan(authorizedContext, Action.OPPORTUNITY_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId') || undefined;
    const storeId = searchParams.get('storeId') || undefined;
    const status = (searchParams.get('status') as OpportunityStatusValue | 'ALL') || undefined;
    const priority = (searchParams.get('priority') as OpportunityPriorityValue) || undefined;
    const type = (searchParams.get('type') as OpportunityTypeValue) || undefined;
    const actionType = (searchParams.get('actionType') as OpportunityActionTypeValue) || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await OpportunityService.listOpportunities(
      tenant.id,
      {
        brandId,
        storeId,
        status,
        priority,
        type,
        actionType,
        search,
        page,
        pageSize,
      },
      authorizedContext
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

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

    AuthorizationService.assertCan(authorizedContext, Action.OPPORTUNITY_MANAGE);

    const body = await request.json().catch(() => ({}));
    const brandId = body.brandId;

    if (!brandId) {
      return NextResponse.json(
        { error: 'brandId is required to run opportunity evaluation.' },
        { status: 400 }
      );
    }

    const result = await OpportunityService.runOpportunityEvaluation(
      tenant.id,
      brandId,
      authorizedContext
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
