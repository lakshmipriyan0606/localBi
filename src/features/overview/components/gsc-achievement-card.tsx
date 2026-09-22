'use client';

import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';

interface GscAchievementCardProps {
  tenantSlug: string;
}

export function GscAchievementCard({ tenantSlug }: GscAchievementCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3 min-h-[108px]">
      <div className="w-10 h-10 rounded-full bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center flex-shrink-0 text-amber-500">
        <Trophy className="w-5 h-5 fill-amber-400 text-amber-500" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-[13px] font-bold text-slate-900 leading-tight">
          Higher visibility this month!
        </h4>
        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
          Your clicks are up 18.2% compared to the previous 30 days.
        </p>
        <Link
          href={`/client/${tenantSlug}/reports?tab=gsc`}
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors mt-1.5"
        >
          <span>View Opportunities</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
