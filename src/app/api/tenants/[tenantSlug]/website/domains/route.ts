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
      searchParams.get('brandId')
    );

    if (!brandId) {
      return NextResponse.json({ success: true, domains: [] });
    }

    const surface = await SiteStudioService.getOrCreateLocalBiSurface(
      authorizedContext.tenantId,
      brandId
    );

    const allDomains = await SurfaceService.listDomainsForSurface(
      authorizedContext.tenantId,
      surface.id
    );

    // Strictly filter out customer-facing *.localbi.app subdomains!
    const clientDomains = allDomains.filter((d) => !d.hostname.endsWith('.localbi.app'));

    return NextResponse.json({ success: true, domains: clientDomains, brandId });
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
      body.brandId
    );
    const hostname = body.hostname?.trim()?.toLowerCase();

    if (!brandId || !hostname) {
      return NextResponse.json(
        { success: false, error: 'A brand and hostname are required.' },
        { status: 400 }
      );
    }

    // Disallow *.localbi.app subdomains per strict enterprise requirement
    if (hostname.endsWith('.localbi.app')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'LocalBi customer subdomains (*.localbi.app) are not allowed. Please enter your client-owned domain (e.g. www.abc.com).',
        },
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

export async function PATCH(
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
      body.brandId
    );

    if (!brandId || !body.domainId) {
      return NextResponse.json(
        { success: false, error: 'brandId and domainId are required.' },
        { status: 400 }
      );
    }

    if (body.action === 'VERIFY') {
      const verificationResult = await SiteStudioService.verifyDomainDns(
        authorizedContext.tenantId,
        brandId,
        body.domainId
      );
      return NextResponse.json({ success: true, ...verificationResult });
    }

    if (body.action === 'MAKE_PRIMARY') {
      const surface = await SiteStudioService.getOrCreateLocalBiSurface(
        authorizedContext.tenantId,
        brandId
      );

      // Demote existing primary domains
      await prisma.domain.updateMany({
        where: { tenantId: authorizedContext.tenantId, webSurfaceId: surface.id, isPrimary: true },
        data: { isPrimary: false },
      });

      // Promote target domain
      const updated = await prisma.domain.update({
        where: { id: body.domainId, tenantId: authorizedContext.tenantId },
        data: { isPrimary: true },
      });

      return NextResponse.json({ success: true, domain: updated });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: "${body.action}"` },
      { status: 400 }
    );
  } catch (error) {
    return handleRouteError(error, 'Failed to update domain.');
  }
}

export async function DELETE(
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
    const domainId = searchParams.get('domainId');
    const brandId = await SiteStudioService.resolveBrandId(
      authorizedContext.tenantId,
      searchParams.get('brandId')
    );

    if (!domainId || !brandId) {
      return NextResponse.json(
        { success: false, error: 'domainId and brandId are required.' },
        { status: 400 }
      );
    }

    await SurfaceService.removeDomain(authorizedContext.tenantId, brandId, domainId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to remove domain.');
  }
}
