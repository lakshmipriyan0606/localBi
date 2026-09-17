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
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4" aria-label="Workspace navigation">
      {groups.map((group, gi) => (
        <div key={group.heading || `group-${gi}`} className={cn('space-y-0.5', !group.heading && 'pt-2 mt-2 border-t border-slate-100')}>
          {group.heading && (
            <div className="px-2.5 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.heading}</span>
              {group.sourceBadge && (
                <span className={cn('text-[9px] font-bold tracking-wider px-1.5 py-0.2 rounded border font-mono', group.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200')}>
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
                  'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-all duration-100 select-none',
                  isActive ? 'bg-indigo-50/90 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0 transition-colors', isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600')} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
                {item.pillBadge && (
                  <span className={cn('ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0', item.badgeVariant === 'purple' ? 'bg-purple-100 text-purple-700' : item.badgeVariant === 'indigo' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500')}>
                    {item.pillBadge}
                  </span>
                )}
                {isActive && !item.pillBadge && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 flex-shrink-0" />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
