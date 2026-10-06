import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { OverviewService } from '@/modules/overview/overview-service';
import { ClientHero } from '@/features/overview/components/client-hero';
import { OverviewTabsContainer } from '@/features/overview/components/overview-tabs-container';
import { OverviewReadinessBanner } from '@/features/overview/components/overview-readiness-banner';
import { OverviewSetupReminder } from '@/features/overview/components/overview-setup-reminder';

export const metadata: Metadata = {
  title: 'Client Overview — localBi',
  description: 'Enterprise Local SEO, Search Console, and Web Analytics performance dashboard',
};

export default async function WorkspaceOverviewPage({
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
    const error = err as any;
    const statusCode = error?.statusCode;
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';

    if (
      statusCode === 401 ||
      errorCode === 'AUTHENTICATION_REQUIRED' ||
      errorCode === 'UNAUTHENTICATED' ||
      errorCode === 'SESSION_EXPIRED' ||
      errorMsg.includes('Authentication required') ||
      errorMsg.includes('SESSION_EXPIRED') ||
      errorMsg.includes('UNAUTHENTICATED')
    ) {
      redirect('/login');
    }

    notFound();
  }
  if (!resolved?.tenant || !resolved?.authorizedContext) notFound();

  if (resolved.tenant.slug !== tenantSlug) {
    redirect(`/client/${resolved.tenant.slug}`);
  }

  const { tenant, authorizedContext } = resolved;

  // Backend single source of truth for overview data (showcase dental for abc-dental, real database metrics for all other clients)
  let overviewData: any = null;
  try {
    overviewData = await OverviewService.getOverviewData(
      tenant.id,
      tenant.slug,
      authorizedContext
    );
  } catch (err) {
    console.error('[WorkspaceOverviewPage] Error getting overview data:', err);
    overviewData = OverviewService.getFallbackOverviewData(tenant.name || tenant.slug, tenant.slug);
  }

  return (
    <div className="space-y-3.5 pb-8">
      {/* 1. Client Hero Banner */}
      <ClientHero
        tenantName={overviewData.tenantName}
        tenantSlug={overviewData.tenantSlug}
        locationsCount={overviewData.locationsCount}
        categoriesCount={overviewData.categoriesCount}
        brandTagline={overviewData.brandTagline}
        storeBadgeName={overviewData.storeBadgeName}
        storeBadgeIcon={overviewData.storeBadgeIcon}
        marketingQuote={overviewData.marketingQuote}
        isConnected={overviewData.isConnected}
        isDataReady={overviewData.isDataReady}
      />

      {/* 2. Setup Reminders (Only shown if setup is pending/missing) */}
      <OverviewSetupReminder
        tenantSlug={tenant.slug}
        isConnected={overviewData.isConnected}
        isDataReady={overviewData.isDataReady}
      />
      
      {overviewData.isConnected && !overviewData.isDataReady && (
        <OverviewReadinessBanner
          tenantSlug={tenant.slug}
          isConnected={overviewData.isConnected}
          isDataReady={overviewData.isDataReady}
          externalEmail={overviewData.externalEmail}
          mappedResourcesCount={overviewData.mappedResourcesCount}
        />
      )}

      {/* 3. Single-Page 3-Way Tab-wise Overview (Google Business Profile, Search Console, Web Analytics) */}
      <OverviewTabsContainer
        tenantSlug={tenant.slug}
        overviewData={overviewData}
        isConnected={overviewData.isConnected}
      />
    </div>
  );
}
