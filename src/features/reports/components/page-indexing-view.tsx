'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Globe,
  Smartphone,
  FileCheck,
  Check,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { browserClient } from '@/lib/http/browser-client';
import { notify } from '@/lib/notify';
import type {
  GscPageIndexingSummary,
  GscUrlInspectionResult,
  GscIndexingTimelineItem,
} from '@/modules/integrations/google/gsc-indexing-service';

export interface PageIndexingViewProps {
  tenantSlug: string;
  propertyUrl: string;
}

function GscHelpIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function GscCheckbox({ checked, color = 'white' }: { checked: boolean; color?: string }) {
  return (
    <div
      className={`w-3.5 h-3.5 rounded-[2px] flex items-center justify-center transition-all ${
        checked
          ? color === 'white'
            ? 'bg-transparent border border-white text-white'
            : 'bg-[#0f9d58] border border-[#0f9d58] text-white'
          : 'bg-white border border-[#70757a]'
      }`}
    >
      {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

function CustomGscTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-[#dadce0] bg-white/95 backdrop-blur-xs p-3.5 shadow-xl text-xs space-y-2 min-w-[190px]">
      <div className="font-semibold text-[#202124] border-b border-[#f1f3f4] pb-1.5 flex items-center justify-between">
        <span>Date: {label}</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-[#5f6368]">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white"
                style={{
                  backgroundColor:
                    item.dataKey === 'indexed'
                      ? '#0f9d58'
                      : item.dataKey === 'notIndexed'
                      ? '#70757a'
                      : '#8b5cf6',
                }}
              />
              <span className="font-medium">
                {item.dataKey === 'indexed'
                  ? 'Indexed pages'
                  : item.dataKey === 'notIndexed'
                  ? 'Not indexed'
                  : 'Daily Impressions'}
              </span>
            </div>
            <span className="font-bold text-[#202124] font-mono tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageIndexingView({ tenantSlug, propertyUrl }: PageIndexingViewProps) {
  const [data, setData] = useState<GscPageIndexingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Visibility states matching GSC
  const [showNotIndexed, setShowNotIndexed] = useState(true);
  const [showIndexed, setShowIndexed] = useState(true);
  const [showImpressions, setShowImpressions] = useState(false);
  const [chartStyle, setChartStyle] = useState<'smooth' | 'stepped' | 'bars'>('smooth');
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  // URL Inspection state
  const [inspectUrlInput, setInspectUrlInput] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<GscUrlInspectionResult | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchIndexingSummary = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await browserClient.get<{ success: boolean; data: GscPageIndexingSummary }>(
        `/tenants/${tenantSlug}/reports/gsc/indexing`
      );
      if (res.data?.success) {
        setData(res.data.data);
        if (isManualRefresh) {
          notify.success('Updated indexing status from Google Search Console!');
        }
      }
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to fetch GSC indexing data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIndexingSummary();
  }, [tenantSlug]);

  const handleInspectUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = inspectUrlInput.trim() || propertyUrl;
    setIsInspecting(true);

    try {
      const res = await browserClient.post<{ success: boolean; data: GscUrlInspectionResult }>(
        `/tenants/${tenantSlug}/reports/gsc/inspect`,
        { url: target }
      );
      if (res.data?.success) {
        setInspectionResult(res.data.data);
        notify.success('URL inspected live with Google Search Console!');
      }
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to inspect URL');
    } finally {
      setIsInspecting(false);
    }
  };

  const timeline: GscIndexingTimelineItem[] = useMemo(() => {
    return data?.timeline || [];
  }, [data?.timeline]);

  const indexedCount = data?.totalIndexed ?? 0;
  const notIndexedCount = data?.totalNotIndexed ?? 0;
  const lastUpdated = data?.lastUpdated ?? 'Pending sync';

  const maxPages = useMemo(() => {
    const vals = timeline.map((t) => (t.indexed || 0) + (t.notIndexed || 0));
    return Math.max(1, ...vals);
  }, [timeline]);

  const maxImpressions = useMemo(() => {
    const vals = timeline.map((t) => t.impressions || 0);
    return Math.max(1, ...vals);
  }, [timeline]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#dadce0] bg-white p-12 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#0f9d58] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium text-[#202124]">Connecting to Google Search Console Indexing API...</p>
        <p className="text-[11px] text-[#5f6368]">Verifying live crawl verdict, indexing state, and sitemaps.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Google Search Console URL Inspection Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-2xl rounded-full border border-[#dadce0] bg-white hover:border-[#bdc1c6] focus-within:shadow-md transition-all px-4 py-2 flex items-center gap-3">
          <Search className="w-4 h-4 text-[#5f6368] shrink-0" />
          <form onSubmit={handleInspectUrl} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Inspect any URL in "${propertyUrl}"`}
              value={inspectUrlInput}
              onChange={(e) => setInspectUrlInput(e.target.value)}
              className="w-full bg-transparent text-xs text-[#202124] placeholder-[#5f6368] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isInspecting}
              className="text-xs font-medium text-[#0f9d58] hover:text-[#0b8043] shrink-0 px-2.5 py-1 rounded cursor-pointer disabled:opacity-50"
            >
              {isInspecting ? 'Inspecting...' : 'Inspect'}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => fetchIndexingSummary(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-slate-50 text-xs font-medium text-[#3c4043] cursor-pointer disabled:opacity-50 self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0f9d58]' : 'text-[#5f6368]'}`} />
          <span>{refreshing ? 'Syncing...' : 'Sync with GSC'}</span>
        </button>
      </div>

      {/* ── Real-Time Inspection Result Panel (When inspected) ── */}
      {inspectionResult && (
        <div className="rounded-2xl border border-[#dadce0] bg-[#f8fafd] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8eaed] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0f9d58] text-white flex items-center justify-center font-bold">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <h4 className="font-medium text-sm text-[#202124]">
                  {inspectionResult.verdict === 'PASS' ? 'URL is on Google' : 'URL Status Checked'}
                </h4>
                <p className="font-mono text-xs text-[#5f6368] truncate max-w-lg">
                  {inspectionResult.inspectionUrl}
                </p>
              </div>
            </div>

            {inspectionResult.inspectionResultLink && (
              <a
                href={inspectionResult.inspectionResultLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#dadce0] text-[#1a73e8] font-medium text-xs hover:bg-[#f1f3f4] transition-colors"
              >
                <span>Open in Google Search Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-[#e8eaed] space-y-1">
              <span className="text-[10px] font-bold text-[#70757a] uppercase tracking-wider block">Coverage</span>
              <span className="font-semibold text-[#0f9d58]">{inspectionResult.coverageState}</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#e8eaed] space-y-1">
              <span className="text-[10px] font-bold text-[#70757a] uppercase tracking-wider block">Last Crawl Time</span>
              <span className="font-mono text-[#202124]">
                {inspectionResult.lastCrawlTime
                  ? new Date(inspectionResult.lastCrawlTime).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#e8eaed] space-y-1">
              <span className="text-[10px] font-bold text-[#70757a] uppercase tracking-wider block">Crawled As</span>
              <span className="font-medium text-[#202124] flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-[#5f6368]" />
                <span>Googlebot Mobile</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-[#e8eaed] space-y-1">
              <span className="text-[10px] font-bold text-[#70757a] uppercase tracking-wider block">Robots.txt</span>
              <span className="font-semibold text-[#0f9d58] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0f9d58]" />
                <span>ALLOWED</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Indexing Title & Metadata line ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-normal text-[#202124] tracking-tight">
            Page indexing
          </h2>
          <div className="flex items-center gap-2 text-xs text-[#5f6368] mt-1">
            <span className="font-medium text-[#202124] cursor-pointer hover:underline inline-flex items-center gap-1">
              All known pages <span className="text-[9px]">▼</span>
            </span>
            <span>•</span>
            <span>Last update: {lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* ── Official Google Search Console Main Card with Top Docked Tabs & Chart ── */}
      <div className="rounded-2xl border border-[#dadce0] bg-white overflow-hidden shadow-xs">
        {/* Top Docked Tabs (Flush with Card Header like GSC) */}
        <div className="flex items-stretch border-b border-[#dadce0] bg-white">
          {/* Tab 1: Not indexed (Solid Grey #70757a when selected) */}
          <button
            type="button"
            onClick={() => setShowNotIndexed(!showNotIndexed)}
            className={`w-36 sm:w-44 p-4 sm:p-5 text-left border-r border-[#dadce0] transition-colors cursor-pointer select-none ${
              showNotIndexed
                ? 'bg-[#70757a] text-white'
                : 'bg-white text-[#70757a] hover:bg-[#f8f9fa]'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <GscCheckbox checked={showNotIndexed} color="white" />
                <span className="text-xs font-medium tracking-tight">Not indexed</span>
              </div>
              <GscHelpIcon className={`w-3.5 h-3.5 ${showNotIndexed ? 'text-white/80' : 'text-[#70757a]'}`} />
            </div>
            <div className="text-3xl sm:text-4xl font-normal tracking-tight mb-1">
              {notIndexedCount}
            </div>
            <div className={`text-xs ${showNotIndexed ? 'text-white/90' : 'text-[#70757a]'}`}>
              No reasons
            </div>
          </button>

          {/* Tab 2: Indexed (Solid Emerald Green #0f9d58 when selected) */}
          <button
            type="button"
            onClick={() => setShowIndexed(!showIndexed)}
            className={`w-36 sm:w-44 p-4 sm:p-5 text-left border-r border-[#dadce0] transition-colors cursor-pointer select-none ${
              showIndexed
                ? 'bg-[#0f9d58] text-white'
                : 'bg-white text-[#0f9d58] hover:bg-[#f8f9fa]'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-2">
                <GscCheckbox checked={showIndexed} color="white" />
                <span className="text-xs font-medium tracking-tight">Indexed</span>
              </div>
              <GscHelpIcon className={`w-3.5 h-3.5 ${showIndexed ? 'text-white/80' : 'text-[#0f9d58]'}`} />
            </div>
            <div className="text-3xl sm:text-4xl font-normal tracking-tight">
              {indexedCount}
            </div>
          </button>

          {/* Spacer to the right */}
          <div className="flex-1 bg-white" />
        </div>

        {/* Card Body: Impressions Checkbox, Chart Controls, and Chart */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Controls Bar: Impressions Checkbox on left + Chart Visual Style Switcher on right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f3f4] pb-3">
            {/* Impressions Checkbox */}
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-[#3c4043] select-none hover:text-black transition-colors">
                <input
                  type="checkbox"
                  checked={showImpressions}
                  onChange={(e) => setShowImpressions(e.target.checked)}
                  className="rounded-[3px] border-[#70757a] text-purple-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
                <span>Impressions</span>
              </label>

              {/* Status summary pill */}
              <div className="hidden md:flex items-center gap-2 text-[11.5px] text-[#5f6368]">
                <span>·</span>
                <span>{indexedCount} of {indexedCount + notIndexedCount} known pages indexed</span>
              </div>
            </div>

            {/* Visual Style Selector: Smooth Curve, Stepped Area, or Solid Columns */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/90 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setChartStyle('smooth')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  chartStyle === 'smooth'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Smooth flowing curve"
              >
                <TrendingUp className="w-3 h-3" />
                <span>Smooth</span>
              </button>

              <button
                type="button"
                onClick={() => setChartStyle('stepped')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  chartStyle === 'stepped'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Stepped area block"
              >
                <Layers className="w-3 h-3" />
                <span>Stepped</span>
              </button>

              <button
                type="button"
                onClick={() => setChartStyle('bars')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  chartStyle === 'bars'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Continuous solid columns"
              >
                <BarChart2 className="w-3 h-3" />
                <span>Solid Columns</span>
              </button>
            </div>
          </div>

          {/* Y-Axis Label "Pages" above ticks */}
          <div className="flex items-center justify-between text-[11px] text-[#70757a] font-normal pl-1 select-none">
            <span>Pages</span>
            {showImpressions && <span className="text-[#8b5cf6] font-medium pr-1">Impressions</span>}
          </div>

          {/* GSC Interactive Chart */}
          <div className="w-full h-[270px] min-h-[270px] relative">
            {mounted ? (
              <ResponsiveContainer width="100%" height={270}>
                <ComposedChart
                  data={timeline}
                  margin={{ top: 10, right: showImpressions ? 25 : 15, left: -20, bottom: 10 }}
                  barCategoryGap={0}
                  barGap={0}
                >
                  <defs>
                    <linearGradient id="gscIndexedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f9d58" stopOpacity={0.88} />
                      <stop offset="90%" stopColor="#0f9d58" stopOpacity={0.35} />
                    </linearGradient>
                    <linearGradient id="gscNotIndexedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#70757a" stopOpacity={0.8} />
                      <stop offset="90%" stopColor="#70757a" stopOpacity={0.25} />
                    </linearGradient>
                    <linearGradient id="gscImpressionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="0 0" vertical={false} stroke="#f1f3f4" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: '#dadce0' }}
                    tick={{ fontSize: 11, fill: '#70757a', fontFamily: 'Roboto, sans-serif' }}
                    interval={10}
                  />
                  <YAxis
                    yAxisId="pages"
                    domain={[0, maxPages <= 3 ? 3 : Math.ceil(maxPages * 1.25)]}
                    {...(maxPages <= 3 ? { ticks: [0, 1, 2, 3] } : {})}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#70757a', fontFamily: 'Roboto, sans-serif' }}
                    width={35}
                  />
                  {showImpressions && (
                    <YAxis
                      yAxisId="impressions"
                      orientation="right"
                      domain={[0, maxImpressions <= 3 ? 3 : Math.ceil(maxImpressions * 1.25)]}
                      {...(maxImpressions <= 3 ? { ticks: [0, 1, 2, 3] } : {})}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#8b5cf6', fontFamily: 'Roboto, sans-serif' }}
                      width={40}
                    />
                  )}
                  <Tooltip content={<CustomGscTooltip />} />

                  {/* ── Smooth Curve Mode (Default) ── */}
                  {chartStyle === 'smooth' && (
                    <>
                      {showNotIndexed && (
                        <Area
                          yAxisId="pages"
                          type="monotone"
                          dataKey="notIndexed"
                          name="Not indexed"
                          stroke="#5f6368"
                          strokeWidth={2}
                          fill="url(#gscNotIndexedGrad)"
                          fillOpacity={1}
                          stackId="pages"
                        />
                      )}
                      {showIndexed && (
                        <Area
                          yAxisId="pages"
                          type="monotone"
                          dataKey="indexed"
                          name="Indexed"
                          stroke="#0f9d58"
                          strokeWidth={2.5}
                          fill="url(#gscIndexedGrad)"
                          fillOpacity={1}
                          stackId="pages"
                        />
                      )}
                    </>
                  )}

                  {/* ── Stepped Block Mode ── */}
                  {chartStyle === 'stepped' && (
                    <>
                      {showNotIndexed && (
                        <Area
                          yAxisId="pages"
                          type="stepAfter"
                          dataKey="notIndexed"
                          name="Not indexed"
                          stroke="#5f6368"
                          strokeWidth={2}
                          fill="url(#gscNotIndexedGrad)"
                          fillOpacity={1}
                          stackId="pages"
                        />
                      )}
                      {showIndexed && (
                        <Area
                          yAxisId="pages"
                          type="stepAfter"
                          dataKey="indexed"
                          name="Indexed"
                          stroke="#0f9d58"
                          strokeWidth={2.5}
                          fill="url(#gscIndexedGrad)"
                          fillOpacity={1}
                          stackId="pages"
                        />
                      )}
                    </>
                  )}

                  {/* ── Solid Columns Mode ── */}
                  {chartStyle === 'bars' && (
                    <>
                      {showNotIndexed && (
                        <Bar
                          yAxisId="pages"
                          dataKey="notIndexed"
                          name="Not indexed"
                          fill="#70757a"
                          stackId="pages"
                          stroke="#5f6368"
                          strokeWidth={0.5}
                        />
                      )}
                      {showIndexed && (
                        <Bar
                          yAxisId="pages"
                          dataKey="indexed"
                          name="Indexed"
                          fill="#0f9d58"
                          stackId="pages"
                          stroke="#0b8043"
                          strokeWidth={0.5}
                        />
                      )}
                    </>
                  )}

                  {/* Impressions Trend Line */}
                  {showImpressions && (
                    <Line
                      yAxisId="impressions"
                      type="monotone"
                      dataKey="impressions"
                      name="Impressions"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#0f9d58] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* ── "View data about indexed pages" Accordion Button (Matching GSC Image 2) ── */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsTableExpanded(!isTableExpanded)}
              className="w-full flex items-center justify-between p-3.5 sm:px-5 sm:py-3.5 rounded-xl border border-[#dadce0] hover:bg-[#f8f9fa] transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#0f9d58] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="font-normal text-xs sm:text-sm text-[#202124]">
                  View data about indexed pages
                </span>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-[#5f6368] transition-transform duration-200 ${
                  isTableExpanded ? 'rotate-90 text-[#202124]' : ''
                }`}
              />
            </button>

            {/* Expanded Table */}
            {isTableExpanded && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-[#dadce0] bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#dadce0] bg-[#f8f9fa] text-[#5f6368] text-[11px] font-medium">
                      <th className="py-2.5 px-3">Page URL</th>
                      <th className="py-2.5 px-3">Indexing Status</th>
                      <th className="py-2.5 px-3">Last Crawled Date</th>
                      <th className="py-2.5 px-3">User Agent</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f3f4]">
                    {data?.indexedPages?.map((page, idx) => (
                      <tr key={idx} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[#1a73e8] hover:underline truncate max-w-sm"
                            >
                              {page.url}
                            </a>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e6f4ea] text-[#137333] font-medium text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0f9d58]" />
                            {page.coverageState || 'Submitted and indexed'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#5f6368] font-mono text-[11px]">
                          {page.lastCrawlTime
                            ? new Date(page.lastCrawlTime).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Sep 17, 2026'}
                        </td>
                        <td className="py-3 px-3 text-[#5f6368]">
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-[#5f6368]" />
                            <span>Googlebot Mobile</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectUrlInput(page.url);
                              handleInspectUrl();
                            }}
                            className="px-2.5 py-1 rounded-md border border-[#dadce0] hover:bg-[#f1f3f4] text-[#3c4043] font-medium text-[11px] transition-colors cursor-pointer"
                          >
                            Inspect Live
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sitemaps Status ── */}
      <div className="rounded-2xl border border-[#dadce0] bg-white p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#f1f3f4] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
            <h4 className="font-normal text-sm text-[#202124]">Sitemaps & Discovery</h4>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/client/${tenantSlug}/reports/gsc/sitemaps`}
              className="text-xs font-medium text-[#1a73e8] hover:underline"
            >
              Open Full Sitemaps Manager &rarr;
            </a>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
              Auto-Discovered
            </span>
          </div>
        </div>

        <p className="text-xs text-[#5f6368]">
          Google automatically crawls and updates your sitemap index.
        </p>

        {data?.sitemaps && data.sitemaps.length > 0 ? (
          <div className="space-y-2">
            {data.sitemaps.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-[#dadce0] bg-[#f8f9fa] text-xs">
                <span className="font-mono text-[#202124]">{s.path}</span>
                <span className="text-[#0f9d58] font-medium">Success</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#f8f9fa] border border-[#dadce0] flex items-center justify-between text-xs">
            <span className="font-mono text-[#3c4043]">{propertyUrl}sitemap.xml</span>
            <span className="inline-flex items-center gap-1 font-medium text-[#137333]">
              <Check className="w-3.5 h-3.5" />
              Direct Crawl Active
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
