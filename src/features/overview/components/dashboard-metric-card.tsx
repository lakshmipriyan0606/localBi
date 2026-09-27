'use client';

import {
  Eye,
  Phone,
  Navigation,
  Star,
  ImageIcon,
  MousePointerClick,
  BarChart2,
  Percent,
  Crown,
  Users,
  Activity,
  Target,
  Flag,
  ArrowUp,
  ArrowDown,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { DashboardSparkline } from './dashboard-sparkline';
import { cn } from '@/lib/cn';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  eye: Eye,
  phone: Phone,
  navigation: Navigation,
  star: Star,
  image: ImageIcon,
  'mouse-pointer-click': MousePointerClick,
  'bar-chart': BarChart2,
  percent: Percent,
  crown: Crown,
  users: Users,
  activity: Activity,
  target: Target,
  flag: Flag,
  globe: Globe,
  'check-circle': CheckCircle2,
};

interface ThemeColors {
  iconBg: string;
  iconText: string;
  sparkColor: string;
}

const DEFAULT_THEME: ThemeColors = {
  iconBg: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100/60',
  iconText: 'text-blue-600',
  sparkColor: '#3B82F6',
};

const COLOR_THEMES: Record<string, ThemeColors> = {
  purple: {
    iconBg: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100/60',
    iconText: 'text-purple-600',
    sparkColor: '#8B5CF6',
  },
  blue: {
    iconBg: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100/60',
    iconText: 'text-blue-600',
    sparkColor: '#3B82F6',
  },
  teal: {
    iconBg: 'bg-teal-50 text-teal-600 ring-1 ring-teal-100/60',
    iconText: 'text-teal-600',
    sparkColor: '#14B8A6',
  },
  emerald: {
    iconBg: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/60',
    iconText: 'text-emerald-600',
    sparkColor: '#10B981',
  },
  amber: {
    iconBg: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100/60',
    iconText: 'text-amber-600',
    sparkColor: '#F59E0B',
  },
  cyan: {
    iconBg: 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100/60',
    iconText: 'text-cyan-600',
    sparkColor: '#06B6D4',
  },
  indigo: {
    iconBg: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100/60',
    iconText: 'text-indigo-600',
    sparkColor: '#6366F1',
  },
  sky: {
    iconBg: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100/60',
    iconText: 'text-sky-600',
    sparkColor: '#0EA5E9',
  },
  violet: {
    iconBg: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100/60',
    iconText: 'text-violet-600',
    sparkColor: '#8B5CF6',
  },
};

export interface DashboardMetricCardProps {
  label: string;
  value: number | string;
  sublabel?: string | undefined;
  delta?: number | undefined;
  vsLabel?: string | undefined;
  icon: string;
  color: string;
  sparkColor?: string | undefined;
  suffix?: string | undefined;
  invertDelta?: boolean | undefined;
  seed?: number | undefined;
  points?: number[] | undefined;
  className?: string | undefined;
  isActive?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

export function DashboardMetricCard({
  label,
  value,
  sublabel,
  delta,
  vsLabel,
  icon,
  color,
  sparkColor,
  suffix,
  invertDelta = false,
  seed: _seed = 1,
  points,
  className,
  isActive = false,
  onClick,
}: DashboardMetricCardProps) {
  const Icon = ICON_MAP[icon] || Globe;
  const theme = COLOR_THEMES[color] ?? DEFAULT_THEME;
  const spark = sparkColor || theme.sparkColor;

  const formattedValue =
    typeof value === 'string'
      ? value
      : suffix
      ? `${value}${suffix}`
      : value.toLocaleString('en-US');
  const hasDelta = typeof delta === 'number' && !isNaN(delta);
  const isPositive = hasDelta ? (invertDelta ? delta < 0 : delta > 0) : false;
  const ArrowIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'bg-white rounded-2xl border p-3 flex flex-col justify-between min-h-[112px] overflow-hidden transition-all duration-200 select-none relative',
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default shadow-[0_1px_3px_rgba(15,23,42,0.03)]',
        isActive ? 'ring-2 ring-inset border-transparent' : 'border-slate-200/80',
        className
      )}
      style={{
        ...(isActive && onClick ? { 
          backgroundColor: spark, 
          color: 'white',
          boxShadow: `0 4px 14px 0 ${spark}40`
        } : {})
      }}
    >
      {/* Checkbox overlay when active */}
      {onClick && (
        <div className={cn(
          "absolute top-3 left-3 w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors",
          isActive 
            ? "bg-white/20 border-white text-white" 
            : "bg-white border-slate-300 text-transparent hover:border-slate-400 group-hover:border-slate-400"
        )}>
          {isActive && <CheckCircle2 className="w-3 h-3 text-white absolute inset-0 m-auto stroke-[3]" />}
        </div>
      )}

      {/* Top row: circular icon on left, metric label next to it */}
      <div className={cn("flex items-center gap-2 min-w-0 relative z-10", onClick ? "ml-6" : "")}>
        {!onClick && (
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
              theme.iconBg
            )}
          >
            <Icon className={cn('w-3.5 h-3.5', theme.iconText)} />
          </div>
        )}
        <span className={cn(
          "text-[11.5px] font-medium tracking-tight leading-tight truncate",
          isActive ? "text-white" : "text-slate-600"
        )}>
          {label}
        </span>
      </div>

      {/* Bottom row: value & delta on left, sparkline on right */}
      <div className="flex items-end justify-between gap-1 mt-1 relative z-10">
        <div className="flex-shrink-0">
          <div
            className={cn(
              "text-[21px] font-bold tracking-tight leading-none tabular-nums truncate max-w-[140px] sm:max-w-[160px]",
              isActive ? "text-white" : "text-slate-900"
            )}
            title={typeof value === 'string' ? value : undefined}
          >
            {formattedValue}
          </div>
          {hasDelta ? (
            <div className="flex flex-col mt-1">
              <div
                className={cn(
                  'flex items-center gap-0.5 text-[11px] font-bold leading-tight',
                  isActive ? 'text-white/90' : (isPositive ? 'text-emerald-600' : 'text-rose-600')
                )}
              >
                <ArrowIcon className="w-3 h-3 stroke-[2.5]" />
                <span>
                  {delta > 0 ? '' : ''}
                  {Math.abs(delta)}%
                </span>
              </div>
              <span
                className={cn(
                  "text-[9.5px] font-normal leading-tight mt-0.5 whitespace-nowrap",
                  isActive ? "text-white/70" : "text-slate-400"
                )}
              >
                {vsLabel || 'vs previous 30 days'}
              </span>
            </div>
          ) : sublabel ? (
            <div
              className={cn(
                "text-[11px] font-medium mt-1 truncate max-w-[140px] sm:max-w-[160px]",
                isActive ? "text-white/80" : "text-slate-500"
              )}
              title={sublabel}
            >
              {sublabel}
            </div>
          ) : null}
        </div>

        {/* Right side inline smooth sparkline */}
        <div className={cn("w-20 sm:w-24 h-8 flex-shrink-0 flex items-end", isActive ? "opacity-40 brightness-0 invert" : "")}>
          <DashboardSparkline color={spark} height={32} points={points} />
        </div>
      </div>
    </div>
  );
}
