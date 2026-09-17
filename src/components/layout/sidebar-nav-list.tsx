'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';
import { NavGroup, NavItem } from './sidebar-nav-config';

interface SidebarNavListProps {
  groups: NavGroup[];
  onNavigate?: (() => void) | undefined;
}

function isItemActive(item: NavItem, pathname: string, searchParams: URLSearchParams | null): boolean {
  if (item.exact) return pathname === item.href;
  const [itemPath = '', itemQuery] = item.href.split('?');

  if (itemQuery) {
    if (pathname !== itemPath) return false;
    const targetParams = new URLSearchParams(itemQuery);
    const targetTab = targetParams.get('tab');
    const targetView = targetParams.get('view');
    if (targetTab) {
      const currentTab = searchParams?.get('tab') || 'gbp';
      return currentTab === targetTab;
    }
    if (targetView) return searchParams?.get('view') === targetView;
    return true;
  }

  if (pathname.endsWith('/reports') && itemPath.endsWith('/reports')) return false;
  if (itemPath.endsWith('/reports/ga4') && pathname.endsWith('/reports/ga4')) {
    return !searchParams?.get('view');
  }
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
}

export function SidebarNavList({ groups, onNavigate }: SidebarNavListProps) {
  const pathname = usePathname();
  let searchParams: URLSearchParams | null = null;
  try {
    const sp = useSearchParams();
    if (sp) searchParams = new URLSearchParams(sp.toString());
  } catch {
    // fallback
  }
  if (!searchParams && typeof window !== 'undefined') {
    searchParams = new URLSearchParams(window.location.search);
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3" aria-label="Workspace navigation">
      {groups.map((group, gi) => {
        const isGroupActive = group.items.some((item) => isItemActive(item, pathname, searchParams));
        const isGbp = group.sourceBadge === 'GBP';
        const isGsc = group.sourceBadge === 'GSC';
        const isGa4 = group.sourceBadge === 'GA4';

        return (
          <div
            key={group.heading || `group-${gi}`}
            className={cn(
              'space-y-0.5 transition-all duration-150',
              !group.heading && 'pt-2 mt-2 border-t border-slate-100',
              isGroupActive && group.heading
                ? isGbp
                  ? 'bg-emerald-50/50 border border-emerald-200/70 rounded-xl p-1.5 shadow-2xs'
                  : isGsc
                  ? 'bg-indigo-50/50 border border-indigo-200/70 rounded-xl p-1.5 shadow-2xs'
                  : isGa4
                  ? 'bg-purple-50/50 border border-purple-200/70 rounded-xl p-1.5 shadow-2xs'
                  : 'bg-slate-50/80 border border-slate-200/80 rounded-xl p-1.5 shadow-2xs'
                : 'px-0 py-0'
            )}
          >
            {group.heading && (
              <div className="px-2 pb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'text-[10.5px] uppercase tracking-wider transition-colors flex items-center gap-1.5',
                    isGroupActive
                      ? isGbp
                        ? 'text-emerald-900 font-extrabold'
                        : isGsc
                        ? 'text-indigo-950 font-extrabold'
                        : isGa4
                        ? 'text-purple-950 font-extrabold'
                        : 'text-slate-900 font-extrabold'
                      : 'text-slate-400 font-bold'
                  )}
                >
                  {isGroupActive && (
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0',
                        isGbp
                          ? 'bg-emerald-500'
                          : isGsc
                          ? 'bg-indigo-600'
                          : isGa4
                          ? 'bg-purple-600'
                          : 'bg-indigo-600'
                      )}
                    />
                  )}
                  <span>{group.heading}</span>
                </span>

                {group.sourceBadge && (
                  <span
                    className={cn(
                      'text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded border font-mono transition-all',
                      isGroupActive
                        ? isGbp
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs ring-2 ring-emerald-400/20'
                          : isGsc
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-2xs ring-2 ring-indigo-400/20'
                          : isGa4
                          ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-2xs ring-2 ring-purple-400/20'
                          : 'bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
                        : group.badgeColor || 'bg-slate-100 text-slate-500 border-slate-200'
                    )}
                  >
                    {group.sourceBadge}
                  </span>
                )}
              </div>
            )}

            {group.items.map((item) => {
              const isActive = isItemActive(item, pathname, searchParams);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  {...(onNavigate ? { onClick: onNavigate } : {})}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-all duration-100 select-none cursor-pointer',
                    isActive
                      ? isGbp
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : isGsc
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : isGa4
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0 transition-colors',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                  {item.pillBadge && (
                    <span
                      className={cn(
                        'ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0',
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeVariant === 'purple'
                          ? 'bg-purple-100 text-purple-700'
                          : item.badgeVariant === 'indigo'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {item.pillBadge}
                    </span>
                  )}
                  {isActive && !item.pillBadge && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white flex-shrink-0 shadow-2xs" />
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
