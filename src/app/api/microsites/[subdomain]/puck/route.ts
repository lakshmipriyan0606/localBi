import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { PuckService } from '@/modules/microsites/puck-service';
import { TenantContextService } from '@/shared/database/tenant-context';
import { prisma } from '@/shared/database/client';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  _req: NextRequest,
  segmentData: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await segmentData.params;
    const data = await PuckService.getPuckData(subdomain);
    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error, 'Error fetching puck data');
  }
}

export async function POST(
  req: NextRequest,
  segmentData: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await segmentData.params;
    const body = await req.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ error: 'Missing puck layout data' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { user } = await ContextResolver.requireAuthenticatedUser(rawToken);

    // Resolve tenant ownership using RLS contexts
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

    let siteTenantSlug: string | null = null;
    for (const m of memberships) {
      const site = await TenantContextService.withTenantContext(prisma, m.tenantId, async (tx) => {
        return tx.microsite.findFirst({
          where: { subdomain },
          select: { id: true },
        });
      });
      if (site) {
        siteTenantSlug = m.tenant.slug;
        break;
      }
    }

    if (!siteTenantSlug) {
      return NextResponse.json({ error: 'Microsite not found or access denied' }, { status: 404 });
    }

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, siteTenantSlug);
    if (!authorizedContext) {
      return NextResponse.json({ error: 'Unauthorized context missing' }, { status: 403 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.MICROSITE_UPDATE);

    await PuckService.savePuckData(subdomain, data);
    return NextResponse.json({ success: true, message: 'Layout published to subdomain!' });
  } catch (error) {
    return handleRouteError(error, 'Error saving puck data');
  }
}
