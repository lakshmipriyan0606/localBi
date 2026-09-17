'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Menu, Calendar } from 'lucide-react';
import { TopNavBrandSelector, BrandOption } from './top-nav-brand-selector';
import { TopNavUserMenu } from './top-nav-user-menu';

export interface AuthorizedTenantDto {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

interface TenantTopNavProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
  user: {
    id: string;
    email: string;
    fullName?: string | null | undefined;
    role: string;
  };
  brands: BrandOption[];
  tenants?: AuthorizedTenantDto[] | undefined;
  onToggleMobileSidebar?: () => void;
}

export function TenantTopNav({
  tenant,
  user,
  brands,
  onToggleMobileSidebar,
}: TenantTopNavProps) {
  const dateRangeLabel = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    const format = (d: Date) =>
      d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
    return `${format(start)} to ${format(end)}`;
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200/90 bg-white px-4 sm:px-6 shadow-xs">
      {/* ── Left side: Hamburger (mobile) + Date Window Pill ── */}
      <div className="flex items-center gap-3">
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

        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-700">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{dateRangeLabel}</span>
        </div>
      </div>

      {/* ── Right side: Google Connection Status + Brand Selector + User Menu ── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/t/${tenant.slug}/integrations`}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200/80 bg-emerald-50/60 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100/60 transition-colors"
          title="Google Accounts authorized and streaming"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Google Connected</span>
        </Link>

        <TopNavBrandSelector brands={brands} />
        <TopNavUserMenu user={user} />
      </div>
    </header>
  );
}
export type { BrandOption };
