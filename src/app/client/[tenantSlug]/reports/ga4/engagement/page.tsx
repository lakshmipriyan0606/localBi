import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Ga4AnalyticsService } from '@/modules/analytics/ga4-service';
import { Ga4EngagementView } from '@/features/reports/components/ga4-engagement-view';

export const metadata: Metadata = {
  title: 'User engagement & retention — localBi',
  description: 'View user engagement and retention overview from Google Analytics 4',
};

export default async function Ga4EngagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams?: Promise<{
    days?: string;
    brandId?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const { tenantSlug } = await params;
  const sParams = (await searchParams) || {};
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);
  if (!token) redirect('/login');

  let resolved = null;
  try {
    resolved = await ContextResolver.resolveTenantContext(token, tenantSlug);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('GA4 ENGAGEMENT CONTEXT ERROR:', msg);
    redirect('/login');
  }
  if (!resolved.tenant || !resolved.authorizedContext) {
    notFound();
  }

  const { tenant } = resolved;
  const daysParam = sParams.days ? parseInt(sParams.days, 10) : 30;
  const ga4RealData = await Ga4AnalyticsService.getTenantGa4Data(tenant.slug, {
    days: isNaN(daysParam) ? 30 : daysParam,
    brandId: sParams.brandId,
    locationId: sParams.locationId,
    startDate: sParams.startDate,
    endDate: sParams.endDate,
  });

  return (
    <Ga4EngagementView
      tenantSlug={tenant.slug}
      brandName={tenant.name}
      ga4RealData={ga4RealData}
    />
  );
}
