import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SurfaceService } from '@/modules/page-builder/surface-service';
import { SiteStudioService } from '@/modules/page-builder/site-studio-service';
import { prisma } from '@/shared/database/client';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const { searchParams } = new URL(request.url);
    const brandId = await SiteStudioService.resolveBrandId(
      authorizedContext.tenantId,
      searchParams.get('brandId') || authorizedContext.brandId
    );

    if (!brandId) {
      return NextResponse.json({ success: true, domains: [] });
    }

    const surface = await SiteStudioService.getOrCreateLocalBiSurface(
      authorizedContext.tenantId,
      brandId
    );

    const domains = await SurfaceService.listDomainsForSurface(
      authorizedContext.tenantId,
      surface.id
    );

    return NextResponse.json({ success: true, domains, brandId });
  } catch (error) {
    return handleRouteError(error, 'Failed to list domains.');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const brandId = await SiteStudioService.resolveBrandId(
      authorizedContext.tenantId,
      body.brandId || authorizedContext.brandId
    );
    const hostname = body.hostname;

    if (!brandId || !hostname) {
      return NextResponse.json(
        { success: false, error: 'A brand and hostname are required.' },
        { status: 400 }
      );
    }

    const surface = await SiteStudioService.getOrCreateLocalBiSurface(
      authorizedContext.tenantId,
      brandId
    );

    const domain = await SurfaceService.addDomain(
      authorizedContext.tenantId,
      brandId,
      surface.id,
      hostname,
      Boolean(body.isPrimary)
    );

    return NextResponse.json({ success: true, domain });
  } catch (error) {
    return handleRouteError(error, 'Failed to add domain.');
  }
}
