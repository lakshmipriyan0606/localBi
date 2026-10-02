import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ClientReportContextService } from '@/modules/reporting/client-report-context-service';
import { ExecutiveReportingService } from '@/modules/reporting/executive-reporting-service';
import { ExecutiveDashboardView } from '@/features/reports/components/executive-dashboard-view';

export const metadata: Metadata = {
  title: 'Executive Performance Report — localBi',
  description: 'Unified cross-module multi-location performance reporting across search, actions, calls, and reputation',
};

export default async function ExecutiveReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{
    brandId?: string;
    webSurfaceId?: string;
    datePreset?: string;
    startDate?: string;
    endDate?: string;
    compare?: string;
  }>;
}) {
  const { tenantSlug } = await params;
  const sParams = await searchParams;
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);

  if (!token) {
    redirect('/login');
  }

  let context;
  try {
    context = await ClientReportContextService.resolveContext({
      token,
      tenantSlug,
      brandId: sParams.brandId,
      webSurfaceId: sParams.webSurfaceId,
      datePreset: sParams.datePreset,
      customStartDate: sParams.startDate,
      customEndDate: sParams.endDate,
      enableComparison: sParams.compare !== 'false',
    });
  } catch (err) {
    notFound();
  }

  const initialReport = await ExecutiveReportingService.generateReport(context);

  return (
    <ExecutiveDashboardView
      initialReport={initialReport}
      tenantSlug={tenantSlug}
      brands={context.availableBrands}
      webSurfaces={
        context.selectedWebSurface
          ? [
              {
                id: context.selectedWebSurface.id,
                name: context.selectedWebSurface.name,
                type: context.selectedWebSurface.type,
              },
            ]
          : []
      }
      locations={context.availableStores}
    />
  );
}
