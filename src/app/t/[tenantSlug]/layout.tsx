import React from 'react';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { TenantService } from '@/modules/tenancy/tenant-service';
import { TenantLayoutShell } from '@/components/layout/tenant-layout-shell';

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

  // Fetch authorized tenant organizations for in-place client switching
  const userTenants = await TenantService.listUserTenants(resolved.user.id);
  const authorizedTenants = userTenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    role: t.role || 'VIEWER',
  }));

  const brands = await TenantContextService.withTenantContext(
    prisma,
    safeTenant.id,
    async (tx) => {
      return tx.brand.findMany({
        where: { tenantId: safeTenant.id, isArchived: false },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      });
    }
  );

  return (
    <TenantLayoutShell
      tenant={safeTenant}
      user={safeUser}
      brands={brands}
      tenants={authorizedTenants}
    >
      {children}
    </TenantLayoutShell>
  );
}
