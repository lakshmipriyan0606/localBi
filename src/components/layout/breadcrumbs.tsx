import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  tenantSlug?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function Breadcrumbs({
  items,
  tenantSlug,
  backHref,
  backLabel = 'Back to Overview',
  className = '',
}: BreadcrumbsProps) {
  // Infer tenantSlug from items if not explicitly provided
  let inferredSlug = tenantSlug;
  if (!inferredSlug) {
    for (const item of items) {
      if (item.href) {
        const match = item.href.match(/^\/t\/([^/?#]+)/);
        if (match?.[1]) {
          inferredSlug = match[1];
          break;
        }
      }
    }
  }

  const effectiveBackHref = backHref || (inferredSlug ? `/t/${inferredSlug}` : null);

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={`flex flex-wrap items-center gap-2.5 py-1 text-xs select-none ${className}`}
    >
      {/* 1. High-Visibility, Bold "Back to Overview" Button */}
      {effectiveBackHref && (
        <Link
          href={effectiveBackHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/70 hover:text-indigo-700 shadow-2xs transition-all cursor-pointer group flex-shrink-0"
          title={backLabel}
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5] text-slate-500 group-hover:text-indigo-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>{backLabel}</span>
        </Link>
      )}

      {effectiveBackHref && (
        <span className="text-slate-300 select-none font-light hidden sm:inline">|</span>
      )}

      {/* 2. Bold, High-Contrast Breadcrumb Trail */}
      <ol className="flex flex-wrap items-center gap-1.5 list-none m-0 p-0">
        {inferredSlug && (
          <li className="flex items-center">
            <Link
              href={`/t/${inferredSlug}`}
              className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-100/80 transition-colors px-2 py-1 rounded-md"
              title="Overview"
            >
              <Home className="h-3.5 w-3.5 flex-shrink-0 stroke-[2.2] text-slate-500" />
              <span>Overview</span>
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          // If first item is already 'Overview' and we rendered the Home Overview link, skip duplicate
          if (index === 0 && item.label.toLowerCase() === 'overview' && inferredSlug) {
            return null;
          }

          const isLast = index === items.length - 1;
          const isCurrent = item.current || isLast;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <li className="flex items-center text-slate-400">
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 stroke-[2.5]" />
              </li>
              <li className="flex items-center">
                {isCurrent || !item.href ? (
                  <span
                    className="font-bold text-slate-900 text-[12px] bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-md max-w-[260px] truncate shadow-2xs"
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="font-semibold text-slate-600 hover:text-indigo-600 transition-colors max-w-[260px] truncate px-2 py-1 rounded hover:bg-slate-100/80"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
