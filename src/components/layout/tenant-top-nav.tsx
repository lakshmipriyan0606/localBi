'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Menu, Calendar, Search, CheckCircle2 } from 'lucide-react';
import { TopNavDatePicker } from './top-nav-date-picker';
import { TopNavBrandSelector, BrandOption } from './top-nav-brand-selector';
import { TopNavUserMenu } from './top-nav-user-menu';
import { TopNavTenantSwitcher } from './top-nav-tenant-switcher';
import { SafeTenantNavDto, SafeUserNavDto, AuthorizedTenantDto } from './sidebar-nav-config';
import { usePermissions } from '@/hooks/use-permissions';
import { Action } from '@/shared/authorization/roles';

export type { AuthorizedTenantDto };

interface TenantTopNavProps {
  tenant: SafeTenantNavDto;
  user: SafeUserNavDto;
  brands: BrandOption[];
  tenants?: AuthorizedTenantDto[] | undefined;
  onToggleMobileSidebar?: () => void;
}

export function TenantTopNav({
  tenant,
  user,
  brands,
  tenants,
  onToggleMobileSidebar,
}: TenantTopNavProps) {
  const { can } = usePermissions(user.role);
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200/90 bg-white px-4 sm:px-5 shadow-xs">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {onToggleMobileSidebar && (
          <button type="button" onClick={onToggleMobileSidebar} className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors" aria-label="Toggle navigation menu">
            <Menu className="h-4 w-4" />
          </button>
        )}
        <div className="relative max-w-xs w-full hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports, pages, or insights..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono hidden md:inline">⌘ K</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden md:block">
          <Suspense fallback={
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-600 animate-pulse w-[180px] h-[32px]">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Loading...</span>
            </div>
          }>
            <TopNavDatePicker />
          </Suspense>
        </div>

        <Link
          href={`/client/${tenant.slug}/integrations`}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          title="Google Accounts & Integrations"
        >
          <CheckCircle2 className="h-3 w-3 text-indigo-600" />
          <span>Google Integrations</span>
        </Link>

        <TopNavTenantSwitcher tenant={tenant} userRole={user.role} tenants={tenants} />
        <div className="mx-2 h-4 w-px bg-slate-200"></div>
        <TopNavBrandSelector brands={brands} canCreateBrand={can(Action.BRAND_CREATE)} />
        <div className="mx-2 h-4 w-px bg-slate-200"></div>
        <TopNavUserMenu user={user} />
      </div>
    </header>
  );
}
export type { BrandOption };
