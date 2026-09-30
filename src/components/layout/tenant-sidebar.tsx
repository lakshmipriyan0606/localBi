'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { LocalBiMark } from '@/components/brand/localbi-mark';
import { SafeTenantNavDto, SafeUserNavDto, AuthorizedTenantDto, getNavGroups } from './sidebar-nav-config';
import { SidebarTenantSwitcher } from './sidebar-tenant-switcher';
import { SidebarNavList } from './sidebar-nav-list';
import { SidebarUserFooter } from './sidebar-user-footer';

export type { SafeTenantNavDto, SafeUserNavDto, AuthorizedTenantDto };

export interface TenantSidebarProps {
  tenant: SafeTenantNavDto;
  user: SafeUserNavDto;
  tenants?: AuthorizedTenantDto[] | undefined;
  mobileOpen?: boolean | undefined;
  onCloseMobile?: (() => void) | undefined;
}

function SidebarContent({ tenant, user, tenants, onNavigate }: TenantSidebarProps & { onNavigate?: () => void }) {
  const groups = useMemo(() => getNavGroups(tenant.slug), [tenant.slug]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 mb-3">
          <LocalBiMark size="sm" showLabel={false} />
          <div>
            <span className="font-bold tracking-tight text-slate-900 leading-none text-[15px]">
              local<span className="text-indigo-600">Bi</span>
            </span>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
              Local SEO Platform
            </span>
          </div>
        </div>
      </div>

      <SidebarNavList groups={groups} onNavigate={onNavigate} />
      <SidebarUserFooter user={user} />
    </div>
  );
}

export function TenantSidebar({
  tenant,
  user,
  tenants,
  mobileOpen: controlledMobileOpen,
  onCloseMobile,
}: TenantSidebarProps) {
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isMobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : internalMobileOpen;
  const closeMobile = onCloseMobile || (() => setInternalMobileOpen(false));

  return (
    <>
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-r border-slate-200/90 bg-white min-h-screen">
        <SidebarContent tenant={tenant} user={user} tenants={tenants} />
      </aside>

      {isMobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity" aria-hidden="true" onClick={closeMobile} />
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-xl overflow-y-auto" aria-label="Mobile navigation">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <LocalBiMark size="sm" showLabel={false} />
                <span className="font-bold text-slate-900 text-[15px]">
                  local<span className="text-indigo-600">Bi</span>
                </span>
              </div>
              <button type="button" aria-label="Close navigation" onClick={closeMobile} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent tenant={tenant} user={user} tenants={tenants} onNavigate={closeMobile} />
          </aside>
        </>
      )}
    </>
  );
}
