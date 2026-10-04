import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { EntitlementManagerView } from '@/features/agency/entitlements/entitlement-manager-view';

export const metadata: Metadata = {
  title: 'Feature Entitlements — localBi',
  description: 'Govern feature availability, access matrix, and resource limits per client account',
};

export default async function AgencyEntitlementsPage({
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

  return <EntitlementManagerView tenantSlug={tenantSlug} />;
}
