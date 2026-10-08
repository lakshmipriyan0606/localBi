import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { ContentManager } from '@/features/content/components/content-manager';
import { resolveActiveBrandId } from '@/shared/utils/active-brand-resolver';

export const metadata: Metadata = {
  title: 'Content & Blog CMS — localBi',
  description: 'Editorial review workflow, grounded AI drafting, SEO content briefs, and internal linking',
};

export default async function ContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams?: Promise<{ brandId?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);

  if (!token) {
    redirect('/login');
  }

  const context = await ReportContextService.resolveReportContext(token, tenantSlug);
  if (!context) {
    notFound();
  }

  const { tenant, brands } = context;
  const initialBrandId = resolveActiveBrandId(brands, tenant.slug, cookieStore, sp.brandId);

  return (
    <div className="space-y-6">
      <ContentManager
        tenantSlug={tenant.slug}
        brands={brands}
        initialBrandId={initialBrandId}
      />
    </div>
  );
}
