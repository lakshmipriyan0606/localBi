'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  MousePointerClick,
  Eye,
  Users,
  Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/shared/lib/formatters';

export interface Ga4TrendPoint {
  date: string;
  clicks: number;
  impressions: number;
  sessions: number;
}

export interface Ga4TrendChartProps {
  data: Ga4TrendPoint[];
  hasRealData?: boolean;
}

export function Ga4TrendChart({ data = [], hasRealData: _hasRealData = false }: Ga4TrendChartProps) {
  const [mounted, setMounted] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'all' | 'sessions' | 'clicks' | 'impressions'>('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  const formattedData = useMemo(() => {
    if (data.length === 0) {
      const now = new Date();
      return Array.from({ length: 14 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (13 - i));
        return {
          date: d.toISOString().slice(0, 10),
          rawDate: d.toISOString().slice(0, 10),
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          clicks: 0,
          impressions: 0,
          sessions: 0,
        };
      });
    }

    return data.map((d) => {
      const parsed = new Date(d.date);
      const label = isNaN(parsed.getTime())
        ? d.date
        : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        ...d,
        rawDate: d.date,
        label,
      };
    });
  }, [data]);

  const totalClicks = useMemo(() => formattedData.reduce((acc, d) => acc + d.clicks, 0), [formattedData]);
  const totalImpressions = useMemo(() => formattedData.reduce((acc, d) => acc + d.impressions, 0), [formattedData]);
  const totalSessions = useMemo(() => formattedData.reduce((acc, d) => acc + d.sessions, 0), [formattedData]);
  const peakClicks = useMemo(() => Math.max(...formattedData.map((d) => d.clicks), 0), [formattedData]);
  const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <Card className="border border-slate-200/90 shadow-md bg-white rounded-2xl overflow-hidden hover:border-slate-300 transition-all duration-300">
      {/* Header with gradient strip */}
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 p-5 sm:p-6 pb-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                  Visitor & Search Traffic Velocity
                </CardTitle>
                <Badge variant="outline" className="text-[11px] py-0.5 px-2.5 text-indigo-700 bg-indigo-50 border-indigo-200/80 font-bold shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mr-1 animate-pulse" />
                  Live Sync Active
                </Badge>
                <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 text-[10px] font-mono px-2 py-0.5 shadow-2xs">
                  Daily Grain
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Synchronized timeline comparing organic web visits, Google search impressions, and user click-throughs
              </CardDescription>
            </div>
          </div>

          {/* Interactive Metric Filter Pill Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200/90 text-xs font-semibold self-start lg:self-auto shadow-2xs">
            <button
              onClick={() => setActiveMetric('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMetric === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              All Metrics
            </button>
            <button
              onClick={() => setActiveMetric('sessions')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMetric === 'sessions'
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${activeMetric === 'sessions' ? 'bg-white' : 'bg-indigo-500'}`} />
              Sessions
            </button>
            <button
              onClick={() => setActiveMetric('clicks')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMetric === 'clicks'
                  ? 'bg-cyan-600 text-white shadow-xs font-bold'
                  : 'text-cyan-700 hover:text-cyan-900 hover:bg-cyan-50'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${activeMetric === 'clicks' ? 'bg-white' : 'bg-cyan-500'}`} />
              Clicks
            </button>
            <button
              onClick={() => setActiveMetric('impressions')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMetric === 'impressions'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${activeMetric === 'impressions' ? 'bg-white' : 'bg-purple-500'}`} />
              Impressions
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Metric Summary Strip - 4 High Impact Cards with Gradient Borders */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="group rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-white p-3.5 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sessions</span>
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 group-hover:scale-110 transition-transform">
                <Users className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
              {formatNumber(totalSessions)}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-semibold mt-1">
              <Zap className="h-3 w-3 text-indigo-500" />
              <span>Full period visits</span>
            </div>
          </div>

          <div className="group rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50/50 via-white to-white p-3.5 shadow-2xs hover:shadow-md hover:border-cyan-200 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search Clicks</span>
              <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700 group-hover:scale-110 transition-transform">
                <MousePointerClick className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
              {formatNumber(totalClicks)}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-cyan-700 font-semibold mt-1">
              <span>{overallCtr.toFixed(1)}% Conversion CTR</span>
            </div>
          </div>

          <div className="group rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/50 via-white to-white p-3.5 shadow-2xs hover:shadow-md hover:border-purple-200 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search Impressions</span>
              <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 group-hover:scale-110 transition-transform">
                <Eye className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
              {formatNumber(totalImpressions)}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold mt-1">
              <span>SERP visibility reach</span>
            </div>
          </div>

          <div className="group rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/50 via-white to-white p-3.5 shadow-2xs hover:shadow-md hover:border-amber-200 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peak Velocity</span>
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform">
                <Calendar className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
              {formatNumber(peakClicks)} <span className="text-xs font-normal text-slate-500">/ day</span>
            </p>
            <div className="flex items-center gap-1 text-[11px] text-amber-700 font-semibold mt-1">
              <span>Highest organic spike</span>
            </div>
          </div>
        </div>

        {/* Visual Chart Canvas */}
        <div className="h-[290px] w-full pt-2">
          {!mounted ? (
            <div className="h-full w-full rounded-2xl bg-slate-50 flex items-center justify-center text-xs text-slate-400 border border-slate-100">
              Loading performance telemetry...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  {/* Sessions Gradient (Deep Indigo) */}
                  <linearGradient id="ga4SessionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.45} />
                    <stop offset="70%" stopColor="#6366F1" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#818CF8" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Clicks Gradient (Electric Cyan) */}
                  <linearGradient id="ga4ClicksGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.5} />
                    <stop offset="70%" stopColor="#0891B2" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Impressions Gradient (Vivid Purple) */}
                  <linearGradient id="ga4ImprGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9333EA" stopOpacity={0.35} />
                    <stop offset="70%" stopColor="#A855F7" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#C084FC" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#F1F5F9" />

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />

                {/* Custom Glassmorphic White Tooltip */}
                <Tooltip
                  cursor={{ stroke: '#6366F1', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl p-3.5 text-xs text-slate-800 min-w-[175px]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                          <span className="font-bold text-slate-900">{label}</span>
                          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">TELEMETRY</span>
                        </div>
                        <div className="space-y-1.5">
                          {payload.map((entry: any, i) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-2 text-slate-600 font-medium">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shadow-xs"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.name}:
                              </span>
                              <span className="font-extrabold text-slate-900 font-mono">
                                {formatNumber(entry.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Area Layers with glowing strokes */}
                {(activeMetric === 'all' || activeMetric === 'impressions') && (
                  <Area
                    type="monotone"
                    dataKey="impressions"
                    name="Impressions"
                    stroke="#9333EA"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ga4ImprGrad)"
                    activeDot={{ r: 5, fill: '#9333EA', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                )}

                {(activeMetric === 'all' || activeMetric === 'sessions') && (
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    name="Sessions"
                    stroke="#4F46E5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#ga4SessionsGrad)"
                    activeDot={{ r: 6, fill: '#4F46E5', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                )}

                {(activeMetric === 'all' || activeMetric === 'clicks') && (
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    name="Clicks"
                    stroke="#06B6D4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ga4ClicksGrad)"
                    activeDot={{ r: 5, fill: '#06B6D4', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
