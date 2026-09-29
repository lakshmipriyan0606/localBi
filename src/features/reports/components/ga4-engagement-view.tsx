'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/cn';
import { ChartTooltipFrame } from '@/components/charts';
import type { Ga4RealPropertyData } from '@/modules/analytics/ga4-service';

export interface Ga4EngagementViewProps {
  tenantSlug: string;
  brandName?: string | undefined;
  locationName?: string | undefined;
  ga4RealData: Ga4RealPropertyData;
}

const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: 365 },
] as const;

export function Ga4EngagementView({
  tenantSlug,
  brandName: _brandName = 'All Brands',
  locationName: _locationName = 'All locations',
  ga4RealData,
}: Ga4EngagementViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [metricTab, setMetricTab] = useState<'activeUsers' | 'newUsers'>('activeUsers');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const daysParam = searchParams.get('days');
  const initialDateRange = DATE_RANGE_OPTIONS.find(o => String(o.days) === daysParam)?.label || 'Last 30 days';
  const [selectedDateRange, setSelectedDateRange] = useState<string>(initialDateRange);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const daysParam = searchParams.get('days');
    const matched = DATE_RANGE_OPTIONS.find((o) => String(o.days) === daysParam);
    if (matched && matched.label !== selectedDateRange) {
      setSelectedDateRange(matched.label);
    }
  }, [searchParams, selectedDateRange]);

  const activeUsersCount = ga4RealData?.activeUsers || 0;
  const newUsersCount = ga4RealData?.newUsers || 0;

  const rawTrend = useMemo(() => {
    return ga4RealData?.trend || [];
  }, [ga4RealData]);

  const rawRetention = useMemo(() => {
    return ga4RealData?.retention || [];
  }, [ga4RealData]);

  const displayChannels = useMemo(() => {
    return ga4RealData?.channels || [];
  }, [ga4RealData]);

  const maxChannelUsers = Math.max(1, ...displayChannels.map((c) => c.newUsers || 0));

  const displayPages = useMemo(() => {
    return ga4RealData?.pages || [];
  }, [ga4RealData]);

  // Active / New Users timeseries
  const userTimeseriesData = useMemo(() => {
    return rawTrend.map((t) => {
      const parts = t.date.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = parseInt(parts[1] || '1', 10) - 1;
      const d = parseInt(parts[2] || '1', 10);
      const val = metricTab === 'activeUsers' ? t.activeUsers : t.newUsers;
      return {
        date: `${d < 10 ? '0' + d : d} ${monthNames[m]}`,
        rawDate: t.date,
        current: val,
      };
    });
  }, [rawTrend, metricTab]);

  // Cohort retention curves
  const retentionData = useMemo(() => {
    return rawRetention.map((r) => {
      const parts = r.date.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = parseInt(parts[1] || '1', 10) - 1;
      const d = parseInt(parts[2] || '1', 10);
      return {
        date: `${d < 10 ? '0' + d : d} ${monthNames[m]}`,
        retentionRate: r.retentionRate,
        benchmarkRate: r.benchmarkRetentionRate,
        durationSeconds: r.engagementTimeSeconds,
        benchmarkDurationSeconds: r.benchmarkEngagementTimeSeconds,
      };
    });
  }, [rawRetention]);

  const platformData = (ga4RealData?.devices || []).map((d) => ({
    name: d.device,
    value: d.percentage,
    color: d.device === 'Mobile' ? '#818CF8' : d.device === 'Tablet' ? '#CBD5E1' : '#3B82F6',
  }));

  // Daily engagement dwell curve
  const dwellData = ga4RealData.engagementOverview?.userEngagementDaily || [];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12 font-sans">
      {/* ── Breadcrumb & Title Bar ── */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
            <span>Analytics</span>
            <span>/</span>
            <span>Google Analytics</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold">User engagement &amp; retention</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              View user engagement &amp; retention overview
            </h1>
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              ✓
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {ga4RealData?.isConfigured ? (
              <>
                Property: <span className="font-semibold text-slate-700">{ga4RealData.propertyName || ga4RealData.propertyId}</span> • {ga4RealData.dateRange || selectedDateRange}
              </>
            ) : (
              'No Google Analytics 4 property connected'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Date Range Dropdown */}
          <div className="relative" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => setDateDropdownOpen((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white text-xs font-semibold shadow-2xs transition-all cursor-pointer",
                dateDropdownOpen
                  ? "border-[#3B49DF] ring-2 ring-indigo-500/20 text-[#3B49DF]"
                  : "border-slate-200 hover:border-slate-300 text-slate-700"
              )}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedDateRange}</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                  dateDropdownOpen && "rotate-180 text-indigo-600"
                )}
              />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Range
                </div>
                <div className="space-y-0.5">
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        setSelectedDateRange(opt.label);
                        setDateDropdownOpen(false);
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('days', String(opt.days));
                        router.push(`${pathname}?${params.toString()}`);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left",
                        selectedDateRange === opt.label
                          ? "bg-indigo-50 text-[#3B49DF] font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <span>{opt.label}</span>
                      {selectedDateRange === opt.label && (
                        <Check className="w-3.5 h-3.5 text-[#3B49DF]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Guards ── */}
      {(!ga4RealData?.isConfigured || ga4RealData?.status === 'not_configured') && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <span className="font-bold text-sm">GA4</span>
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-200 text-amber-900">
                  GA4_NOT_CONFIGURED
                </span>
                <h3 className="text-base font-bold text-amber-950">
                  Google Analytics 4 Not Configured
                </h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                No active GA4 property has been mapped to this tenant. To view real user engagement curves, retention metrics, and active session cohorts, link your Google Analytics 4 property under Integrations.
              </p>
            </div>
            <Link
              href={`/client/${tenantSlug}/settings/integrations`}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-center"
            >
              Configure GA4 Mapping →
            </Link>
          </div>
        </div>
      )}

      {ga4RealData?.status === 'permission_required' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="rounded-xl bg-rose-100 p-3 text-rose-700">
              <span className="font-bold text-sm">GA4</span>
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-200 text-rose-900">
                  GA4_PERMISSION_REQUIRED
                </span>
                <h3 className="text-base font-bold text-rose-950">
                  Google Analytics Scope Missing
                </h3>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed max-w-2xl">
                The connected Google OAuth account lacks the required Google Analytics read scope. Please re-authorize your connection in Integrations to enable GA4 reporting.
              </p>
            </div>
            <Link
              href={`/client/${tenantSlug}/settings/integrations`}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-center"
            >
              Reconnect Google Account →
            </Link>
          </div>
        </div>
      )}

      {ga4RealData?.status === 'error' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="rounded-xl bg-rose-100 p-3 text-rose-700">
              <span className="font-bold text-sm">GA4</span>
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-200 text-rose-900">
                  {ga4RealData?.code || 'GA4_REPORT_FAILED'}
                </span>
                <h3 className="text-base font-bold text-rose-950">
                  Google Analytics 4 Report Failed
                </h3>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed max-w-2xl">
                {ga4RealData?.error || 'Failed to retrieve engagement and retention telemetry from Google Analytics Data API.'}
              </p>
            </div>
            <Link
              href={`/client/${tenantSlug}/settings/integrations`}
              className="inline-flex items-center gap-2 text-xs font-bold text-rose-900 bg-white border border-rose-300 hover:bg-rose-50 px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-center"
            >
              Check Property Mapping →
            </Link>
          </div>
        </div>
      )}

      {ga4RealData?.isConfigured && (ga4RealData?.status === 'ready' || ga4RealData?.status === 'empty') && (
        <>
          {ga4RealData?.status === 'empty' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 shadow-2xs">
              <p className="text-xs text-blue-900">
                <strong>Real Zero Data:</strong> Google Analytics Data API returned a successful report with zero users/engagement for property <strong>{ga4RealData.propertyName || ga4RealData.propertyId}</strong> in period {ga4RealData.dateRange || selectedDateRange}.
              </p>
            </div>
          )}

          {/* ── TOP ROW: 4 Core GA4 Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Active users / New users curve */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMetricTab('activeUsers')}
                      className={cn(
                        "text-xs font-bold transition-colors cursor-pointer",
                        metricTab === 'activeUsers' ? "text-[#2563EB] border-b-2 border-[#2563EB] pb-1" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Active users
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetricTab('newUsers')}
                      className={cn(
                        "text-xs font-bold transition-colors cursor-pointer",
                        metricTab === 'newUsers' ? "text-[#2563EB] border-b-2 border-[#2563EB] pb-1" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      New users
                    </button>
                  </div>
                  <span className="text-xl font-black text-slate-900">
                    {metricTab === 'activeUsers' ? activeUsersCount : newUsersCount}
                  </span>
                </div>

                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userTimeseriesData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <ChartTooltipFrame
                              title={String(label)}
                              items={[
                                { label: metricTab === 'activeUsers' ? 'Active users' : 'New users', value: payload[0]?.value as number, color: '#2563EB' },
                              ]}
                            />
                          );
                        }}
                      />
                      <Line type="monotone" dataKey="current" stroke="#2563EB" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-[#2563EB]" /> {ga4RealData?.dateRange || selectedDateRange}
                </span>
              </div>
            </div>

        {/* Card 2: New users by First user primary channel group */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 leading-snug">
                New users by First user primary channel group
              </h3>
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">✓</span>
            </div>

            <div className="space-y-2.5 pt-1">
              {displayChannels.map((c) => (
                <div key={c.channel} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{c.channel}</span>
                    <span className="font-mono font-bold text-slate-900">{c.newUsers}</span>
                  </div>
                  <div className="h-5 w-full bg-slate-50 rounded overflow-hidden border border-slate-100">
                    <div
                      className="h-full bg-[#2563EB] rounded flex items-center justify-end pr-1.5 text-[10px] font-bold text-white font-mono"
                      style={{ width: `${Math.max(5, (c.newUsers / maxChannelUsers) * 100)}%` }}
                    >
                      {c.newUsers}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-2 border-t border-slate-100 pt-1">
              <span>0</span>
              <span>{Math.round(maxChannelUsers * 0.2)}</span>
              <span>{Math.round(maxChannelUsers * 0.4)}</span>
              <span>{Math.round(maxChannelUsers * 0.6)}</span>
              <span>{Math.round(maxChannelUsers * 0.8)}</span>
              <span>{maxChannelUsers}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2 text-right">
            <Link
              href={`/client/${tenantSlug}/reports/ga4`}
              className="text-xs font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1"
            >
              <span>View user acquisition</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Card 3: Views by Page title and screen class */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900">
                Views by Page title and screen class
              </h3>
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">✓</span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex justify-between">
                <span>Page title</span>
                <span>Views</span>
              </div>
              {displayPages.map((p) => (
                <div key={p.pageTitle} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="font-bold text-xs text-slate-900 truncate">{p.pageTitle}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.url}</p>
                  </div>
                  <span className="text-lg font-black text-slate-900 font-mono">{p.views}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2 text-right">
            <Link
              href={`/client/${tenantSlug}/reports/ga4/pages`}
              className="text-xs font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1"
            >
              <span>View pages and screens</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Card 4: New users by Platform */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900">
                New users by Platform
              </h3>
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">✓</span>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={platformData} innerRadius={0} outerRadius={50} dataKey="value" stroke="none">
                      <Cell fill="#93C5FD" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {platformData.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">
                    {platformData[0]?.name}
                  </div>
                )}
              </div>
              <div className="mt-2 text-center">
                {platformData.length > 0 ? (
                  <>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{platformData[0]?.name}</span>
                    <div className="text-xl font-black text-slate-900">{platformData[0]?.value.toFixed(1)}%</div>
                  </>
                ) : (
                  <div className="text-sm font-semibold text-slate-400 mt-2">No data</div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2 text-right">
            <span className="text-xs font-semibold text-slate-400">View platforms →</span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: 3 Cohort & Engagement Curves (Screenshot 3) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 5: User retention by cohort */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900">User retention by cohort</h3>
                <p className="text-[10px] text-slate-400">Daily cohort retention %</p>
              </div>
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">✓</span>
            </div>

            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retentionData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 80]} ticks={[0, 20, 40, 60, 80]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <ChartTooltipFrame
                          title={String(label)}
                          items={[
                            { label: 'Current cohort', value: `${payload[0]?.value}%`, color: '#2563EB' },
                            { label: 'Benchmark', value: `${payload[1]?.value}%`, color: '#10B981' },
                          ]}
                        />
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="retentionRate" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="benchmarkRate" stroke="#10B981" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-2">
            {retentionData.length > 0 ? (
              <span className="font-semibold text-emerald-600">
                Peak: {Math.max(...retentionData.map((d) => d.retentionRate)).toFixed(1)}%
              </span>
            ) : (
              <span>—</span>
            )}
            <span className="text-slate-400">0.0% to 100.0%</span>
          </div>
        </div>

        {/* Card 6: User engagement by cohort */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900">User engagement by cohort</h3>
                <p className="text-[10px] text-slate-400">Session duration by cohort (seconds)</p>
              </div>
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">✓</span>
            </div>

            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retentionData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 15]} ticks={[0, 5, 10, 15]} tickFormatter={(v) => `${v}s`} tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <ChartTooltipFrame
                          title={String(label)}
                          items={[
                            { label: 'Current duration', value: `${payload[0]?.value}s`, color: '#2563EB' },
                            { label: 'Benchmark', value: `${payload[1]?.value}s`, color: '#10B981' },
                          ]}
                        />
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="durationSeconds" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="benchmarkDurationSeconds" stroke="#10B981" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-2">
            {retentionData.length > 0 ? (
              <span className="font-semibold text-indigo-600">
                Peak: {Math.max(...retentionData.map((d) => d.durationSeconds)).toFixed(0)}s
              </span>
            ) : (
              <span>—</span>
            )}
            <span className="text-slate-400">Dynamic Scale</span>
          </div>
        </div>

        {/* Card 7: User engagement (Days) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900">User engagement</h3>
                <p className="text-[10px] text-slate-400">{ga4RealData?.dateRange || selectedDateRange}</p>
              </div>
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">✓</span>
            </div>

            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dwellData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `${v}s`} tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <ChartTooltipFrame
                          title={String(label)}
                          items={[
                            { label: 'Dwell time', value: `${payload[0]?.value}s`, color: '#2563EB' },
                          ]}
                        />
                      );
                    }}
                  />
                  <Line type="stepAfter" dataKey="seconds" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-2">
            {dwellData.length >= 2 ? (
              <span>Day 0: {dwellData[0]?.seconds}s • Day 7: {dwellData[1]?.seconds}s</span>
            ) : (
              <span>—</span>
            )}
            <span className="text-slate-400">Dynamic Scale</span>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
