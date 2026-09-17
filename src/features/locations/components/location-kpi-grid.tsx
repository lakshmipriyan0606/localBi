import { PhoneCall, Globe, Navigation } from 'lucide-react';
import { formatNumber } from '@/shared/lib/formatters';

interface LocationKpiGridProps {
  metricsSummary: {
    searchViews: number;
    mapsViews: number;
    totalViews: number;
    callClicks: number;
    websiteClicks: number;
    directionRequests: number;
  };
}

export function LocationKpiGrid({ metricsSummary }: LocationKpiGridProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        30-Day Performance & Consumer Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-medium text-slate-500">Profile Impressions</span>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {formatNumber(metricsSummary.totalViews)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Search: {formatNumber(metricsSummary.searchViews)} · Maps: {formatNumber(metricsSummary.mapsViews)}
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Phone Call Clicks</span>
            <PhoneCall className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {formatNumber(metricsSummary.callClicks)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Taps on profile call button</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Website Link Clicks</span>
            <Globe className="h-4 w-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {formatNumber(metricsSummary.websiteClicks)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Taps on profile website link</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Direction Requests</span>
            <Navigation className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {formatNumber(metricsSummary.directionRequests)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Driving route requests in Maps</p>
        </div>
      </div>
    </div>
  );
}
