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
    const error = err as any;
    const statusCode = error?.statusCode;
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';

    // 1. Unauthenticated or session expired -> Login page
    if (
      statusCode === 401 ||
      errorCode === 'AUTHENTICATION_REQUIRED' ||
      errorCode === 'UNAUTHENTICATED' ||
      errorCode === 'SESSION_EXPIRED' ||
      errorMsg.includes('Authentication required') ||
      errorMsg.includes('SESSION_EXPIRED') ||
      errorMsg.includes('UNAUTHENTICATED')
    ) {
      redirect('/login');
    }

    // 2. Resource not found -> 404
    if (
      statusCode === 404 ||
      errorCode === 'RESOURCE_NOT_FOUND' ||
      errorMsg.includes('not found')
    ) {
      notFound();
    }

    // 3. Access denied / forbidden -> 404 (NEVER redirect to /dashboard to prevent circular redirect loops)
    if (
      statusCode === 403 ||
      errorCode === 'TENANT_ACCESS_DENIED' ||
      errorCode === 'ACCOUNT_SUSPENDED'
    ) {
      notFound();
    }

    // 4. Any other unexpected failure -> log and show notFound (never redirect to /dashboard!)
    console.error(`[TenantWorkspaceLayout] Failed to resolve tenant "${tenantSlug}":`, err);
    notFound();
  }

  if (!resolved.tenant) {
    notFound();
  }

  const safeTenant = {
    id: resolved.tenant.id,
    name: resolved.tenant.name,
    slug: resolved.tenant.slug,
    plan: resolved.tenant.plan,
    tenantType: resolved.tenant.tenantType,
    timezone: resolved.tenant.timezone,
  };

  const safeUser = {
    id: resolved.user.id,
    email: resolved.user.email,
    fullName: resolved.user.fullName,
    role: resolved.authorizedContext?.role || 'VIEWER',
  };

  // Fetch authorized tenant organizations for in-place client switching safely
  let userTenants: any[] = [];
  try {
    userTenants = await TenantService.listUserTenants(resolved.user.id);
  } catch (err) {
    console.error(`[TenantWorkspaceLayout] Failed to list user tenants:`, err);
    userTenants = [safeTenant];
  }
  const authorizedTenants = userTenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    role: t.role || 'VIEWER',
  }));

  let brands: Array<{ id: string; name: string; slug: string }> = [];
  try {
    brands = await TenantContextService.withTenantContext(
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
  } catch (err) {
    console.error(`[TenantWorkspaceLayout] Failed to load brands:`, err);
    brands = [];
  }

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
