import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ReportContextService } from '@/modules/reports/report-context-service';
import { ContentManager } from '@/features/content/components/content-manager';

export const metadata: Metadata = {
  title: 'Content & Blog CMS — localBi',
  description: 'Editorial review workflow, grounded AI drafting, SEO content briefs, and internal linking',
};

export default async function ContentPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
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

  return (
    <div className="space-y-6">
      <ContentManager
        tenantSlug={tenant.slug}
        brands={brands}
        initialBrandId={brands[0]?.id || ''}
      />
    </div>
  );
}
