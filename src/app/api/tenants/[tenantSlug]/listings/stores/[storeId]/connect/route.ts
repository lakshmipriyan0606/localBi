import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ListingService } from '@/modules/listings/listing-service';
import { handleRouteError, createValidationError } from '@/shared/errors';
import { ListingProviderType } from '@/modules/listings/listing-types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; storeId: string }> }
) {
  try {
    const { tenantSlug, storeId } = await params;
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
    AuthorizationService.assertLocationAccess(authorizedContext, storeId);

    const body = await request.json();
    if (!body.provider) {
      throw createValidationError('Provider is required');
    }

    const listing = await ListingService.connectListing(tenant.id, storeId, {
      provider: body.provider as ListingProviderType,
      externalListingId: body.externalListingId,
      providerUrl: body.providerUrl,
      snapshot: body.snapshot,
    });

    return NextResponse.json({ data: listing }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to connect listing', { params });
  }
}
