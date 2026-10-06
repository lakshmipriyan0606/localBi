'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
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

function isItemOrSubItemActive(item: NavItem, pathname: string, searchParams: URLSearchParams | null): boolean {
  if (isItemActive(item, pathname, searchParams)) return true;
  if (item.subItems && item.subItems.length > 0) {
    return item.subItems.some((sub) => isItemActive(sub, pathname, searchParams));
  }
  return false;
}

export function SidebarNavList({ groups, onNavigate }: SidebarNavListProps) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const searchParamsString = sp?.toString() || '';

  // Helper to parse searchParams safely
  const getSearchParams = useCallback((): URLSearchParams | null => {
    if (searchParamsString) return new URLSearchParams(searchParamsString);
    if (typeof window !== 'undefined' && window.location.search) {
      return new URLSearchParams(window.location.search);
    }
    return null;
  }, [searchParamsString]);

  // Initial deterministic state: Only expand the group containing the active item
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const currentSp = searchParamsString ? new URLSearchParams(searchParamsString) : null;
    let foundActive = false;

    groups.forEach((group, gi) => {
      const groupKey = group.heading || `group-${gi}`;
      const isActive = group.items.some((item) => isItemOrSubItemActive(item, pathname, currentSp));
      if (isActive) {
        initial[groupKey] = true;
        foundActive = true;
      } else {
        initial[groupKey] = false;
      }
    });

    const firstGroup = groups[0];
    if (!foundActive && firstGroup) {
      const firstKey = firstGroup.heading || 'group-0';
      initial[firstKey] = true;
    }

    return initial;
  });

  // Track the actual route URL string to avoid overriding user clicks on re-render
  const routeString = pathname + (searchParamsString ? `?${searchParamsString}` : '');
  const prevRouteRef = useRef(routeString);

  // Auto-expand only upon genuine page navigation
  useEffect(() => {
    if (prevRouteRef.current !== routeString) {
      prevRouteRef.current = routeString;
      const currentSp = searchParamsString ? new URLSearchParams(searchParamsString) : null;
      const updated: Record<string, boolean> = {};

      groups.forEach((group, gi) => {
        const groupKey = group.heading || `group-${gi}`;
        const isActive = group.items.some((item) => isItemOrSubItemActive(item, pathname, currentSp));
        // On navigation, expand the newly active section and collapse other inactive sections
        updated[groupKey] = isActive;
      });

      setOpenGroups(updated);
    }
  }, [routeString, pathname, searchParamsString, groups]);

  // Track open state of parent items with subItems (e.g. LocalBi Site Studio)
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const currentSp = searchParamsString ? new URLSearchParams(searchParamsString) : null;
    groups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.subItems && item.subItems.length > 0) {
          initial[item.href] = isItemOrSubItemActive(item, pathname, currentSp);
        }
      });
    });
    return initial;
  });

  // Keep submenus open whenever navigating to any child route
  useEffect(() => {
    const currentSp = searchParamsString ? new URLSearchParams(searchParamsString) : null;
    setOpenSubMenus((prev) => {
      const updated = { ...prev };
      groups.forEach((group) => {
        group.items.forEach((item) => {
          if (item.subItems && item.subItems.length > 0) {
            if (isItemOrSubItemActive(item, pathname, currentSp)) {
              updated[item.href] = true;
            }
          }
        });
      });
      return updated;
    });
  }, [routeString, pathname, searchParamsString, groups]);

  const toggleSubMenu = useCallback((itemHref: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [itemHref]: !prev[itemHref],
    }));
  }, []);

  // Accordion toggle:
  // - If clicking an OPEN section (including active): collapses it!
  // - If clicking a CLOSED section: opens it and collapses others so only 1 is open at a time
  const toggleGroup = useCallback((groupKey: string) => {
    setOpenGroups((prev) => {
      const isCurrentlyOpen = Boolean(prev[groupKey]);
      if (isCurrentlyOpen) {
        // Collapse the clicked section (active section can now collapse freely!)
        return {
          ...prev,
          [groupKey]: false,
        };
      } else {
        // Expand the clicked section, and collapse all other sections
        const next: Record<string, boolean> = {};
        Object.keys(prev).forEach((k) => {
          next[k] = false;
        });
        next[groupKey] = true;
        return next;
      }
    });
  }, []);

  const currentSp = getSearchParams();

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-2" aria-label="Workspace navigation">
      {groups.map((group, gi) => {
        const groupKey = group.heading || `group-${gi}`;
        const isGroupActive = group.items.some((item) => isItemOrSubItemActive(item, pathname, currentSp));
        const isOpen = Boolean(openGroups[groupKey]);

        // Unified, consistent header styling across all sections (no rainbow color shifts)
        let headerBg = 'bg-slate-50/60 hover:bg-slate-100 border-slate-200/60 text-slate-700';
        let headerText = 'text-slate-700 font-bold';
        let dotStyle = 'bg-slate-400';
        const connectorColor = 'border-slate-200';

        if (isGroupActive) {
          headerBg = isOpen
            ? 'bg-slate-100 hover:bg-slate-200/70 border-slate-300 text-slate-950 shadow-xs ring-1 ring-slate-400/20'
            : 'bg-slate-100/80 hover:bg-slate-200/60 border-slate-200 text-slate-900 shadow-2xs';
          headerText = 'text-slate-950 font-extrabold';
          dotStyle = 'bg-indigo-600';
        } else if (isOpen) {
          headerBg = 'bg-slate-100/90 hover:bg-slate-200/70 border-slate-200/90 text-slate-900 shadow-2xs';
          headerText = 'text-slate-900 font-bold';
          dotStyle = 'bg-slate-500';
        }

        return (
          <div
            key={groupKey}
            className={cn(
              'space-y-1 transition-all duration-200',
              !group.heading && 'pt-2 mt-2 border-t border-slate-100'
            )}
          >
            {group.heading ? (
              /* ── High-Impact Interactive Headline Bar ── */
              <button
                type="button"
                onClick={() => toggleGroup(groupKey)}
                aria-expanded={isOpen}
                aria-controls={`nav-group-items-${gi}`}
                className={cn(
                  'w-full text-left flex items-center justify-between rounded-lg px-2.5 py-1.5 border transition-all duration-150 select-none cursor-pointer group/header',
                  headerBg
                )}
              >
                {/* Left: Indicator Dot or Group Icon + Section Title */}
                <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                  {group.icon ? (
                    <group.icon className="h-3.5 w-3.5 text-slate-500 group-hover/header:text-slate-800 transition-colors flex-shrink-0" />
                  ) : isGroupActive ? (
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotStyle)} />
                      <span className={cn('relative inline-flex rounded-full h-2 w-2', dotStyle)} />
                    </span>
                  ) : (
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors', dotStyle)} />
                  )}
                  <span
                    className={cn(
                      'text-[12px] tracking-tight transition-colors truncate',
                      headerText
                    )}
                  >
                    {group.heading}
                  </span>
                </div>

                {/* Right: Badge + Rotating Chevron */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {group.sourceBadge && (
                    <span
                      className={cn(
                        'text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded border font-mono transition-all',
                        isGroupActive
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                          : group.badgeColor || 'bg-white text-slate-500 border-slate-200 shadow-2xs'
                      )}
                    >
                      {group.sourceBadge}
                    </span>
                  )}

                  {/* Smooth Rotating Chevron */}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200 ease-in-out',
                      isOpen ? 'rotate-0 text-slate-700' : '-rotate-90 text-slate-400 group-hover/header:text-slate-600'
                    )}
                    aria-hidden="true"
                  />
                </div>
              </button>
            ) : null}

            {/* ── Collapsible Items List with Left Tree Connector ── */}
            <div
              id={`nav-group-items-${gi}`}
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-200 ease-in-out',
                isOpen
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0 pointer-events-none'
              )}
            >
              <div className="overflow-hidden">
                <div className={cn(
                  'ml-3 pl-2.5 border-l-2 space-y-0.5 py-1',
                  connectorColor
                )}>
                  {group.items.map((item) => {
                    const hasSub = Boolean(item.subItems && item.subItems.length > 0);
                    const isAnySubActive = hasSub && item.subItems!.some((sub) => isItemActive(sub, pathname, currentSp));
                    const isDirectActive = isItemActive(item, pathname, currentSp) && !isAnySubActive;
                    const isParentActive = isDirectActive || isAnySubActive;
                    const isSubOpen = Boolean(openSubMenus[item.href]);
                    const Icon = item.icon;

                    if (hasSub) {
                      return (
                        <div key={item.href} className="space-y-0.5 pt-0.5">
                          {/* Parent Nav Item Row */}
                          <div className="flex items-center group/parent">
                            <Link
                              href={item.href}
                              {...(onNavigate ? { onClick: onNavigate } : {})}
                              className={cn(
                                'flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-all duration-100 select-none cursor-pointer',
                                isDirectActive
                                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                  : isAnySubActive
                                  ? 'bg-indigo-50/90 text-indigo-950 font-bold border border-indigo-200/80 shadow-2xs'
                                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                              )}
                              aria-current={isDirectActive ? 'page' : undefined}
                            >
                              <Icon
                                className={cn(
                                  'h-4 w-4 flex-shrink-0 transition-colors',
                                  isDirectActive
                                    ? 'text-white'
                                    : isAnySubActive
                                    ? 'text-indigo-600'
                                    : 'text-slate-400 group-hover/parent:text-slate-700'
                                )}
                                aria-hidden="true"
                              />
                              <span className="truncate">{item.label}</span>
                              {item.pillBadge && (
                                <span
                                  className={cn(
                                    'ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0',
                                    isDirectActive
                                      ? 'bg-white/20 text-white'
                                      : 'bg-indigo-100 text-indigo-700'
                                  )}
                                >
                                  {item.pillBadge}
                                </span>
                              )}
                            </Link>

                            {/* Expand/Collapse Chevron Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleSubMenu(item.href);
                              }}
                              className={cn(
                                'p-1.5 rounded-md hover:bg-slate-200/70 ml-0.5 transition-colors cursor-pointer',
                                isParentActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
                              )}
                              title={`Toggle ${item.label} pages`}
                              aria-expanded={isSubOpen}
                            >
                              <ChevronDown
                                className={cn(
                                  'h-3.5 w-3.5 transition-transform duration-200 ease-in-out',
                                  isSubOpen ? 'rotate-0' : '-rotate-90'
                                )}
                              />
                            </button>
                          </div>

                          {/* Sub-Items Tree Connector */}
                          {isSubOpen && (
                            <div className="ml-3 pl-2.5 border-l-2 border-indigo-200/80 space-y-0.5 py-1 animate-in fade-in-50 duration-150">
                              {item.subItems!.map((sub) => {
                                const isSubActive = isItemActive(sub, pathname, currentSp);
                                const SubIcon = sub.icon;

                                return (
                                  <Link
                                    key={sub.href}
                                    href={sub.href}
                                    {...(onNavigate ? { onClick: onNavigate } : {})}
                                    className={cn(
                                      'group flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] transition-all select-none cursor-pointer',
                                      isSubActive
                                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                                    )}
                                    aria-current={isSubActive ? 'page' : undefined}
                                  >
                                    <SubIcon
                                      className={cn(
                                        'h-3.5 w-3.5 flex-shrink-0 transition-colors',
                                        isSubActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                                      )}
                                      aria-hidden="true"
                                    />
                                    <span className="truncate">{sub.label}</span>
                                    {sub.pillBadge && (
                                      <span
                                        className={cn(
                                          'ml-auto text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full flex-shrink-0',
                                          isSubActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-indigo-100 text-indigo-700'
                                        )}
                                      >
                                        {sub.pillBadge}
                                      </span>
                                    )}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const isActive = isItemActive(item, pathname, currentSp);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        {...(onNavigate ? { onClick: onNavigate } : {})}
                        className={cn(
                          'group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-all duration-100 select-none cursor-pointer',
                          isActive
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
