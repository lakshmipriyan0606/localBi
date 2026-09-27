'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Search,
  Hash,
  Inbox,
  Trophy,
  MousePointerClick,
  Eye,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/shared/lib/formatters';
import { ChartTooltipFrame } from '@/components/charts';

export interface Ga4QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface Ga4QueriesTableProps {
  queries?: Ga4QueryRow[];
  hasRealData?: boolean;
}

export function Ga4QueriesTable({ queries = [], hasRealData = false }: Ga4QueriesTableProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalClicks = useMemo(() => queries.reduce((acc, q) => acc + q.clicks, 0), [queries]);
  const totalImpressions = useMemo(() => queries.reduce((acc, q) => acc + q.impressions, 0), [queries]);

  const chartData = useMemo(() => {
    if (queries.length === 0) return [];
    return queries.map((q) => ({
      name: q.query,
      clicks: q.clicks,
      impressions: q.impressions,
      ctr: q.ctr,
      position: q.position,
    }));
  }, [queries]);

  return (
    <Card className="border border-slate-200/90 shadow-md bg-white rounded-2xl overflow-hidden hover:border-slate-300 transition-all duration-300">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-purple-50/20 p-5 sm:p-6 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                  Top Search Queries & Keywords
                </CardTitle>
                <Badge className="bg-purple-50 text-purple-700 border-purple-200/80 font-bold text-[10px] py-0.5 px-2">
                  {queries.length} Queries Tracked
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Real customer search queries and search intent powering Google SERP visibility and click discovery
              </CardDescription>
            </div>
          </div>

          <div className="text-right self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Organic Keyword Clicks</span>
            <span className="text-lg font-black text-slate-900">{formatNumber(totalClicks)} Clicks</span>
          </div>
        </div>
      </CardHeader>

      {queries.length === 0 || (!hasRealData && queries.length === 0) ? (
        <CardContent className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mx-auto shadow-xs">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Search Queries Recorded</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            As your website ranks in Google organic search and users query for your brand or services, top keywords will automatically log here.
          </p>
        </CardContent>
      ) : (
        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Horizontal Ranked Bar Chart */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/70 via-white to-purple-50/20 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Keyword Search Volume & Clicks (Horizontal Ranking)</h4>
                  <p className="text-[11px] text-slate-500">Ranking comparison of search queries by user click volume</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold self-start sm:self-auto">
                <span className="flex items-center gap-1.5 text-blue-700">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                  Clicks ({formatNumber(totalClicks)})
                </span>
                <span className="flex items-center gap-1.5 text-purple-700">
                  <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
                  Impressions ({formatNumber(totalImpressions)})
                </span>
              </div>
            </div>

            {/* Recharts Horizontal Bar Canvas */}
            <div className="h-[180px] w-full pt-2">
              {!mounted ? (
                <div className="h-full w-full rounded-xl bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                  Loading keyword ranking chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 30, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="queryClicksGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="queryImprGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#C084FC" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length || !payload[0]?.payload) return null;
                        const data = payload[0].payload;
                        return (
                          <ChartTooltipFrame
                            title={`#${data.name}`}
                            items={[
                              { label: 'Clicks', value: formatNumber(data.clicks), color: '#2563eb' },
                              { label: 'Impressions', value: formatNumber(data.impressions), color: '#7c3aed' },
                              { label: 'CTR Rate', value: `${data.ctr.toFixed(1)}%`, color: '#059669' },
                              { label: 'Rank', value: `#${data.position.toFixed(1)}`, color: '#b45309' },
                            ]}
                          />
                        );
                      }}
                    />
                    <Bar
                      dataKey="clicks"
                      name="Clicks"
                      fill="url(#queryClicksGrad)"
                      radius={[0, 6, 6, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="impressions"
                      name="Impressions"
                      fill="url(#queryImprGrad)"
                      radius={[0, 6, 6, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Detailed Keyword Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Keyword Intent & SERP Rankings
            </h4>
            {queries.map((q, idx) => {
              const isTopTen = q.position <= 10;
              const rankLabel = isTopTen ? 'Page 1 Tier' : q.position <= 20 ? 'Page 2 Top' : 'Page 3+';

              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-4 hover:border-purple-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    {/* Keyword Title & Intent */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200/80 group-hover:scale-110 transition-transform shadow-xs flex-shrink-0">
                        <Hash className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                            {q.query}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
                            <Sparkles className="h-2.5 w-2.5 text-purple-500" />
                            Brand Search Intent
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          High buyer intent organic search term
                        </p>
                      </div>
                    </div>

                    {/* Visual Metric Badges */}
                    <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
                      {/* Clicks */}
                      <div className="text-right px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Clicks</span>
                        <span className="font-extrabold text-slate-900 text-sm font-mono flex items-center gap-1 justify-end">
                          <MousePointerClick className="h-3.5 w-3.5 text-blue-500" />
                          {formatNumber(q.clicks)}
                        </span>
                      </div>

                      {/* Impressions */}
                      <div className="text-right px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Impressions</span>
                        <span className="font-extrabold text-slate-800 text-sm font-mono flex items-center gap-1 justify-end">
                          <Eye className="h-3.5 w-3.5 text-purple-500" />
                          {formatNumber(q.impressions)}
                        </span>
                      </div>

                      {/* CTR */}
                      <div className="text-right px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">CTR Rate</span>
                        <span className="font-extrabold text-emerald-700 text-sm font-mono">{q.ctr.toFixed(1)}%</span>
                      </div>

                      {/* Ranking Position */}
                      <div className="text-right px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/70">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">{rankLabel}</span>
                        <span className="font-extrabold text-amber-800 text-sm font-mono flex items-center gap-1 justify-end">
                          <Trophy className="h-3.5 w-3.5 text-amber-600" />
                          #{q.position.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
