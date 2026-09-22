import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { ReportingService } from '@/modules/reports/reporting-service';
import { LocationDetailView } from '@/features/locations/components/location-detail-view';

export const metadata: Metadata = {
  title: 'Location Details — localBi',
  description: 'Storefront identity, Google Business Profile connection, and performance analytics',
};

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; locationId: string }>;
}) {
  const { tenantSlug, locationId } = await params;
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);

  if (!token) {
    redirect('/login');
  }

  let resolved = null;
  try {
    resolved = await ContextResolver.resolveTenantContext(token, tenantSlug);
  } catch {
    redirect('/login');
  }

  if (!resolved.tenant || !resolved.authorizedContext) {
    notFound();
  }

  const { tenant, authorizedContext } = resolved;

  try {
    const detail = await ReportingService.getLocationDetail({
      tenantId: tenant.id,
      locationId,
      context: authorizedContext,
    });

    return (
      <div className="space-y-6">
        <LocationDetailView
          tenantSlug={tenant.slug}
          tenantName={tenant.name}
          location={detail.location}
          mapping={detail.mapping}
          metricsSummary={detail.metricsSummary}
        />
      </div>
    );
  } catch {
    notFound();
  }
}
