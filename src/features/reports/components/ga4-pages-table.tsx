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
  Globe,
  ExternalLink,
  FileText,
  Inbox,
  Trophy,
  BarChart2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/shared/lib/formatters';

export interface Ga4PageRow {
  url: string;
  sessions: number;
  impressions: number;
  ctr: number;
  position: number;
  share: string;
}

export interface Ga4PagesTableProps {
  pages?: Ga4PageRow[];
  hasRealData?: boolean;
}

export function Ga4PagesTable({ pages = [], hasRealData = false }: Ga4PagesTableProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (pages.length === 0) return [];
    return pages.map((p) => {
      let shortName = p.url;
      try {
        const parsed = new URL(p.url);
        shortName = parsed.pathname === '/' ? 'Home ( / )' : parsed.pathname;
      } catch {
        shortName = p.url;
      }
      return {
        name: shortName,
        fullUrl: p.url,
        sessions: p.sessions,
        impressions: p.impressions,
        ctr: p.ctr,
        position: p.position,
        share: p.share,
      };
    });
  }, [pages]);

  const totalSessions = useMemo(() => pages.reduce((acc, p) => acc + p.sessions, 0), [pages]);
  const totalImpressions = useMemo(() => pages.reduce((acc, p) => acc + p.impressions, 0), [pages]);

  return (
    <Card className="border border-slate-200/90 shadow-md bg-white rounded-2xl overflow-hidden hover:border-slate-300 transition-all duration-300">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50/20 p-5 sm:p-6 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                  Top Landing Pages & Content
                </CardTitle>
                <Badge className="bg-sky-50 text-sky-700 border-sky-200/80 font-bold text-[10px] py-0.5 px-2">
                  {pages.length} Pages Tracked
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Highest-traffic URLs driving customer discovery, engagement, and conversion
              </CardDescription>
            </div>
          </div>

          <div className="text-right self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total URL Traffic</span>
            <span className="text-lg font-black text-slate-900">{formatNumber(totalSessions)} Sessions</span>
          </div>
        </div>
      </CardHeader>

      {pages.length === 0 || (!hasRealData && pages.length === 0) ? (
        <CardContent className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mx-auto shadow-xs">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Landing Pages Recorded</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            As visitors land on your website pages from search engines or direct links, your top URLs will appear here.
          </p>
        </CardContent>
      ) : (
        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Vertical Column Bar Chart Comparing Pages */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/70 via-white to-sky-50/20 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Page Performance Comparison Bar Chart</h4>
                  <p className="text-[11px] text-slate-500">Comparing Web Sessions and Search Impressions by Landing Page</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold self-start sm:self-auto">
                <span className="flex items-center gap-1.5 text-sky-700">
                  <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
                  Sessions ({formatNumber(totalSessions)})
                </span>
                <span className="flex items-center gap-1.5 text-purple-700">
                  <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
                  Impressions ({formatNumber(totalImpressions)})
                </span>
              </div>
            </div>

            {/* Recharts Bar Canvas */}
            <div className="h-[210px] w-full pt-2">
              {!mounted ? (
                <div className="h-full w-full rounded-xl bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                  Loading column chart...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pageSessionsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284C7" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="pageImprGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9333EA" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#C084FC" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length || !payload[0]?.payload) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-xl p-3 text-xs text-slate-800 min-w-[170px]">
                            <p className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1.5 truncate">
                              {data.name}
                            </p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 font-medium">Sessions:</span>
                                <span className="font-mono font-bold text-sky-700">{formatNumber(data.sessions)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 font-medium">Impressions:</span>
                                <span className="font-mono font-bold text-purple-700">{formatNumber(data.impressions)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500 font-medium">CTR Rate:</span>
                                <span className="font-mono font-bold text-emerald-600">{data.ctr.toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="sessions"
                      name="Sessions"
                      fill="url(#pageSessionsGrad)"
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                    />
                    <Bar
                      dataKey="impressions"
                      name="Impressions"
                      fill="url(#pageImprGrad)"
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Landing Page Cards List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tracked URLs & SERP Ranking
            </h4>
            {pages.map((p, idx) => {
              let displayDomain = 'website';
              let displayPath = '/';
              try {
                const parsed = new URL(p.url);
                displayDomain = parsed.hostname.replace(/^www\./, '');
                displayPath = parsed.pathname || '/';
              } catch {
                displayPath = p.url;
              }

              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-4 hover:border-sky-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    {/* URL info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-200/80 group-hover:scale-110 transition-transform shadow-xs flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60 font-mono">
                            {displayDomain}
                          </span>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-slate-900 group-hover:text-sky-600 hover:underline transition-colors truncate block max-w-sm sm:max-w-md"
                            title={p.url}
                          >
                            {displayPath}
                          </a>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-sky-600 transition-colors p-1"
                            title="Open live link in new tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">
                          Full URL: {p.url}
                        </p>
                      </div>
                    </div>

                    {/* Metrics Badges */}
                    <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
                      {/* Sessions & Share */}
                      <div className="text-right px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Sessions</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-extrabold text-slate-900 text-sm">{formatNumber(p.sessions)}</span>
                          <span className="text-[10px] text-sky-700 font-bold bg-sky-100/60 px-1.5 py-0.2 rounded">{p.share}</span>
                        </div>
                      </div>

                      {/* Impressions */}
                      <div className="text-right px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Impressions</span>
                        <span className="font-extrabold text-slate-800 text-sm font-mono">{formatNumber(p.impressions)}</span>
                      </div>

                      {/* CTR Gauge */}
                      <div className="text-right px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/70">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">CTR Rate</span>
                        <span className="font-extrabold text-emerald-700 text-sm font-mono">{p.ctr.toFixed(1)}%</span>
                      </div>

                      {/* Search Position */}
                      <div className="text-right px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/70">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Google Rank</span>
                        <span className="font-extrabold text-amber-800 text-sm font-mono flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5 text-amber-600" />
                          #{p.position.toFixed(1)}
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
