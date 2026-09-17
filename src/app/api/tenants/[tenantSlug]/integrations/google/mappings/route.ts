import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ResourceMappingService } from '@/modules/integrations/resource-mapping-service';
import { handleRouteError, createValidationError } from '@/shared/errors';

export async function GET(
  _request: NextRequest,
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

    AuthorizationService.assertCan(authorizedContext, Action.TENANT_VIEW);

    const data = await ResourceMappingService.listTenantMappingState(tenant.id, authorizedContext);

    return NextResponse.json({ success: true, data });
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

    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_MAP);

    const body = await request.json().catch(() => ({}));
    const { type, internalId, externalResourceId } = body;

    if (!type || !internalId || !externalResourceId) {
      throw createValidationError(
        'Missing required mapping fields: type (LOCATION or BRAND), internalId, externalResourceId'
      );
    }

    let result;
    if (type === 'LOCATION') {
      result = await ResourceMappingService.mapGbpLocation(
        tenant.id,
        internalId,
        externalResourceId,
        authorizedContext
      );
    } else if (type === 'BRAND') {
      result = await ResourceMappingService.mapGscProperty(
        tenant.id,
        internalId,
        externalResourceId,
        authorizedContext
      );
    } else {
      throw createValidationError(`Unsupported mapping type: "${type}". Expected LOCATION or BRAND.`);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
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

    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_MAP);

    const searchParams = request.nextUrl.searchParams;
    const mappingId = searchParams.get('mappingId');

    if (!mappingId) {
      throw createValidationError('Missing mappingId query parameter');
    }

    const result = await ResourceMappingService.unmapResource(tenant.id, mappingId, authorizedContext);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
