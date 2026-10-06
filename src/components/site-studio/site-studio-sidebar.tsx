'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Palette,
  Compass,
  MapPin,
  ShoppingBag,
  Search,
  Sparkles,
  BarChart3,
  Globe,
  Eye,
  Send,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  exact?: boolean;
  matchPrefix?: string;
  badge?: string;
  isAction?: boolean;
  onClick?: () => void;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface SiteStudioSidebarProps {
  tenantSlug: string;
  brandId?: string;
  brandName?: string;
  isLive?: boolean;
  onOpenPublishModal?: () => void;
  onCloseMobile?: () => void;
}

export function SiteStudioSidebar({
  tenantSlug,
  brandId,
  brandName = 'LocalBi Site',
  isLive = false,
  onOpenPublishModal,
  onCloseMobile,
}: SiteStudioSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper to preserve active brand query param across navigation
  const buildHref = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (brandId) params.set('brandId', brandId);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  const navGroups: NavGroup[] = [
    {
      group: 'SETUP',
      items: [
        {
          label: 'Overview',
          href: buildHref(`/client/${tenantSlug}/website`),
          icon: LayoutDashboard,
          exact: true,
        },
        {
          label: 'Pages',
          href: buildHref(`/client/${tenantSlug}/website/pages`),
          icon: FileText,
          matchPrefix: `/client/${tenantSlug}/website/pages`,
        },
        {
          label: 'Design & Theme',
          href: buildHref(`/client/${tenantSlug}/website/design`),
          icon: Palette,
          matchPrefix: `/client/${tenantSlug}/website/design`,
        },
        {
          label: 'Navigation',
          href: buildHref(`/client/${tenantSlug}/website/navigation`),
          icon: Compass,
          matchPrefix: `/client/${tenantSlug}/website/navigation`,
        },
        {
          label: 'Locations',
          href: buildHref(`/client/${tenantSlug}/website/stores`),
          icon: MapPin,
          matchPrefix: `/client/${tenantSlug}/website/stores`,
        },
        {
          label: 'Products',
          href: buildHref(`/client/${tenantSlug}/website/products`),
          icon: ShoppingBag,
          matchPrefix: `/client/${tenantSlug}/website/products`,
        },
      ],
    },
    {
      group: 'GROWTH',
      items: [
        {
          label: 'SEO',
          href: buildHref(`/client/${tenantSlug}/website/seo`),
          icon: Search,
          exact: true,
        },
        {
          label: 'SEO Intelligence',
          href: buildHref(`/client/${tenantSlug}/website/seo/intelligence`),
          icon: Sparkles,
          matchPrefix: `/client/${tenantSlug}/website/seo/intelligence`,
          badge: 'AI',
        },
        {
          label: 'Analytics',
          href: buildHref(`/client/${tenantSlug}/website/analytics`),
          icon: BarChart3,
          matchPrefix: `/client/${tenantSlug}/website/analytics`,
        },
      ],
    },
    {
      group: 'PUBLISHING',
      items: [
        {
          label: 'Domains',
          href: buildHref(`/client/${tenantSlug}/website/domains`),
          icon: Globe,
          matchPrefix: `/client/${tenantSlug}/website/domains`,
        },
        {
          label: 'Preview',
          href: buildHref(`/client/${tenantSlug}/website/preview`),
          icon: Eye,
          matchPrefix: `/client/${tenantSlug}/website/preview`,
        },
        {
          label: 'Publish',
          onClick: onOpenPublishModal,
          icon: Send,
          isAction: true,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800 selection:bg-indigo-600 selection:text-white">
      {/* Brand / Workspace Header */}
      <div className="p-4 border-b border-slate-800/80">
        <Link
          href={`/client/${tenantSlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-3 group"
          onClick={onCloseMobile}
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Exit to Dashboard</span>
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-900/40 shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white tracking-tight truncate flex items-center gap-1.5">
                <span>LocalBi</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Studio
                </span>
              </h2>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <span className="truncate">{brandName}</span>
                {isLive ? (
                  <span className="inline-flex items-center text-[10px] text-emerald-400 font-medium">
                    ● Live
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] text-amber-400 font-medium">
                    ● Draft
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.group}
            </div>
            <div className="space-y-0.5 pt-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href?.split('?')[0]
                  : item.matchPrefix
                    ? pathname.startsWith(item.matchPrefix)
                    : false;

                if (item.isAction) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        item.onClick?.();
                        onCloseMobile?.();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-indigo-300 hover:text-white hover:bg-indigo-600/20 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href || '#'}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-900/50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'
                          }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0B1120]/50 text-slate-400 text-[11px] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Client Domain Protected</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">v2.4</span>
      </div>
    </aside>
  );
}
