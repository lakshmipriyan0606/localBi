import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Layers,
  SearchCode,
  MapPin,
  TrendingUp,
  Search,
  Check,
  Building2,
  FileText,
  Globe,
  MonitorSmartphone,
  Activity,
  Share2,
  Link2,
  Tag,
  Users,
  Mail,
  Settings,
  LogOut,
  ChevronsUpDown,
  X,
} from 'lucide-react';
import { LocalBiMark } from '@/components/brand/localbi-mark';
import { Badge } from '@/components/ui/badge';
import { browserClient } from '@/lib/http/browser-client';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
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

export interface AuthorizedTenantDto {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

interface TenantSidebarProps {
  tenant: SafeTenantNavDto;
  user: SafeUserNavDto;
  tenants?: AuthorizedTenantDto[] | undefined;
  mobileOpen?: boolean | undefined;
  onCloseMobile?: (() => void) | undefined;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  pillBadge?: string;
  badgeVariant?: 'purple' | 'slate' | 'emerald' | 'amber';
}

interface NavGroup {
  heading: string;
  sourceBadge?: string;
  badgeColor?: string;
  items: NavItem[];
}

const navGroups = (slug: string): NavGroup[] => [
  {
    heading: 'Dashboard',
    items: [
      {
        label: 'Overview',
        href: `/t/${slug}`,
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    heading: 'Google Business Profile',
    sourceBadge: 'GBP',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    items: [
      {
        label: 'Performance Hub',
        href: `/t/${slug}/reports?tab=gbp`,
        icon: Store,
      },
      {
        label: 'Location Matrix',
        href: `/t/${slug}/reports/gbp/locations`,
        icon: Layers,
      },
      {
        label: 'Monthly Search Terms',
        href: `/t/${slug}/reports/gbp/search-terms`,
        icon: SearchCode,
      },
      {
        label: 'Storefront Directory',
        href: `/t/${slug}/locations`,
        icon: MapPin,
      },
    ],
  },
  {
    heading: 'Google Search Console',
    sourceBadge: 'GSC',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    items: [
      {
        label: 'Search Performance',
        href: `/t/${slug}/reports?tab=gsc`,
        icon: TrendingUp,
      },
      {
        label: 'Search Queries',
        href: `/t/${slug}/reports/gsc/queries`,
        icon: Search,
      },
      {
        label: 'Landing Pages',
        href: `/t/${slug}/reports/gsc/pages`,
        icon: FileText,
      },
      {
        label: 'Country Distribution',
        href: `/t/${slug}/reports/gsc/countries`,
        icon: Globe,
      },
      {
        label: 'Device Platforms',
        href: `/t/${slug}/reports/gsc/devices`,
        icon: MonitorSmartphone,
      },
    ],
  },
  {
    heading: 'Google Analytics',
    sourceBadge: 'GA4',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    items: [
      {
        label: 'Traffic & Web Sessions',
        href: `/t/${slug}/reports/ga4`,
        icon: Activity,
        pillBadge: 'PREVIEW',
        badgeVariant: 'purple',
      },
      {
        label: 'Acquisition Channels',
        href: `/t/${slug}/reports/ga4?view=channels`,
        icon: Share2,
        pillBadge: 'SOON',
        badgeVariant: 'slate',
      },
    ],
  },
  {
    heading: 'Connections',
    items: [
      {
        label: 'Google Accounts & Mapping',
        href: `/t/${slug}/integrations`,
        icon: Link2,
      },
    ],
  },
  {
    heading: 'Administration',
    items: [
      {
        label: 'Client Brands',
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
        label: 'Workspace Settings',
        href: `/t/${slug}/settings`,
        icon: Settings,
      },
    ],
  },
];

function SidebarContent({
  tenant,
  user,
  tenants,
  onNavigate,
}: TenantSidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tenantList = useMemo(() => {
    if (tenants && tenants.length > 0) return tenants;
    return [{ id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan, role: user.role }];
  }, [tenants, tenant.id, tenant.name, tenant.slug, tenant.plan, user.role]);

  const filteredTenants = useMemo(() => {
    if (!tenantSearch.trim()) return tenantList;
    const q = tenantSearch.toLowerCase();
    return tenantList.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [tenantList, tenantSearch]);

function getTargetTenantUrl(currentPathname: string, currentSlug: string, targetSlug: string): string {
  if (currentSlug === targetSlug) return currentPathname;
  const prefix = `/t/${currentSlug}`;
  if (currentPathname.startsWith(prefix)) {
    const subpath = currentPathname.slice(prefix.length);
    return `/t/${targetSlug}${subpath}`;
  }
  return `/t/${targetSlug}`;
}

  const [switchingTenant, setSwitchingTenant] = useState<string | null>(null);

  const handleSelectTenant = (targetSlug: string, targetName: string) => {
    setSwitcherOpen(false);
    if (onNavigate) onNavigate();
    if (targetSlug !== tenant.slug) {
      setSwitchingTenant(targetName);
      router.push(getTargetTenantUrl(pathname, tenant.slug, targetSlug));
    }
  };

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
      {switchingTenant && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl max-w-sm w-full mx-4">
            <AnalyticsLoader
              variant="hero"
              message={`Switching workspace to ${switchingTenant}...`}
            />
          </div>
        </div>
      )}
      {/* ── Brand header ── */}
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

        {/* ── Tenant / Client Dropdown Switcher (In-place popover, no page redirect) ── */}
        <div className="relative" ref={switcherRef}>
          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            className={cn(
              'w-full text-left group flex items-center justify-between rounded-lg border px-2.5 py-2 transition-all cursor-pointer',
              switcherOpen
                ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 bg-slate-50/80 hover:border-indigo-300 hover:bg-indigo-50/50'
            )}
            title="Switch client organization"
            aria-expanded={switcherOpen}
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="truncate text-xs font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                {tenant.name}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="py-0 px-1.5 text-[9px] capitalize font-medium"
                >
                  {user.role.replace(/_/g, ' ').toLowerCase()}
                </Badge>
                <span className="text-[9px] font-mono text-slate-400 truncate">
                  {tenant.plan}
                </span>
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </button>

          {/* In-place Dropdown Popover */}
          {switcherOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95 duration-100 min-w-[240px]">
              <div className="px-2 pt-1 pb-1.5 flex items-center justify-between border-b border-slate-100 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Client
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {tenantList.length} total
                </span>
              </div>

              {tenantList.length > 3 && (
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              <div className="max-h-56 overflow-y-auto space-y-1" role="listbox">
                {filteredTenants.map((t) => {
                  const isCurrent = t.slug === tenant.slug;
                  return (
                    <button
                      key={t.id || t.slug}
                      type="button"
                      onClick={() => handleSelectTenant(t.slug, t.name)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all cursor-pointer',
                        isCurrent
                          ? 'bg-indigo-50/90 text-indigo-950 font-semibold border border-indigo-200/80'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                      )}
                      role="option"
                      aria-selected={isCurrent}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <Building2
                            className={cn(
                              'h-3.5 w-3.5 flex-shrink-0',
                              isCurrent ? 'text-indigo-600' : 'text-slate-400'
                            )}
                          />
                          <span className="truncate text-xs font-semibold">
                            {t.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">
                            /t/{t.slug}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase font-mono">
                            • {t.plan}
                          </span>
                        </div>
                      </div>
                      {isCurrent ? (
                        <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                      ) : (
                        <Badge variant="outline" className="text-[9px] py-0 px-1 text-slate-400 font-normal">
                          Switch
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between px-2 text-[11px] text-slate-400">
                <span>Select client to switch</span>
                <span className="font-mono text-[10px]">{tenantList.length} clients</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4"
        aria-label="Workspace navigation"
      >
        {groups.map((group) => (
          <div key={group.heading} className="space-y-0.5">
            {/* Group Header with optional source badge */}
            <div className="px-2.5 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.heading}
              </span>
              {group.sourceBadge && (
                <span
                  className={cn(
                    'text-[9px] font-bold tracking-wider px-1.5 py-0.2 rounded border font-mono',
                    group.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                  )}
                >
                  {group.sourceBadge}
                </span>
              )}
            </div>

            {/* Group Items */}
            {group.items.map((item) => {
              // Custom active matching logic for queries like ?tab=gbp vs ?tab=gsc
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  (item.href.includes('?')
                    ? pathname + window?.location?.search === item.href
                    : pathname.startsWith(item.href) && !item.href.includes('?'));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  {...(onNavigate ? { onClick: onNavigate } : {})}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-all duration-100 select-none',
                    isActive
                      ? 'bg-indigo-50/90 text-indigo-700 font-semibold'
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
                  <span className="truncate">{item.label}</span>

                  {/* Pill badge if present (e.g. PREVIEW, SOON) */}
                  {item.pillBadge && (
                    <span
                      className={cn(
                        'ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0',
                        item.badgeVariant === 'purple'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {item.pillBadge}
                    </span>
                  )}

                  {/* Active dot indicator if active and no pill badge */}
                  {isActive && !item.pillBadge && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-2">
        <div className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-1">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {user.fullName || user.email.split('@')[0]}
              </div>
              <div className="text-[10px] text-slate-400 truncate font-mono">
                {user.email}
              </div>
            </div>
            <Badge
              variant="secondary"
              className="py-0 px-1.5 text-[9px] capitalize font-medium flex-shrink-0"
            >
              {user.role.replace(/_/g, ' ').toLowerCase()}
            </Badge>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          id="workspace-sign-out-btn"
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
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
      {/* ── Desktop sidebar (fixed width 240px, clean white surface) ── */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col border-r border-slate-200/90 bg-white min-h-screen">
        <SidebarContent tenant={tenant} user={user} tenants={tenants} />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
            onClick={closeMobile}
          />
          {/* Drawer */}
          <aside
            className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-white shadow-xl overflow-y-auto"
            aria-label="Mobile navigation"
          >
            {/* Close button in drawer */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <LocalBiMark size="sm" showLabel={false} />
                <span className="font-bold text-slate-900 text-[15px]">
                  local<span className="text-indigo-600">Bi</span>
                </span>
              </div>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={closeMobile}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent
              tenant={tenant}
              user={user}
              tenants={tenants}
              onNavigate={closeMobile}
            />
          </aside>
        </>
      )}
    </>
  );
}
