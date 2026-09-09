'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Tag,
  MapPin,
  Users,
  Mail,
  Settings,
  LogOut,
  ChevronsUpDown,
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

export function TenantSidebar({ tenant, user }: TenantSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await browserClient.post('/auth/logout');
    } finally {
      router.push('/login');
    }
  };

  const navItems = [
    {
      label: 'Overview',
      href: `/t/${tenant.slug}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'Brands',
      href: `/t/${tenant.slug}/brands`,
      icon: Tag,
    },
    {
      label: 'Locations',
      href: `/t/${tenant.slug}/locations`,
      icon: MapPin,
    },
    {
      label: 'Team Members',
      href: `/t/${tenant.slug}/team`,
      icon: Users,
    },
    {
      label: 'Invitations',
      href: `/t/${tenant.slug}/invitations`,
      icon: Mail,
    },
    {
      label: 'Settings & Sessions',
      href: `/t/${tenant.slug}/settings`,
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200/90 bg-white flex flex-col justify-between p-4 flex-shrink-0 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <LocalBiMark size="sm" showLabel={false} />
            <div>
              <span className="font-bold tracking-tight text-slate-900 leading-none text-base">
                local<span className="text-indigo-600">Bi</span>
              </span>
              <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Multi-Tenant Engine
              </span>
            </div>
          </div>

          {/* Tenant Switcher Card */}
          <Link
            href="/tenants"
            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 hover:border-slate-300 transition-colors group"
            title="Switch Organization"
          >
            <div className="min-w-0 pr-2">
              <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                {tenant.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                  {user.role.replace(/_/g, ' ').toLowerCase()}
                </Badge>
                <span className="text-[10px] text-slate-400 font-mono truncate">
                  /t/{tenant.slug}
                </span>
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 group-hover:text-slate-600" />
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1" aria-label="Workspace navigation">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors select-none',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 flex-shrink-0 transition-colors',
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User & Sign out footer */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <div className="px-2 py-1">
          <div className="text-xs font-semibold text-slate-800 truncate">
            {user.fullName || user.email.split('@')[0]}
          </div>
          <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          id="workspace-sign-out-btn"
          className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
