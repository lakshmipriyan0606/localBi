import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ListingService } from '@/modules/listings/listing-service';
import { handleRouteError, createValidationError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  try {
    const { tenantSlug, id } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.LISTING_MANAGE);

    const body = await request.json();
    if (!body.decision || !['APPROVED', 'REJECTED'].includes(body.decision)) {
      throw createValidationError('Decision must be APPROVED or REJECTED');
    }

    const result = await ListingService.reviewChangeSet(
      tenant.id,
      id,
      body.decision,
      authorizedContext.userId,
      body.reviewNote
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error, 'Failed to review change set', { params });
  }
}
