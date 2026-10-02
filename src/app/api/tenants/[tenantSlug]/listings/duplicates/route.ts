import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { DuplicateDetectionService } from '@/modules/listings/duplicate-detection-service';
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
    const storeId = searchParams.get('storeId') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const status = searchParams.get('status') || undefined;

    const duplicates = await DuplicateDetectionService.getDuplicates(tenant.id, {
      storeId,
      provider,
      status,
    });

    return NextResponse.json({ data: duplicates });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch duplicate candidates', { params });
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

    AuthorizationService.assertCan(authorizedContext, Action.LISTING_DUPLICATE_MANAGE);

    const body = await request.json();
    if (!body.storeId) {
      throw createValidationError('Store ID is required');
    }

    AuthorizationService.assertLocationAccess(authorizedContext, body.storeId);

    const scanResult = await DuplicateDetectionService.scanForDuplicates(
      tenant.id,
      body.storeId
    );

    return NextResponse.json({ data: scanResult });
  } catch (error) {
    return handleRouteError(error, 'Failed to scan for duplicates', { params });
  }
}
