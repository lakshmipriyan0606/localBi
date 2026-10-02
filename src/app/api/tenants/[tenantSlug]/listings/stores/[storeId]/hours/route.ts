import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ListingProfileService } from '@/modules/listings/listing-profile-service';
import { handleRouteError, createValidationError } from '@/shared/errors';
import { StoreDayHours } from '@/modules/listings/listing-types';

export async function GET(
  _request: NextRequest,
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

    AuthorizationService.assertCan(authorizedContext, Action.LISTING_VIEW);
    AuthorizationService.assertLocationAccess(authorizedContext, storeId);

    const hours = await ListingProfileService.getStoreHours(tenant.id, storeId);

    return NextResponse.json({ data: hours });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch store hours', { params });
  }
}

export async function PUT(
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

    AuthorizationService.assertCan(authorizedContext, Action.LISTING_UPDATE);
    AuthorizationService.assertLocationAccess(authorizedContext, storeId);

    const body = await request.json();
    if (!Array.isArray(body.hours)) {
      throw createValidationError('Hours array is required');
    }

    const updatedHours = await ListingProfileService.updateStoreHours(
      tenant.id,
      storeId,
      body.hours as StoreDayHours[]
    );

    return NextResponse.json({ data: updatedHours });
  } catch (error) {
    return handleRouteError(error, 'Failed to update store hours', { params });
  }
}
