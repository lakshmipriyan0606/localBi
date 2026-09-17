import { cn } from '@/lib/cn';
import { Activity, Sparkles } from 'lucide-react';

interface AnalyticsLoaderProps {
  message?: string;
  variant?: 'hero' | 'card' | 'inline' | 'table';
  className?: string;
}

export function AnalyticsLoader({
  message = 'Synchronizing verified Google telemetry...',
  variant = 'hero',
  className,
}: AnalyticsLoaderProps) {
  if (variant === 'card') {
    return (
      <div className={cn('p-4 rounded-xl border border-slate-200/80 bg-white/90 shadow-2xs space-y-3 animate-pulse', className)}>
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 bg-slate-200 rounded-full" />
          <div className="h-4 w-4 rounded bg-indigo-100 text-indigo-500 flex items-center justify-center">
            <Activity className="h-2.5 w-2.5 animate-spin" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="h-7 w-20 bg-slate-300/80 rounded-lg" />
          <div className="h-3 w-12 bg-slate-200 rounded-full" />
        </div>
        {/* Animated mini-data waveform bars */}
        <div className="flex items-end gap-1 h-4 pt-1">
          {[40, 70, 45, 90, 60, 80, 50, 95].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-indigo-500/60 to-teal-400/80 rounded-t-xs animate-bounce"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 120}ms`,
                animationDuration: '1.2s',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('inline-flex items-center gap-2 text-xs font-semibold text-indigo-600', className)}>
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600" />
        </span>
        <span>{message}</span>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('py-12 flex flex-col items-center justify-center space-y-3', className)}>
        <div className="relative flex items-center justify-center">
          <div className="absolute h-10 w-10 rounded-full bg-indigo-500/20 animate-ping" />
          <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-2xs">
            <Sparkles className="h-4 w-4 animate-spin text-indigo-600" />
          </div>
        </div>
        <div className="flex items-end gap-1 h-3.5 pt-0.5">
          {[35, 70, 45, 90, 60, 80, 50, 95].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-indigo-500 to-teal-400 rounded-t-xs animate-pulse"
              style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <p className="text-xs font-semibold text-slate-700">{message}</p>
      </div>
    );
  }

  // Hero variant — modern analytics loading canvas
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 via-white to-indigo-50/20 p-8 shadow-xs flex flex-col items-center justify-center min-h-[220px]',
        className
      )}
    >
      {/* Orbital glowing pulse backdrop */}
      <div className="relative flex items-center justify-center mb-5">
        <div className="absolute h-16 w-16 rounded-full bg-indigo-500/15 animate-ping" />
        <div className="absolute h-20 w-20 rounded-full bg-teal-500/10 animate-pulse" />
        <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white flex items-center justify-center shadow-md ring-4 ring-indigo-50">
          <Sparkles className="h-6 w-6 animate-spin text-indigo-100" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      {/* Dynamic Equalizer / Data Stream Bars */}
      <div className="flex items-end gap-1.5 h-6 mb-3">
        {[30, 65, 95, 45, 80, 100, 55, 75, 40, 85, 60, 90].map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-gradient-to-t from-indigo-600 via-indigo-400 to-teal-400 animate-pulse"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 100}ms`,
              animationDuration: '900ms',
            }}
          />
        ))}
      </div>

      <p className="text-xs font-bold text-slate-800 tracking-tight">{message}</p>
      <p className="text-[11px] text-slate-400 font-mono mt-0.5">Crunching multi-grain search & storefront metrics</p>
    </div>
  );
}
