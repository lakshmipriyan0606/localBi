import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  tenantSlug?: string;
  className?: string;
}

export function Breadcrumbs({ items, tenantSlug, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-slate-500 ${className}`}>
      <ol className="flex items-center space-x-1.5 list-none m-0 p-0">
        {tenantSlug && (
          <li className="flex items-center">
            <Link
              href={`/t/${tenantSlug}`}
              className="flex items-center text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded hover:bg-slate-100"
              title="Overview"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Overview</span>
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.current || isLast;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <li className="flex items-center text-slate-300">
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
              </li>
              <li className="flex items-center">
                {isCurrent || !item.href ? (
                  <span
                    className="font-medium text-slate-800 max-w-[200px] truncate"
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-slate-900 transition-colors max-w-[200px] truncate hover:underline"
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
