import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ClientHero } from '@/features/overview/components/client-hero';
import { GbpSection } from '@/features/overview/components/gbp-section';
import { GscSection } from '@/features/overview/components/gsc-section';
import { WebAnalyticsSection } from '@/features/overview/components/web-analytics-section';

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

  const { tenant } = resolved;

  const { locationsCount } =
    await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      const lCount = await tx.location.count({ where: { tenantId: tenant.id, isArchived: false } });
      return { locationsCount: lCount };
    });

  return (
    <div className="space-y-3.5 pb-8">
      {/* 1. Client Hero Banner */}
      <ClientHero
        tenantName={tenant.name}
        tenantSlug={tenant.slug}
        locationsCount={locationsCount || 3}
      />

      {/* 2. Major Section #1: Google Business Profile (mint green tint) */}
      <GbpSection tenantSlug={tenant.slug} />

      {/* 3. Major Section #2: Google Search Console (lavender tint) */}
      <GscSection tenantSlug={tenant.slug} />

      {/* 4. Major Section #3: Web Analytics & Location Map (cyan tint) */}
      <WebAnalyticsSection tenantSlug={tenant.slug} />
    </div>
  );
}
