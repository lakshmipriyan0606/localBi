import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { LeadService } from '@/modules/leads/lead-service';
import { handleRouteError } from '@/shared/errors';
import type { LeadType, LeadStatus } from '@prisma/client';

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

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId') || undefined;
    const webSurfaceId = searchParams.get('webSurfaceId') || undefined;
    const storeId = searchParams.get('storeId') || undefined;
    const type = (searchParams.get('type') as LeadType) || undefined;
    const status = (searchParams.get('status') as LeadStatus) || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const [result, stats] = await Promise.all([
      LeadService.listLeads({
        tenantId: tenant.id,
        brandId,
        webSurfaceId,
        storeId,
        type,
        status,
        search,
        startDate,
        endDate,
        page,
        limit,
      }),
      LeadService.getLeadStats({
        tenantId: tenant.id,
        brandId,
        webSurfaceId,
        storeId,
        startDate,
        endDate,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        leads: result.leads,
        pagination: result.pagination,
        stats,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
