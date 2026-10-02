import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { DuplicateDetectionService } from '@/modules/listings/duplicate-detection-service';
import { handleRouteError, createValidationError } from '@/shared/errors';
import { DuplicateCandidateStatusType } from '@/modules/listings/listing-types';

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

    AuthorizationService.assertCan(authorizedContext, Action.LISTING_DUPLICATE_MANAGE);

    const body = await request.json();
    if (!body.status) {
      throw createValidationError('Resolution status is required');
    }

    const result = await DuplicateDetectionService.resolveCandidate(
      tenant.id,
      id,
      {
        status: body.status as DuplicateCandidateStatusType,
        resolvedBy: authorizedContext.userId,
        resolutionNote: body.resolutionNote,
      }
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error, 'Failed to resolve duplicate candidate', { params });
  }
}
