'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { StudioNavItem } from './website-studio-nav-config';

interface WebsiteStudioNavItemProps {
  item: StudioNavItem;
  isActive: boolean;
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

export function WebsiteStudioNavItem({
  item,
  isActive,
  isCollapsed = false,
  onNavigate,
}: WebsiteStudioNavItemProps) {
  const Icon = item.icon;

  const handleClick = (e: React.MouseEvent) => {
    if (item.isAction && item.onClick) {
      e.preventDefault();
      item.onClick();
    }
    if (onNavigate) {
      onNavigate();
    }
  };

  if (isCollapsed) {
    return (
      <div className="relative flex justify-center py-0.5 group">
        <Link
          href={item.href}
          onClick={handleClick}
          title={item.label}
          aria-label={item.label}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-150 select-none cursor-pointer',
            isActive
              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30 font-bold'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {item.badge && !isActive && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white" />
          )}
        </Link>

        {/* Desktop Collapsed Floating Hover Tooltip */}
        <div className="pointer-events-none absolute left-full ml-2 z-50 hidden rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-md group-hover:block whitespace-nowrap">
          {item.label}
          {item.badge && (
            <span className="ml-1.5 px-1 py-0.2 rounded bg-indigo-500/40 text-[9px]">
              {item.badge}
            </span>
          )}
        </div>
      </div>
    );
  }

  const badgeStyles: Record<string, string> = {
    indigo: isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    violet: isActive ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-700 border-purple-200/80',
    emerald: isActive ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: isActive ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 border-amber-200/80',
    slate: isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 border-slate-200/80',
  };

  const badgeClass = item.badgeVariant
    ? badgeStyles[item.badgeVariant] || badgeStyles.indigo
    : badgeStyles.indigo;

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[12px] font-medium transition-all duration-150 select-none cursor-pointer',
        isActive
          ? 'bg-indigo-600 text-white font-bold shadow-xs'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-1">
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-colors',
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-800'
          )}
          aria-hidden="true"
        />
        <span className="truncate">{item.label}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {item.badge && (
          <span
            className={cn(
              'text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded border font-mono',
              badgeClass
            )}
          >
            {item.badge}
          </span>
        )}

        {item.isExternalPortal && !item.badge && (
          <ExternalLink
            className={cn(
              'h-3 w-3 transition-opacity opacity-0 group-hover:opacity-100',
              isActive ? 'text-white' : 'text-slate-400'
            )}
          />
        )}

        {isActive && !item.badge && (
          <span className="h-1.5 w-1.5 rounded-full bg-white shadow-xs shrink-0" />
        )}
      </div>
    </Link>
  );
}
