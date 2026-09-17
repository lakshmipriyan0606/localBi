'use client';

import { useState } from 'react';
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

export function TenantLayoutShell({
  tenant,
  user,
  brands,
  tenants,
  children,
}: TenantLayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
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
          <div className="w-full px-4 py-4 lg:px-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
