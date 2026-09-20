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
  value: number;
  delta?: number | undefined;
  icon: string;
  color: string;
  sparkColor?: string | undefined;
  suffix?: string | undefined;
  invertDelta?: boolean | undefined;
  seed?: number | undefined;
  points?: number[] | undefined;
  className?: string | undefined;
}

export function DashboardMetricCard({
  label,
  value,
  delta,
  icon,
  color,
  sparkColor,
  suffix,
  invertDelta = false,
  seed: _seed = 1,
  points,
  className,
}: DashboardMetricCardProps) {
  const Icon = ICON_MAP[icon] || Globe;
  const theme = COLOR_THEMES[color] ?? DEFAULT_THEME;
  const spark = sparkColor || theme.sparkColor;

  const formattedValue = suffix ? `${value}${suffix}` : value.toLocaleString('en-US');
  const hasDelta = typeof delta === 'number' && !isNaN(delta);
  const isPositive = hasDelta ? (invertDelta ? delta < 0 : delta > 0) : false;
  const ArrowIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/80 p-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default flex flex-col justify-between h-[108px] overflow-hidden',
        className
      )}
    >
      {/* Top row: circular icon on left, metric label next to it */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
            theme.iconBg
          )}
        >
          <Icon className={cn('w-3.5 h-3.5', theme.iconText)} />
        </div>
        <span className="text-[11.5px] font-medium text-slate-600 tracking-tight leading-tight truncate">
          {label}
        </span>
      </div>

      {/* Bottom row: value & delta on left, sparkline on right */}
      <div className="flex items-end justify-between gap-1 mt-1">
        <div className="flex-shrink-0">
          <div className="text-[21px] font-bold tracking-tight text-slate-900 leading-none tabular-nums">
            {formattedValue}
          </div>
          {hasDelta ? (
            <div
              className={cn(
                'flex items-center gap-0.5 mt-1 text-[11px] font-bold',
                isPositive ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              <ArrowIcon className="w-3 h-3 stroke-[2.5]" />
              <span>
                {delta > 0 ? '+' : ''}
                {delta}%
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              Awaiting data
            </div>
          )}
        </div>

        {/* Right side inline smooth sparkline */}
        <div className="w-20 sm:w-24 h-8 flex-shrink-0 flex items-end">
          <DashboardSparkline color={spark} height={32} points={points} />
        </div>
      </div>
    </div>
  );
}
