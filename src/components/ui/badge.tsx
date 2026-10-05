import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
        secondary: 'bg-slate-100 text-slate-700 border border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
        warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
        danger: 'bg-red-50 text-red-700 border border-red-200/60',
        neutral: 'bg-slate-100 text-slate-600 border border-slate-200/80',
        outline: 'text-slate-800 border border-slate-300',
        // Color aliases for direct design usage
        slate: 'bg-slate-100 text-slate-600 border border-slate-200/80',
        emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
        amber: 'bg-amber-50 text-amber-700 border border-amber-200/60',
        indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
        purple: 'bg-purple-50 text-purple-700 border border-purple-200/60',
        blue: 'bg-blue-50 text-blue-700 border border-blue-200/60',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
