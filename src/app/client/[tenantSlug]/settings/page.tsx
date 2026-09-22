import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SettingsView } from '@/features/settings/components/settings-view';

export const metadata: Metadata = {
  title: 'Settings & Sessions — localBi',
  description: 'Manage workspace configuration, timezones, and active device sessions',
};

export default async function TenantSettingsPage({
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

  const safeTenant = {
    id: resolved.tenant.id,
    name: resolved.tenant.name,
    slug: resolved.tenant.slug,
    timezone: resolved.tenant.timezone,
    plan: resolved.tenant.plan,
    version: resolved.tenant.version,
  };

  return <SettingsView tenant={safeTenant} />;
}
