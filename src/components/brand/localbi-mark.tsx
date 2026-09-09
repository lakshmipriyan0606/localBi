import { MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LocalBiMarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Enterprise Brand Mark for localBi.
 * Represents multi-location local search visibility and analytics.
 */
export function LocalBiMark({
  className,
  size = 'md',
  showLabel = true,
}: LocalBiMarkProps) {
  const iconDimensions = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }[size];

  const pinSizes = {
    sm: 14,
    md: 20,
    lg: 24,
  }[size];

  return (
    <div className={cn('flex items-center gap-3 select-none', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm ring-1 ring-slate-800/60',
          iconDimensions
        )}
        aria-hidden="true"
      >
        <MapPin size={pinSizes} className="text-indigo-400" />
        <Globe
          size={Math.round(pinSizes * 0.55)}
          className="absolute text-slate-300 opacity-80"
        />
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className="font-bold tracking-tight text-slate-900 leading-none text-lg">
            local<span className="text-indigo-600">Bi</span>
          </span>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
            Local SEO Intelligence
          </span>
        </div>
      )}
    </div>
  );
}
