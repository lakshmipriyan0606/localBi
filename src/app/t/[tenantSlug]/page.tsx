import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { OverviewService } from '@/modules/overview/overview-service';
import { ClientHero } from '@/features/overview/components/client-hero';
import { OverviewTabsContainer } from '@/features/overview/components/overview-tabs-container';

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
  } catch {
    redirect('/login');
  }
  if (!resolved.tenant || !resolved.authorizedContext) notFound();

  const { tenant, authorizedContext } = resolved;

  // Backend single source of truth for overview data (showcase dental for abc-dental, real database metrics for all other clients)
  const overviewData = await OverviewService.getOverviewData(
    tenant.id,
    tenant.slug,
    authorizedContext
  );

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
      />

      {/* 2. Single-Page 3-Way Tab-wise Overview (Google Business Profile, Search Console, Web Analytics) */}
      <OverviewTabsContainer
        tenantSlug={tenant.slug}
        overviewData={overviewData}
      />
    </div>
  );
}
