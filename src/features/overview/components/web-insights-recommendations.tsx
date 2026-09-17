'use client';

import { Target, Sparkles, Navigation, MapPin, Smartphone, ChevronRight } from 'lucide-react';

const INSIGHTS = [
  {
    icon: Navigation,
    iconBg: 'bg-emerald-50 text-emerald-600',
    title: 'Website conversions are up 28.6%',
    description: 'You generated 197 more conversions this month compared to the previous period.',
  },
  {
    icon: MapPin,
    iconBg: 'bg-blue-50 text-blue-600',
    title: 'Denver location leads performance',
    description: '45% of all conversions come from your Denver location. Consider replicating winning content across other locations.',
  },
  {
    icon: Smartphone,
    iconBg: 'bg-purple-50 text-purple-600',
    title: 'Optimize for mobile visitors',
    description: '68% of your traffic is on mobile. Ensure your contact buttons and forms are mobile-optimized.',
  },
];

export function WebInsightsRecommendations() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
            Insights & Recommendations
          </h3>
        </div>

        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
          <Sparkles className="w-2.5 h-2.5" />
          <span>Powered by AI</span>
        </span>
      </div>

      {/* 3 Insight Cards */}
      <div className="space-y-2 flex-1">
        {INSIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="group flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200/90 hover:bg-slate-50/70 transition-all cursor-pointer"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item.iconBg}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-[12px] font-bold text-slate-900 leading-tight">
                  {item.title}
                </h4>
                <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
