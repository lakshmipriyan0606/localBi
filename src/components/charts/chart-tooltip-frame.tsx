import React from 'react';
import { cn } from '@/lib/cn';

export interface ChartTooltipItem {
  label: string;
  value: string | number;
  color?: string | undefined;
  icon?: React.ReactNode | undefined;
}

export interface ChartTooltipFrameProps {
  title?: string | undefined;
  subtitle?: string | undefined;
  items?: ChartTooltipItem[] | undefined;
  className?: string | undefined;
  children?: React.ReactNode | undefined;
}

/**
 * Enterprise Recharts Tooltip Frame
 *
 * Ensures consistent design tokens, subtle backdrop blur, high-contrast typography,
 * and tabular layout across all application charts.
 */
export function ChartTooltipFrame({
  title,
  subtitle,
  items,
  className,
  children,
}: ChartTooltipFrameProps) {
  return (
    <div
      className={cn(
        'bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-xl p-3 text-xs text-slate-800 min-w-[170px] pointer-events-none select-none animate-in fade-in-50 zoom-in-95 duration-100',
        className
      )}
    >
      {title && (
        <p className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1.5 truncate max-w-[240px]">
          {title}
        </p>
      )}
      {subtitle && (
        <p className="text-[10px] text-slate-400 -mt-1 mb-1.5">{subtitle}</p>
      )}

      {items && items.length > 0 && (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3 text-[11px] py-0.5">
              <span className="flex items-center gap-1.5 text-slate-600 truncate max-w-[140px]">
                {item.color && (
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                {item.icon}
                <span className="truncate">{item.label}:</span>
              </span>
              <span className="font-bold text-slate-900 tabular-nums flex-shrink-0">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
