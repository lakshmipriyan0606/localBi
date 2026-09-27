import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { formatNumber } from '@/shared/lib/formatters';

interface OverviewKpiCardProps {
  href: string;
  badgeLabel: string;
  badgeClass: string;
  icon: LucideIcon;
  iconColor: string;
  hoverBorder: string;
  value: number | null | undefined;
  subtext: string;
  growthPercent?: number | null | undefined;
}

export function OverviewKpiCard({
  href,
  badgeLabel,
  badgeClass,
  icon: Icon,
  iconColor,
  hoverBorder,
  value,
  subtext,
  growthPercent,
}: OverviewKpiCardProps) {
  return (
    <Link
      href={href}
      className={`p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs ${hoverBorder} transition-all group block`}
    >
      <div className="flex items-center justify-between text-slate-500 mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeClass}`}>
          {badgeLabel}
        </span>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatNumber(value)}</p>
      {growthPercent != null ? (
        <span
          className={`text-[11px] font-semibold mt-1 inline-block ${
            growthPercent > 0
              ? 'text-emerald-700'
              : growthPercent < 0
              ? 'text-rose-700'
              : 'text-slate-500'
          }`}
        >
          {growthPercent > 0 ? `+${growthPercent}%` : `${growthPercent}%`} vs prior
        </span>
      ) : (
        <span className="text-[11px] text-slate-400 mt-1 inline-block">{subtext}</span>
      )}
    </Link>
  );
}
