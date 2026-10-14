'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Building2, ChevronDown } from 'lucide-react';
import { LocalBiMark } from '@/components/brand/localbi-mark';
import { SidebarTenantSwitcher } from '@/components/layout/sidebar-tenant-switcher';
import { useTenantContext } from '@/providers/tenant-context';
import { useActiveBrand } from '@/providers/active-brand-context';

interface WebsiteStudioSidebarHeaderProps {
  tenantSlug: string;
  isCollapsed?: boolean;
  onNavigate?: () => void;
  brandName?: string;
  isLive?: boolean;
}

export function WebsiteStudioSidebarHeader({
  tenantSlug,
  isCollapsed = false,
  onNavigate,
  brandName,
  isLive = false,
}: WebsiteStudioSidebarHeaderProps) {
  const tenantCtx = useTenantContext();
  const brandCtx = useActiveBrand();

  const activeBrandName = brandName || brandCtx?.activeBrand?.name || 'LocalBi Storefront';

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-3 border-b border-slate-100 gap-2">
        <Link
          href={`/client/${tenantSlug}`}
          title="Exit to Main LocalBi Platform"
          onClick={onNavigate}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Link
          href={`/client/${tenantSlug}/website`}
          title="Website Studio Home"
          onClick={onNavigate}
          className="relative"
        >
          <LocalBiMark size="sm" showLabel={false} />
          <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
        </Link>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3 pb-3 border-b border-slate-100 space-y-2.5">
      {/* ── 1. Exit to Platform Navigation Bar ── */}
      <div className="flex items-center justify-between">
        <Link
          href={`/client/${tenantSlug}`}
          onClick={onNavigate}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:-translate-x-0.5 transition-all" />
          <span>Exit to Main Platform</span>
        </Link>

        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Draft
          </span>
        )}
      </div>

      {/* ── 2. LocalBi Website Studio Identity ── */}
      <div className="flex items-center gap-2.5">
        <LocalBiMark size="sm" showLabel={false} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-slate-900 leading-none text-[14px]">
              local<span className="text-indigo-600">Bi</span>
            </span>
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Studio
            </span>
          </div>
          <p className="text-[10.5px] font-medium text-slate-400 truncate mt-0.5">
            {activeBrandName}
          </p>
        </div>
      </div>

      {/* ── 3. Tenant / Business Switcher (reusing authenticated context) ── */}
      {tenantCtx?.tenant && (
        <div className="pt-0.5">
          <SidebarTenantSwitcher
            tenant={tenantCtx.tenant}
            userRole={tenantCtx.user.role}
            tenants={tenantCtx.tenants}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </div>
  );
}
