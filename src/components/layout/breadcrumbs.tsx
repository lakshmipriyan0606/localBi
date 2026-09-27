import React from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';

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
  backLabel = 'Back',
  className = '',
}: BreadcrumbsProps) {
  // Infer tenantSlug from items if not explicitly provided
  let inferredSlug = tenantSlug;
  if (!inferredSlug) {
    for (const item of items) {
      if (item.href) {
        const match = item.href.match(/^\/client\/([^/?#]+)/) || item.href.match(/^\/t\/([^/?#]+)/);
        if (match?.[1]) {
          inferredSlug = match[1];
          break;
        }
      }
    }
  }

  // Filter out redundant "Home" / "Overview" when root Overview is already rendered
  const filteredItems = items.filter((item) => {
    const l = item.label.trim().toLowerCase();
    if (inferredSlug && (l === 'home' || l === 'overview')) {
      return false;
    }
    return true;
  });

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={`flex items-center gap-1.5 py-1 text-xs select-none ${className}`}
    >
      {/* Explicit back button only when specifically provided */}
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center justify-center p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors mr-1 cursor-pointer"
          title={backLabel}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      )}

      {/* Clean, minimalist breadcrumb trail */}
      <ol className="flex flex-wrap items-center gap-1.5 list-none m-0 p-0 text-[12.5px]">
        {inferredSlug && (
          <li className="flex items-center">
            <Link
              href={`/client/${inferredSlug}`}
              className="text-slate-500 hover:text-slate-900 transition-colors font-medium px-1 py-0.5 rounded hover:bg-slate-100"
              title="Overview"
            >
              Overview
            </Link>
          </li>
        )}

        {filteredItems.map((item, index) => {
          const isLast = index === filteredItems.length - 1;
          const isCurrent = item.current || isLast;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <li className="flex items-center text-slate-300">
                <ChevronRight className="h-3 w-3 stroke-[2]" />
              </li>
              <li className="flex items-center">
                {isCurrent || !item.href ? (
                  <span
                    className="font-semibold text-slate-900 max-w-[280px] truncate px-1 py-0.5"
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="font-medium text-slate-500 hover:text-slate-900 transition-colors max-w-[280px] truncate px-1 py-0.5 rounded hover:bg-slate-100"
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
