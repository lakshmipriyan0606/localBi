import { Users, Activity, Target, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function Ga4KpiGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Web Sessions</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Users className="h-4 w-4" /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">142,850</span>
            <span className="text-xs font-semibold text-emerald-600">+12.4%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">30-day recorded web visits</p>
        </CardContent>
      </Card>

      <Card className="border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Users</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600"><Activity className="h-4 w-4" /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">98,420</span>
            <span className="text-xs font-semibold text-emerald-600">+8.7%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Unique engaged users</p>
        </CardContent>
      </Card>

      <Card className="border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Engagement Rate</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Target className="h-4 w-4" /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">68.4%</span>
            <span className="text-xs font-semibold text-emerald-600">+3.2%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sessions exceeding 10s or 2+ views</p>
        </CardContent>
      </Card>

      <Card className="border border-slate-200/80 shadow-xs bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Engagement Time</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><Clock className="h-4 w-4" /></div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">1m 48s</span>
            <span className="text-xs font-semibold text-emerald-600">+14s</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Average active user focus</p>
        </CardContent>
      </Card>
    </div>
  );
}
