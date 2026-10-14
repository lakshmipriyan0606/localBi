import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { GscSitemapsService } from '@/modules/integrations/google/gsc-sitemaps-service';
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

    AuthorizationService.assertCan(authorizedContext, Action.DASHBOARD_VIEW);

    const brandId = request.nextUrl.searchParams.get('brandId') || undefined;
    const propertyId = request.nextUrl.searchParams.get('propertyId') || undefined;

    if (brandId && authorizedContext.scopeMode === 'RESTRICTED') {
      if (!authorizedContext.grantedBrandIds.has(brandId)) {
        return NextResponse.json({ error: 'Access denied to the specified brand' }, { status: 403 });
      }
    }

    const summary = await GscSitemapsService.getSitemaps(tenant.id, brandId, propertyId);

    return NextResponse.json({ success: true, data: summary });
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

    AuthorizationService.assertCan(authorizedContext, Action.DASHBOARD_VIEW);

    const body = await request.json();
    const sitemapUrl = body.sitemapUrl;
    const brandId = body.brandId || request.nextUrl.searchParams.get('brandId') || undefined;
    const propertyId = body.propertyId || request.nextUrl.searchParams.get('propertyId') || undefined;

    if (!sitemapUrl || typeof sitemapUrl !== 'string') {
      throw createValidationError('Missing required field: sitemapUrl');
    }

    if (brandId && authorizedContext.scopeMode === 'RESTRICTED') {
      if (!authorizedContext.grantedBrandIds.has(brandId)) {
        return NextResponse.json({ error: 'Access denied to the specified brand' }, { status: 403 });
      }
    }

    const sitemap = await GscSitemapsService.submitSitemap(tenant.id, sitemapUrl.trim(), brandId, propertyId);

    return NextResponse.json({ success: true, data: sitemap });
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

    AuthorizationService.assertCan(authorizedContext, Action.DASHBOARD_VIEW);

    const body = await request.json();
    const sitemapUrl = body.sitemapUrl;
    const brandId = body.brandId || request.nextUrl.searchParams.get('brandId') || undefined;
    const propertyId = body.propertyId || request.nextUrl.searchParams.get('propertyId') || undefined;

    if (!sitemapUrl || typeof sitemapUrl !== 'string') {
      throw createValidationError('Missing required field: sitemapUrl');
    }

    if (brandId && authorizedContext.scopeMode === 'RESTRICTED') {
      if (!authorizedContext.grantedBrandIds.has(brandId)) {
        return NextResponse.json({ error: 'Access denied to the specified brand' }, { status: 403 });
      }
    }

    await GscSitemapsService.deleteSitemap(tenant.id, sitemapUrl.trim(), brandId, propertyId);

    return NextResponse.json({ success: true, message: 'Sitemap deleted successfully' });
  } catch (error) {
    return handleRouteError(error);
  }
}
