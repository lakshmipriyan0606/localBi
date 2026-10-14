'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Calendar, Search, CheckCircle2, Plug, Sparkles } from 'lucide-react';
import { TopNavDatePicker } from './top-nav-date-picker';
import { TopNavBrandSelector, BrandOption } from './top-nav-brand-selector';
import { TopNavUserMenu } from './top-nav-user-menu';
import { SafeTenantNavDto, SafeUserNavDto, AuthorizedTenantDto } from './sidebar-nav-config';
import { usePermissions } from '@/hooks/use-permissions';
import { Action } from '@/shared/authorization/roles';
import { GlobalSearchDialog } from './global-search-dialog';
import { GoogleIntegrationsModal } from './google-integrations-modal';

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
  tenants: _tenants,
  onToggleMobileSidebar,
}: TenantTopNavProps) {
  const { can } = usePermissions(user.role);
  const [searchOpen, setSearchOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);

  // Global ⌘K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200/90 bg-white px-4 sm:px-5 shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          {/* Interactive Global Search Trigger */}
          <div
            onClick={() => setSearchOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSearchOpen(true);
              }
            }}
            aria-label="Search reports, pages, or insights (Press Ctrl+K or Cmd+K)"
            className="relative max-w-xs w-full hidden sm:flex items-center cursor-pointer group"
          >
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-12 py-1.5 text-xs text-slate-400 group-hover:border-indigo-400/70 group-hover:bg-white transition-all select-none truncate">
              Search reports, pages, or insights...
            </div>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200/80 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors hidden md:inline">
              ⌘ K
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:block">
            <Suspense
              fallback={
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-600 animate-pulse w-[180px] h-[32px]">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Loading...</span>
                </div>
              }
            >
              <TopNavDatePicker />
            </Suspense>
          </div>

          {/* Interactive Google Integrations Modal Trigger */}
          <button
            type="button"
            onClick={() => setIntegrationsOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50/60 hover:border-indigo-200 hover:text-indigo-800 transition-all cursor-pointer shadow-2xs"
            title="Google Accounts, Sync & Resource Mappings"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Google Integrations</span>
          </button>

          <TopNavBrandSelector brands={brands} canCreateBrand={can(Action.BRAND_CREATE)} />
          <div className="mx-2 h-4 w-px bg-slate-200" />
          <TopNavUserMenu user={user} />
        </div>
      </header>

      {/* Global Search / Command Palette Dialog */}
      <GlobalSearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        tenantSlug={tenant.slug}
        brands={brands}
        onOpenIntegrations={() => setIntegrationsOpen(true)}
      />

      {/* Google Integrations Quick Status & Sync Modal */}
      <GoogleIntegrationsModal
        open={integrationsOpen}
        onClose={() => setIntegrationsOpen(false)}
        tenantSlug={tenant.slug}
      />
    </>
  );
}
export type { BrandOption };
