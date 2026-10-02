import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ListingService } from '@/modules/listings/listing-service';
import { handleRouteError, createValidationError } from '@/shared/errors';

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

    AuthorizationService.assertCan(authorizedContext, Action.LISTING_VIEW);

    const searchParams = request.nextUrl.searchParams;
    const listingId = searchParams.get('listingId') || undefined;
    const status = searchParams.get('status') || undefined;

    const changeSets = await ListingService.getChangeSets(tenant.id, {
      listingId,
      status,
    });

    return NextResponse.json({ data: changeSets });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch change sets', { params });
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

    AuthorizationService.assertCan(authorizedContext, Action.LISTING_UPDATE);

    const body = await request.json();
    if (!body.listingId) {
      throw createValidationError('Listing ID is required');
    }

    const changeSet = await ListingService.proposeChangeSet(
      tenant.id,
      body.listingId,
      authorizedContext.userId
    );

    return NextResponse.json({ data: changeSet }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to propose change set', { params });
  }
}
