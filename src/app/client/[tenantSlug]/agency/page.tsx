import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { AgencyPortfolioView } from '@/features/agency/dashboard/agency-portfolio-view';

export const metadata: Metadata = {
  title: 'Agency Portfolio — localBi',
  description: 'Unified cross-client portfolio management, brand health, and agency operations',
};

export default async function AgencyPortfolioPage({
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

  let resolved = null;
  try {
    resolved = await ContextResolver.resolveTenantContext(token, tenantSlug);
  } catch {
    redirect('/login');
  }

  if (!resolved.tenant) {
    notFound();
  }

  return <AgencyPortfolioView tenantSlug={tenantSlug} />;
}
