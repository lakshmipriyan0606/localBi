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
    const { type, internalId, externalResourceId, brandId } = body;

    let result;
    if (type === 'AUTO_BRAND') {
      const targetBrandId = brandId || internalId;
      if (!targetBrandId) {
        throw createValidationError('Missing brandId for AUTO_BRAND mapping');
      }
      result = await ResourceMappingService.autoMapBrandLocations(
        tenant.id,
        targetBrandId,
        authorizedContext
      );
    } else if (type === 'LOCATION') {
      if (!internalId || !externalResourceId) {
        throw createValidationError('Missing required mapping fields: internalId, externalResourceId');
      }
      result = await ResourceMappingService.mapGbpLocation(
        tenant.id,
        internalId,
        externalResourceId,
        authorizedContext
      );
    } else if (type === 'BRAND') {
      if (!internalId || !externalResourceId) {
        throw createValidationError('Missing required mapping fields: internalId, externalResourceId');
      }
      result = await ResourceMappingService.mapGscProperty(
        tenant.id,
        internalId,
        externalResourceId,
        authorizedContext
      );
    } else if (type === 'GA4_PROPERTY') {
      if (!internalId || !externalResourceId) {
        throw createValidationError('Missing required mapping fields: internalId, externalResourceId');
      }
      const internalType = (body.internalType === 'LOCATION') ? 'LOCATION' : 'BRAND';
      result = await ResourceMappingService.mapGa4Property(
        tenant.id,
        internalId,
        internalType,
        externalResourceId,
        authorizedContext
      );
    } else if (type === 'WEBSURFACE') {
      const targetWebSurfaceId = body.webSurfaceId || internalId;
      const targetBrandId = body.brandId;
      if (!targetWebSurfaceId || !targetBrandId || !externalResourceId) {
        throw createValidationError('Missing required fields for WEBSURFACE mapping: brandId, webSurfaceId, externalResourceId');
      }
      result = await ResourceMappingService.mapResourceToWebSurface({
        tenantId: tenant.id,
        brandId: targetBrandId,
        webSurfaceId: targetWebSurfaceId,
        externalResourceId,
        filterStrategy: body.filterStrategy,
        customHostname: body.customHostname,
        customUrlPrefix: body.customUrlPrefix,
        context: authorizedContext,
      });
    } else {
      throw createValidationError(`Unsupported mapping type: "${type}". Expected WEBSURFACE, LOCATION, BRAND, GA4_PROPERTY, or AUTO_BRAND.`);
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
