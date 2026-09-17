'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Link2,
  Tag,
  MapPin,
  Users,
  Mail,
  Settings,
  LogOut,
  ChevronsUpDown,
  Menu,
  X,
} from 'lucide-react';
import { LocalBiMark } from '@/components/brand/localbi-mark';
import { Badge } from '@/components/ui/badge';
import { browserClient } from '@/lib/http/browser-client';
import { cn } from '@/lib/cn';

export interface SafeTenantNavDto {
  id: string;
  name: string;
  slug: string;
  plan: string;
  timezone: string;
}

export interface SafeUserNavDto {
  id: string;
  email: string;
  fullName?: string | null | undefined;
  role: string;
}

interface TenantSidebarProps {
  tenant: SafeTenantNavDto;
  user: SafeUserNavDto;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const navGroups = (slug: string): NavGroup[] => [
  {
    heading: 'Analytics',
    items: [
      {
        label: 'Overview',
        href: `/t/${slug}`,
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: 'Reports & Drilldowns',
        href: `/t/${slug}/reports`,
        icon: BarChart3,
      },
    ],
  },
  {
    heading: 'Local Presence',
    items: [
      {
        label: 'Location Directory',
        href: `/t/${slug}/locations`,
        icon: MapPin,
      },
      {
        label: 'Google Accounts',
        href: `/t/${slug}/integrations`,
        icon: Link2,
      },
    ],
  },
  {
    heading: 'Administration',
    items: [
      {
        label: 'Brands',
        href: `/t/${slug}/brands`,
        icon: Tag,
      },
      {
        label: 'Team Members',
        href: `/t/${slug}/team`,
        icon: Users,
      },
      {
        label: 'Invitations',
        href: `/t/${slug}/invitations`,
        icon: Mail,
      },
      {
        label: 'Settings',
        href: `/t/${slug}/settings`,
        icon: Settings,
      },
    ],
  },
];

function SidebarContent({
  tenant,
  user,
  onNavigate,
}: TenantSidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await browserClient.post('/auth/logout');
    } finally {
      router.push('/login');
    }
  };

  const groups = navGroups(tenant.slug);

  return (
    <div className="flex h-full flex-col">
      {/* ── Brand header ── */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 mb-4">
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

        {/* Tenant / org switcher */}
        <Link
          href="/tenants"
          {...(onNavigate ? { onClick: onNavigate } : {})}
          className="group flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 transition-all hover:border-indigo-300 hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          title="Switch organization"
        >
          <div className="min-w-0 flex-1 pr-2">
            <div className="truncate text-[13px] font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
              {tenant.name}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Badge
                variant="secondary"
                className="py-0 px-1.5 text-[10px] capitalize font-medium"
              >
                {user.role.replace(/_/g, ' ').toLowerCase()}
              </Badge>
              <span className="text-[10px] font-mono text-slate-400 truncate">
                {tenant.plan}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 group-hover:text-indigo-500 transition-colors" />
        </Link>
      </div>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4"
        aria-label="Workspace navigation"
      >
        {groups.map((group) => (
          <div key={group.heading} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              {group.heading}
            </div>
            {group.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  {...(onNavigate ? { onClick: onNavigate } : {})}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-[120ms] select-none',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0 transition-colors',
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    )}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="px-3 pb-4 pt-3 border-t border-slate-100 space-y-1">
        {/* User info */}
        <div className="px-3 py-1.5 rounded-lg bg-slate-50 mb-1">
          <div className="text-[13px] font-semibold text-slate-800 truncate">
            {user.fullName || user.email.split('@')[0]}
          </div>
          <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          id="workspace-sign-out-btn"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 cursor-pointer"
        >
          <LogOut className="h-4 w-4 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export function TenantSidebar({ tenant, user }: TenantSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-white min-h-screen">
        <SidebarContent tenant={tenant} user={user} />
      </aside>

      {/* ── Mobile: top bar with hamburger ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <LocalBiMark size="sm" showLabel={false} />
          <span className="font-bold text-slate-900 text-[15px]">
            local<span className="text-indigo-600">Bi</span>
          </span>
        </div>
        <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-xl overflow-y-auto"
            aria-label="Mobile navigation"
          >
            {/* Close button in drawer */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <LocalBiMark size="sm" showLabel={false} />
                <span className="font-bold text-slate-900 text-[15px]">
                  local<span className="text-indigo-600">Bi</span>
                </span>
              </div>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent
              tenant={tenant}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </>
      )}
    </>
  );
}
