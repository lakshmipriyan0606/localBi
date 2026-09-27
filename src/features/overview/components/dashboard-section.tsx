'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DashboardSectionProps {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeColor?: string;
  subtitle: string;
  bgClass?: string;
  borderClass?: string;
  reportHref?: string;
  reportLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardSection({
  icon,
  title,
  badge,
  badgeColor,
  subtitle,
  bgClass = 'bg-white',
  borderClass = 'border-slate-200',
  reportHref,
  reportLabel = 'View Report',
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border p-4 sm:p-4.5 transition-all duration-150',
        bgClass,
        borderClass,
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">{icon}</div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-[17px] font-bold tracking-tight text-slate-900 leading-none">
                {title}
              </h2>
              {badge && (
                <span
                  className={cn(
                    'text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 leading-normal',
                    badgeColor || 'bg-slate-100 text-slate-700'
                  )}
                >
                  {badge}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-slate-500 mt-1 leading-none">{subtitle}</p>
          </div>
        </div>

        {/* Right header controls */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">

          {reportHref && (
            <Link
              href={reportHref}
              className="bg-white/90 backdrop-blur-xs border border-slate-200/90 hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 rounded-lg px-3 py-1 text-[11.5px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <span>{reportLabel}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}
