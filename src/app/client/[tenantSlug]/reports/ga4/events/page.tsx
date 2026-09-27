import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Ga4AnalyticsService } from '@/modules/analytics/ga4-service';
import { Ga4EventsView } from '@/features/reports/components/ga4-events-view';

export const metadata: Metadata = {
  title: 'Events — localBi',
  description: 'View event count by event name from Google Analytics 4',
};

export default async function Ga4EventsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);
  if (!token) redirect('/login');

  let resolved = null;
  try {
    resolved = await ContextResolver.resolveTenantContext(token, tenantSlug);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('GA4 EVENTS CONTEXT ERROR:', msg);
    redirect('/login');
  }
  if (!resolved.tenant || !resolved.authorizedContext) {
    notFound();
  }

  const { tenant } = resolved;
  const ga4RealData = await Ga4AnalyticsService.getTenantGa4Data(tenant.slug);

  return (
    <Ga4EventsView
      tenantSlug={tenant.slug}
      brandName={tenant.name}
      ga4RealData={ga4RealData}
    />
  );
}
