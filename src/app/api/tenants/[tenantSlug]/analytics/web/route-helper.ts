import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { DateRangeService } from '@/shared/analytics/date-range';
import type { WebAnalyticsFilterInput } from '@/modules/analytics/web-analytics-service';

export async function resolveWebAnalyticsContext(
  req: NextRequest,
  tenantSlug: string
): Promise<{
  tenant: { id: string; slug: string };
  filter: WebAnalyticsFilterInput;
  page: number;
  pageSize: number;
}> {
  const cookieStore = await cookies();
  const rawToken = SessionCookieManager.getSessionToken(cookieStore);
  const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);

  if (!tenant || !authorizedContext) {
    throw new Error('Tenant context not found');
  }

  AuthorizationService.assertCan(authorizedContext, Action.DASHBOARD_VIEW);

  const url = new URL(req.url);
  const preset = url.searchParams.get('preset') || 'LAST_30_DAYS';
  const customStart = url.searchParams.get('startDate') || undefined;
  const customEnd = url.searchParams.get('endDate') || undefined;
  const brandId = url.searchParams.get('brandId') || undefined;
  const webSurfaceId = url.searchParams.get('webSurfaceId') || undefined;
  let storeId = url.searchParams.get('storeId') || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));

  // If user is restricted to specific stores, verify authorized store scope
  if (authorizedContext.locationIds && authorizedContext.locationIds.length > 0) {
    if (!storeId || !authorizedContext.locationIds.includes(storeId)) {
      storeId = authorizedContext.locationIds[0];
    }
  }

  const resolvedRange = DateRangeService.resolveDateRange({
    preset,
    customStartDate: customStart,
    customEndDate: customEnd,
  });

  const filter: WebAnalyticsFilterInput = {
    tenantId: tenant.id,
    brandId,
    webSurfaceId,
    storeId,
    dateRange: {
      startDate: new Date(resolvedRange.startDate + 'T00:00:00.000Z'),
      endDate: new Date(resolvedRange.endDate + 'T23:59:59.999Z'),
    },
  };

  return {
    tenant,
    filter,
    page,
    pageSize,
  };
}
