'use client';

import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';

interface GscAchievementCardProps {
  tenantSlug: string;
}

export function GscAchievementCard({ tenantSlug }: GscAchievementCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-indigo-200 group flex flex-col justify-between min-h-[140px]">
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-start gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
          <Trophy className="w-5 h-5 text-white drop-shadow-sm" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[14px] font-bold text-slate-900 leading-tight">
            Higher visibility this month!
          </h4>
          <p className="text-[12px] text-slate-600 leading-relaxed mt-1">
            Your clicks are up <span className="font-semibold text-emerald-600">18.2%</span> compared to the previous 30 days.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-3 pt-3 border-t border-indigo-100/60">
        <Link
          href={`/client/${tenantSlug}/reports?tab=gsc`}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-indigo-700 hover:text-indigo-800 transition-colors group/link"
        >
          <span>View Opportunities</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
