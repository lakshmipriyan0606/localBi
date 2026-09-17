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
    <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
      <TenantSidebar tenant={safeTenant} user={safeUser} />

      {/* Main content area — shifted right on mobile to clear the fixed top bar */}
      <div className="flex flex-1 flex-col min-w-0 lg:min-h-screen">
        {/* Mobile spacer for the fixed top bar */}
        <div className="h-14 lg:hidden flex-shrink-0" aria-hidden="true" />

        <main className="flex-1 w-full">
          {/*
            Fluid container: generous padding, sensible max-width.
            Analytics pages get full width; narrow pages (auth, forms) self-constrain.
          */}
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
