'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import {
  TenantSidebar,
  SafeTenantNavDto,
  SafeUserNavDto,
  AuthorizedTenantDto,
} from './tenant-sidebar';
import { TenantTopNav, BrandOption } from './tenant-top-nav';

interface TenantLayoutShellProps {
  tenant: SafeTenantNavDto;
  user: SafeUserNavDto;
  brands: BrandOption[];
  tenants?: AuthorizedTenantDto[] | undefined;
  children: React.ReactNode;
}

import { ActiveBrandProvider } from '@/providers/active-brand-context';

export function TenantLayoutShell({
  tenant,
  user,
  brands,
  tenants,
  children,
}: TenantLayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isWebsite = pathname?.includes('/website');

  return (
    <ActiveBrandProvider brands={brands} tenantSlug={tenant.slug}>
      <div className="flex min-h-screen bg-[#F5F7FB] text-slate-900">
        {/* ── Sidebar ── */}
        <TenantSidebar
          tenant={tenant}
          user={user}
          tenants={tenants}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* ── Main content area with Top Navigation Bar ── */}
        <div className="flex flex-1 flex-col min-w-0 min-h-screen">
          {/* Top Navbar */}
          <TenantTopNav
            tenant={tenant}
            user={user}
            brands={brands}
            tenants={tenants}
            onToggleMobileSidebar={() => setMobileOpen((v) => !v)}
          />

          {/* Page Content */}
          <main className="flex-1 w-full">
            <div className={cn('w-full', isWebsite ? 'p-0' : 'px-4 py-4 lg:px-5')}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </ActiveBrandProvider>
  );
}
