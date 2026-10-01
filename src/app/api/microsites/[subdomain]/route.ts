import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { MicrositeService } from '@/modules/microsites/microsite-service';
import { TenantContextService } from '@/shared/database/tenant-context';
import { prisma } from '@/shared/database/client';
import { handleRouteError } from '@/shared/errors';

async function resolveAuthorizedTenantForMicrosite(rawToken: string | null, subdomain: string, tenantSlugParam?: string | null) {
  if (tenantSlugParam) {
    const context = await ContextResolver.resolveTenantContext(rawToken, tenantSlugParam);
    if (!context.tenant || !context.authorizedContext) {
      return null;
    }
    return context;
  }

  const { user } = await ContextResolver.requireAuthenticatedUser(rawToken);
  const memberships = await TenantContextService.withUserControlPlaneContext(
    prisma,
    user.id,
    async (tx) => {
      return tx.tenantMembership.findMany({
        where: { userId: user.id },
        include: { tenant: { select: { id: true, slug: true } } },
      });
    }
  );

  for (const m of memberships) {
    const site = await TenantContextService.withTenantContext(prisma, m.tenantId, async (tx) => {
      return tx.microsite.findFirst({
        where: { subdomain },
        select: { id: true },
      });
    });
    if (site) {
      return ContextResolver.resolveTenantContext(rawToken, m.tenant.slug);
    }
  }

  return null;
}

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await segmentData.params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenantSlug');

    // 1. Try authenticated admin read if session exists
    if (rawToken) {
      try {
        const resolved = await resolveAuthorizedTenantForMicrosite(rawToken, subdomain, tenantSlug);
        if (resolved?.tenant && resolved?.authorizedContext) {
          AuthorizationService.assertCan(resolved.authorizedContext, Action.MICROSITE_VIEW);
          const adminSite = await MicrositeService.getMicrositeForAdministration(resolved.tenant.id, subdomain);
          if (adminSite) {
            return NextResponse.json({ microsite: adminSite });
          }
        }
      } catch {
        // Fall back to public read if user lacks admin membership
      }
    }

    // 2. Public read path (published sites only)
    const site = await MicrositeService.getMicrositeBySubdomain(subdomain);
    if (!site || !site.published) {
      return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
    }

    return NextResponse.json({ microsite: site });
  } catch (error) {
    return handleRouteError(error, 'Error fetching microsite');
  }
}

export async function PUT(
  req: NextRequest,
  segmentData: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await segmentData.params;
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenantSlug') || body.tenantSlug;

    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const resolved = await resolveAuthorizedTenantForMicrosite(rawToken, subdomain, tenantSlug);
    if (!resolved?.tenant || !resolved?.authorizedContext) {
      return NextResponse.json({ error: 'Microsite not found or unauthorized' }, { status: 404 });
    }

    AuthorizationService.assertCan(resolved.authorizedContext, Action.MICROSITE_UPDATE);

    if (body.action === 'publish') {
      const published = await MicrositeService.publishMicrosite(resolved.tenant.id, subdomain);
      if (!published) {
        return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, microsite: published, message: 'Website published live!' });
    }

    if (body.action === 'unpublish') {
      const unpublished = await MicrositeService.unpublishMicrosite(resolved.tenant.id, subdomain);
      if (!unpublished) {
        return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, microsite: unpublished, message: 'Website set to draft.' });
    }

    if (body.action === 'connectDomain') {
      const withDomain = await MicrositeService.connectCustomDomain(resolved.tenant.id, subdomain, body.customDomain);
      if (!withDomain) {
        return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, microsite: withDomain, message: 'Custom domain connected!' });
    }

    const updated = await MicrositeService.updateMicrosite(resolved.tenant.id, subdomain, body);
    if (!updated) {
      return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, microsite: updated });
  } catch (error) {
    return handleRouteError(error, 'Error updating microsite');
  }
}

export async function DELETE(
  req: NextRequest,
  segmentData: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await segmentData.params;
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenantSlug');

    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const resolved = await resolveAuthorizedTenantForMicrosite(rawToken, subdomain, tenantSlug);
    if (!resolved?.tenant || !resolved?.authorizedContext) {
      return NextResponse.json({ error: 'Microsite not found or unauthorized' }, { status: 404 });
    }

    AuthorizationService.assertCan(resolved.authorizedContext, Action.MICROSITE_DELETE);

    const deleted = await MicrositeService.deleteMicrosite(resolved.tenant.id, subdomain);
    if (!deleted) {
      return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Microsite deleted successfully' });
  } catch (error) {
    return handleRouteError(error, 'Error deleting microsite');
  }
}
