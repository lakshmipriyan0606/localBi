import React from 'react';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { TenantSidebar } from '@/components/layout/tenant-sidebar';

export default async function TenantWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
  } catch (err: unknown) {
    const errorMsg = (err as Error).message || '';
    if (errorMsg.includes('RESOURCE_NOT_FOUND')) {
      notFound();
    }
    redirect('/login');
  }

  if (!resolved.tenant) {
    notFound();
  }

  const safeTenant = {
    id: resolved.tenant.id,
    name: resolved.tenant.name,
    slug: resolved.tenant.slug,
    plan: resolved.tenant.plan,
    timezone: resolved.tenant.timezone,
  };

  const safeUser = {
    id: resolved.user.id,
    email: resolved.user.email,
    fullName: resolved.user.fullName,
    role: resolved.authorizedContext?.role || 'VIEWER',
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <TenantSidebar tenant={safeTenant} user={safeUser} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
