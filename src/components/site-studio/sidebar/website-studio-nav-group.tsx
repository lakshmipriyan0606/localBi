'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { StudioNavGroup, StudioNavItem } from './website-studio-nav-config';
import { WebsiteStudioNavItem } from './website-studio-nav-item';

interface WebsiteStudioNavGroupProps {
  group: StudioNavGroup;
  pathname: string;
  searchParams: URLSearchParams | null;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

export function isStudioItemActive(
  item: StudioNavItem,
  pathname: string,
  searchParams: URLSearchParams | null
): boolean {
  if (item.exact) {
    const [path] = item.href.split('?');
    return pathname === path;
  }

  const [itemPath = '', itemQuery] = item.href.split('?');

  if (itemQuery) {
    if (pathname !== itemPath) return false;
    const targetParams = new URLSearchParams(itemQuery);
    const targetTab = targetParams.get('tab');
    const targetView = targetParams.get('view');
    if (targetTab) {
      return searchParams?.get('tab') === targetTab;
    }
    if (targetView) {
      return searchParams?.get('view') === targetView;
    }
    return true;
  }

  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`);
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function WebsiteStudioNavGroup({
  group,
  pathname,
  searchParams,
  isOpen,
  onToggle,
  isCollapsed = false,
  onNavigate,
}: WebsiteStudioNavGroupProps) {
  const isAnyChildActive = group.items.some((item) =>
    isStudioItemActive(item, pathname, searchParams)
  );

  if (isCollapsed) {
    return (
      <div className="py-2 border-t border-slate-100 first:border-t-0 space-y-1">
        {group.items.map((item) => {
          const isActive = isStudioItemActive(item, pathname, searchParams);
          return (
            <WebsiteStudioNavItem
              key={item.id}
              item={item}
              isActive={isActive}
              isCollapsed={true}
              onNavigate={onNavigate}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1 select-none">
      {/* ── Section Heading Toggle Bar ── */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-left transition-colors cursor-pointer group',
          isAnyChildActive
            ? 'text-indigo-950 font-bold bg-indigo-50/50'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {isAnyChildActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider truncate">
            {group.heading}
          </span>
        </div>

        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>

      {/* ── Items List ── */}
      {isOpen && (
        <div className="space-y-0.5 pt-0.5 pl-1.5 border-l border-slate-200/80 ml-2 animate-in fade-in-50 duration-150">
          {group.items.map((item) => {
            const isActive = isStudioItemActive(item, pathname, searchParams);
            return (
              <WebsiteStudioNavItem
                key={item.id}
                item={item}
                isActive={isActive}
                isCollapsed={false}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
