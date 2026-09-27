'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  BarChart,
  Bar,
} from 'recharts';
import {
  Award,
  Globe2,
  Target,
  BarChart2,
  PieChart as PieChartIcon,
  Sparkles,
  Plus,
  Minus,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { DashboardMetricCard } from '@/features/overview/components/dashboard-metric-card';
import { getCountryFlag } from '@/shared/lib/formatters';
import type { DrilldownVariant } from './drilldown-view';

export interface DrilldownVisualAnalyticsProps<T> {
  data: T[] | undefined;
  sourceBadge: 'GSC' | 'GBP';
  title?: string | undefined;
  variant?: DrilldownVariant | undefined;
}

interface ParsedEntity {
  name: string;
  primaryValue: number;
  secondaryValue: number;
  ctr: number;
  ctrPct: number;
  position: number;
  extra?: string | undefined;
  pagePath?: string | undefined;
}



function cleanUrlPath(rawUrl?: string): { path: string; domain: string } {
  if (!rawUrl) return { path: '/', domain: '' };
  try {
    const parsed = new URL(rawUrl);
    return {
      path: (parsed.pathname || '/') + (parsed.search || ''),
      domain: parsed.hostname,
    };
  } catch {
    return { path: rawUrl, domain: '' };
  }
}

export function DrilldownVisualAnalytics<T>({
  data,
  title,
  variant,
}: DrilldownVisualAnalyticsProps<T>) {
  const activeVariant: DrilldownVariant = useMemo(() => {
    if (variant) return variant;
    const lower = (title || '').toLowerCase();
    if (lower.includes('device')) return 'devices';
    if (lower.includes('countr') || lower.includes('geographic') || lower.includes('region')) return 'countries';
    if (lower.includes('quer') || lower.includes('keyword')) return 'queries';
    if (lower.includes('page') || lower.includes('url')) return 'pages';
    return 'overview';
  }, [variant, title]);

  // Interactive Metric Toggle for Top Landing Pages and Sections
  const [pageMetricToggle, setPageMetricToggle] = useState<'clicks' | 'impressions' | 'ctr' | 'position'>('clicks');
  const [sectionMetricToggle, setSectionMetricToggle] = useState<'clicks' | 'impressions' | 'ctr'>('clicks');

  // Interactive Map Zoom
  const [mapZoom, setMapZoom] = useState(1);

  // Parse actual input data
  const parsedData = useMemo((): ParsedEntity[] => {
    if (!data || data.length === 0) return [];

    return data.map((item) => {
      const record = item as Record<string, unknown>;

      const name = String(
        record['locationName'] ??
          record['queryText'] ??
          record['query'] ??
          record['keyword'] ??
          record['countryName'] ??
          record['fullUrl'] ??
          record['pageUrl'] ??
          record['device'] ??
          record['deviceType'] ??
          'Unknown'
      );

      const primaryValue = Number(
        record['totalViews'] ??
          record['clicks'] ??
          record['impressions'] ??
          0
      );

      const secondaryValue = Number(
        record['impressions'] ??
          record['searchViews'] ??
          record['callClicks'] ??
          0
      );

      const rawCtr = Number(record['ctr'] ?? 0);
      const computedCtr = rawCtr <= 1 ? rawCtr * 100 : rawCtr;
      const ctrPct = Number(computedCtr.toFixed(1));
      const position = Number(Number(record['position'] ?? 0).toFixed(1));
      const cityVal = record['city'];
      const countryCodeVal = record['countryCode'];
      const pagePathVal = record['pagePath'];

      const extra = cityVal
        ? String(cityVal)
        : countryCodeVal
        ? String(countryCodeVal)
        : undefined;

      const pagePath = pagePathVal ? String(pagePathVal) : undefined;

      return {
        name,
        primaryValue,
        secondaryValue,
        ctr: ctrPct,
        ctrPct,
        position,
        extra,
        pagePath,
      };
    });
  }, [data]);

  // Aggregate totals
  const summary = useMemo(() => {
    if (parsedData.length === 0) {
      return {
        totalClicks: 0,
        totalImpressions: 0,
        avgCtr: 0,
        avgPosition: 0,
        topItem: null as ParsedEntity | null,
      };
    }

    const totalClicks = parsedData.reduce((acc, it) => acc + it.primaryValue, 0);
    const totalImpressions = parsedData.reduce((acc, it) => acc + it.secondaryValue, 0);

    let sumPosImp = 0;
    let totalImpForPos = 0;
    parsedData.forEach((it) => {
      if (it.position > 0) {
        const weight = it.secondaryValue > 0 ? it.secondaryValue : 1;
        sumPosImp += it.position * weight;
        totalImpForPos += weight;
      }
    });

    const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(1)) : 0;
    const avgPosition = totalImpForPos > 0 ? Number((sumPosImp / totalImpForPos).toFixed(1)) : 0;

    const sorted = [...parsedData].sort((a, b) => b.primaryValue - a.primaryValue);
    const topItem = sorted[0] ?? null;

    return { totalClicks, totalImpressions, avgCtr, avgPosition, topItem };
  }, [parsedData]);

  // Memoized variant data transforms to avoid heavy recalculations during interactions
  const devicesData = useMemo(() => {
    if (activeVariant !== 'devices') return null;
    const colors = ['#4F46E5', '#3B82F6', '#38BDF8', '#818CF8'];

    const donutData = parsedData.map((d, i) => {
      const name = d.name.charAt(0).toUpperCase() + d.name.slice(1).toLowerCase();
      const sharePct = summary.totalClicks > 0 ? Math.round((d.primaryValue / summary.totalClicks) * 1000) / 10 : 0;
      return {
        name,
        value: d.primaryValue,
        color: colors[i % colors.length],
        share: `${sharePct}%`,
      };
    });

    const deviceBarData = parsedData.map((d) => ({
      device: d.name.charAt(0).toUpperCase() + d.name.slice(1).toLowerCase(),
      clicks: d.primaryValue,
      impressions: d.secondaryValue,
      ctr: d.ctr,
    }));

    return { donutData, deviceBarData };
  }, [activeVariant, parsedData, summary.totalClicks]);

  const countriesData = useMemo(() => {
    if (activeVariant !== 'countries') return null;
    const countriesList = parsedData.map((d, i) => ({
      rank: i + 1,
      name: d.name,
      code: d.extra || d.name.slice(0, 3).toUpperCase(),
      flag: getCountryFlag(d.extra || d.name),
      clicks: d.primaryValue,
      share: summary.totalClicks > 0 ? Math.round((d.primaryValue / summary.totalClicks) * 1000) / 10 : 0,
      pctBar: Math.max(10, Math.round((d.primaryValue / (parsedData[0]?.primaryValue || 1)) * 90)),
    }));

    const barChartData = [...parsedData]
      .sort((a, b) => a.primaryValue - b.primaryValue)
      .slice(-6)
      .map((d) => ({
        country: d.name,
        clicks: d.primaryValue,
      }));

    const bubbleColors = ['#6366F1', '#3B82F6', '#60A5FA', '#93C5FD', '#F59E0B', '#A855F7', '#10B981', '#EC4899'];
    const bubbleData = parsedData.slice(0, 8).map((d, i) => ({
      country: d.name,
      ctr: d.ctr,
      position: d.position,
      clicks: d.primaryValue,
      fill: bubbleColors[i % bubbleColors.length],
    }));

    const topCountry = countriesList[0] || null;

    return { countriesList, barChartData, bubbleData, topCountry };
  }, [activeVariant, parsedData, summary.totalClicks]);

  const pagesData = useMemo(() => {
    if (activeVariant !== 'pages') return null;
    const pagesList = parsedData.map((d, i) => {
      const { path } = cleanUrlPath(d.name);
      return {
        rank: i + 1,
        path,
        clicks: d.primaryValue,
        impressions: d.secondaryValue,
        ctr: d.ctr,
        position: d.position,
        share: summary.totalClicks > 0 ? Math.round((d.primaryValue / summary.totalClicks) * 1000) / 10 : 100,
        pctBar: Math.max(8, Math.round((d.primaryValue / (parsedData[0]?.primaryValue || 1)) * 95)),
      };
    });

    const donutColors = ['#3B82F6', '#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#94A3B8'];
    const top5Pages = parsedData.slice(0, 5);
    const top5Sum = top5Pages.reduce((sum, p) => sum + p.primaryValue, 0);
    const remainderClicks = Math.max(0, summary.totalClicks - top5Sum);

    const pagesDonutData = [
      ...top5Pages.map((d, i) => {
        const { path } = cleanUrlPath(d.name);
        const sharePct = summary.totalClicks > 0 ? Math.round((d.primaryValue / summary.totalClicks) * 1000) / 10 : 0;
        return {
          name: path,
          path,
          value: d.primaryValue,
          share: `${sharePct}%`,
          color: donutColors[i % donutColors.length],
        };
      }),
      ...(remainderClicks > 0
        ? [{
            name: 'Other pages',
            path: 'other',
            value: remainderClicks,
            share: `${Math.round((remainderClicks / (summary.totalClicks || 1)) * 1000) / 10}%`,
            color: '#94A3B8',
          }]
        : []),
    ];

    const scatterColors = ['#4F46E5', '#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'];
    const pageScatterData = parsedData.slice(0, 10).map((d, i) => {
      const { path } = cleanUrlPath(d.name);
      return {
        name: path,
        impressions: d.secondaryValue,
        ctr: d.ctr,
        clicks: d.primaryValue,
        fill: scatterColors[i % scatterColors.length],
      };
    });

    const sectionMap = new Map<string, number>();
    for (const p of parsedData) {
      const { path } = cleanUrlPath(p.name);
      const parts = path.split('/').filter(Boolean);
      const firstPart = parts[0];
      const sec = !firstPart ? 'Home' : firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
      sectionMap.set(sec, (sectionMap.get(sec) || 0) + p.primaryValue);
    }
    const sectionColors = ['#3B82F6', '#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#94A3B8'];
    const sectionData = Array.from(sectionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([section, clicks], idx) => ({
        section,
        clicks,
        share: `${summary.totalClicks > 0 ? Math.round((clicks / summary.totalClicks) * 1000) / 10 : 0}%`,
        color: sectionColors[idx % sectionColors.length],
        barPct: Math.max(8, Math.round((clicks / (parsedData[0]?.primaryValue || 1)) * 90)),
      }));

    const topPageItem = parsedData[0];
    const topPagePath = topPageItem ? cleanUrlPath(topPageItem.name).path : '—';
    const topPageClicks = topPageItem?.primaryValue || 0;
    const topPageShare = summary.totalClicks > 0 ? Math.round((topPageClicks / summary.totalClicks) * 1000) / 10 : 0;

    const highestCtrItem = [...parsedData].sort((a, b) => b.ctr - a.ctr)[0];
    const highestCtrPath = highestCtrItem ? cleanUrlPath(highestCtrItem.name).path : '—';
    const highestCtrVal = highestCtrItem ? Number(highestCtrItem.ctr.toFixed(1)) : 0;

    const biggestOppItem = [...parsedData]
      .filter((p) => p.secondaryValue > 0)
      .sort((a, b) => b.secondaryValue - a.secondaryValue)[0] || parsedData[0];
    const biggestOppPath = biggestOppItem ? cleanUrlPath(biggestOppItem.name).path : '—';
    const biggestOppImp = biggestOppItem?.secondaryValue || 0;
    const biggestOppCtr = biggestOppItem ? Number(biggestOppItem.ctr.toFixed(1)) : 0;

    return {
      pagesList,
      pagesDonutData,
      pageScatterData,
      sectionData,
      topPagePath,
      topPageClicks,
      topPageShare,
      highestCtrPath,
      highestCtrVal,
      biggestOppPath,
      biggestOppImp,
      biggestOppCtr,
    };
  }, [activeVariant, parsedData, summary.totalClicks]);

  const queriesData = useMemo(() => {
    if (activeVariant !== 'queries') return null;
    const queriesList = parsedData.map((d, i) => ({
      rank: i + 1,
      query: d.name,
      clicks: d.primaryValue,
      impressions: d.secondaryValue,
      ctr: d.ctr,
      position: d.position,
      share: summary.totalClicks > 0 ? Math.round((d.primaryValue / summary.totalClicks) * 1000) / 10 : 100,
      pctBar: Math.max(8, Math.round((d.primaryValue / (parsedData[0]?.primaryValue || 1)) * 95)),
    }));

    const donutColors = ['#3B82F6', '#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#94A3B8'];
    const top5Queries = parsedData.slice(0, 5);
    const top5Sum = top5Queries.reduce((sum, q) => sum + q.primaryValue, 0);
    const remainderClicks = Math.max(0, summary.totalClicks - top5Sum);

    const intentDonutData = [
      ...top5Queries.map((d, i) => ({
        name: d.name,
        value: d.primaryValue,
        share: `${summary.totalClicks > 0 ? Math.round((d.primaryValue / summary.totalClicks) * 1000) / 10 : 0}%`,
        color: donutColors[i % donutColors.length],
      })),
      ...(remainderClicks > 0
        ? [{
            name: 'Other queries',
            value: remainderClicks,
            share: `${Math.round((remainderClicks / (summary.totalClicks || 1)) * 1000) / 10}%`,
            color: '#94A3B8',
          }]
        : []),
    ];

    const scatterColors = ['#4F46E5', '#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'];
    const queryScatterData = parsedData.slice(0, 10).map((d, i) => ({
      name: d.name,
      position: d.position,
      ctr: d.ctr,
      clicks: d.primaryValue,
      fill: scatterColors[i % scatterColors.length],
    }));

    let tier1 = 0, tier2 = 0, tier3 = 0, tier4 = 0;
    for (const q of parsedData) {
      if (q.position <= 3) tier1 += q.primaryValue;
      else if (q.position <= 10) tier2 += q.primaryValue;
      else if (q.position <= 20) tier3 += q.primaryValue;
      else tier4 += q.primaryValue;
    }

    const maxTier = Math.max(tier1, tier2, tier3, tier4, 1);
    const tierData = [
      { tier: 'Top 3 (Prime)', clicks: tier1, share: `${summary.totalClicks > 0 ? Math.round((tier1 / summary.totalClicks) * 1000) / 10 : 0}%`, color: '#10B981', barPct: Math.round((tier1 / maxTier) * 90) },
      { tier: 'Page 1 (Pos 4-10)', clicks: tier2, share: `${summary.totalClicks > 0 ? Math.round((tier2 / summary.totalClicks) * 1000) / 10 : 0}%`, color: '#3B82F6', barPct: Math.round((tier2 / maxTier) * 90) },
      { tier: 'Page 2 (Pos 11-20)', clicks: tier3, share: `${summary.totalClicks > 0 ? Math.round((tier3 / summary.totalClicks) * 1000) / 10 : 0}%`, color: '#F59E0B', barPct: Math.round((tier3 / maxTier) * 90) },
      { tier: 'Page 3+ (Deep)', clicks: tier4, share: `${summary.totalClicks > 0 ? Math.round((tier4 / summary.totalClicks) * 1000) / 10 : 0}%`, color: '#94A3B8', barPct: Math.round((tier4 / maxTier) * 90) },
    ];

    const topQueryItem = parsedData[0];
    const topQueryName = topQueryItem?.name || '—';
    const topQueryClicks = topQueryItem?.primaryValue || 0;
    const topQueryShare = summary.totalClicks > 0 ? Math.round((topQueryClicks / summary.totalClicks) * 1000) / 10 : 0;

    const highestCtrItem = [...parsedData].sort((a, b) => b.ctr - a.ctr)[0];
    const highestCtrName = highestCtrItem?.name || '—';
    const highestCtrVal = highestCtrItem ? Number(highestCtrItem.ctr.toFixed(1)) : 0;

    const quickWinItem = [...parsedData]
      .filter((q) => q.position > 10 && q.secondaryValue > 0)
      .sort((a, b) => b.secondaryValue - a.secondaryValue)[0] || parsedData[1] || parsedData[0];
    const quickWinName = quickWinItem?.name || '—';
    const quickWinPos = quickWinItem ? Number(quickWinItem.position.toFixed(1)) : 0;
    const quickWinCtr = quickWinItem ? Number(quickWinItem.ctr.toFixed(1)) : 0;

    return {
      queriesList,
      intentDonutData,
      queryScatterData,
      tierData,
      topQueryName,
      topQueryClicks,
      topQueryShare,
      highestCtrName,
      highestCtrVal,
      quickWinName,
      quickWinPos,
      quickWinCtr,
    };
  }, [activeVariant, parsedData, summary.totalClicks]);

  if (!data || data.length === 0) return null;

  const displayClicks = summary.totalClicks;
  const displayImpressions = summary.totalImpressions;
  const displayCtr = Math.round(summary.avgCtr * 10) / 10;
  const displayPosition = summary.avgPosition;

  return (
    <div className="space-y-4">
      {/* ── 1. TOP 4 KPI CARDS ───────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardMetricCard
          label="Clicks"
          value={displayClicks}
          icon="mouse-pointer-click"
          color="purple"
          sparkColor="#8B5CF6"
          seed={1}
        />
        <DashboardMetricCard
          label="Impressions"
          value={displayImpressions}
          icon="bar-chart"
          color="blue"
          sparkColor="#3B82F6"
          seed={2}
        />
        <DashboardMetricCard
          label="Average CTR"
          value={displayCtr}
          suffix="%"
          icon="percent"
          color="teal"
          sparkColor="#10B981"
          seed={3}
        />
        <DashboardMetricCard
          label="Avg Position"
          value={displayPosition}
          icon="crown"
          color="amber"
          sparkColor="#F59E0B"
          seed={4}
        />
      </div>

      {/* ── 2. VISITOR DEVICES CHARTS ──────────────────────── */}
      {activeVariant === 'devices' && devicesData && (() => {
        const { donutData, deviceBarData } = devicesData;
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            {/* Left Card: Traffic Share by Device (~40% / 5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <PieChartIcon className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Traffic Share by Device</h3>
                </div>

                {/* Donut Chart with Center Text */}
                <div className="flex items-center justify-between gap-4 py-2">
                  <div className="relative w-44 h-44 flex items-center justify-center flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          innerRadius={52}
                          outerRadius={74}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {donutData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color ?? '#3B82F6'} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[18px] font-black text-slate-900 leading-tight">
                        {summary.totalClicks.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">Total Clicks</span>
                    </div>
                  </div>

                  {/* Legend Table on Right */}
                  <div className="space-y-3 flex-1 min-w-0">
                    {donutData.map((d) => (
                      <div key={d.name} className="flex items-start justify-between gap-1 text-[12px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight">{d.name}</span>
                            <span className="text-[11px] text-slate-400">{d.value.toLocaleString()} clicks</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-slate-900 block leading-tight">{d.share}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Device Volume & Engagement Comparison (~60% / 7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <BarChart2 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Device Performance Comparison</h3>
                    </div>
                    <p className="text-[11.5px] text-slate-500">Comparative search clicks and impressions by device category</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                      <span>Clicks</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-300" />
                      <span>Impressions</span>
                    </span>
                  </div>
                </div>

                {/* Recharts Bar Chart using real device data */}
                <div className="h-52 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deviceBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="device" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 min-w-[130px] text-xs">
                              <p className="font-bold text-slate-900 mb-1">{d.device}</p>
                              <div className="flex items-center justify-between gap-3 text-[11px] py-0.5">
                                <span className="text-indigo-600 font-semibold">Clicks:</span>
                                <span className="font-bold text-slate-900">{d.clicks.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-[11px] py-0.5">
                                <span className="text-blue-500 font-semibold">Impressions:</span>
                                <span className="font-bold text-slate-900">{d.impressions.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-[11px] py-0.5">
                                <span className="text-slate-500 font-semibold">CTR:</span>
                                <span className="font-bold text-slate-900">{d.ctr}%</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="clicks" name="Clicks" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="impressions" name="Impressions" fill="#93C5FD" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 3. VISITOR COUNTRIES CHARTS ────────────────────── */}
      {activeVariant === 'countries' && countriesData && (() => {
        const { countriesList, barChartData, bubbleData, topCountry } = countriesData;
        return (
          <div className="space-y-3.5">
            {/* Row 1: World Map (50%) + Top Countries by Clicks Ranked List (50%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
              {/* Global Search Performance SVG Map */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Globe2 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Global Search Performance</h3>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs">
                      Clicks ▾
                    </span>
                  </div>
                  {/* SVG World Map Container */}
                  <div className="relative w-full h-52 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden p-2">
                    {/* Zoom Buttons */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      <button
                        type="button"
                        onClick={() => setMapZoom(z => Math.min(1.5, z + 0.1))}
                        className="w-6 h-6 rounded bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-600 hover:bg-slate-50 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapZoom(z => Math.max(0.8, z - 0.1))}
                        className="w-6 h-6 rounded bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-600 hover:bg-slate-50 text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Stylized World Map Vector Paths */}
                    <div className="w-full h-full flex items-center justify-center transition-transform duration-300" style={{ transform: `scale(${mapZoom})` }}>
                      <svg viewBox="0 0 1000 480" className="w-full h-full fill-slate-200/80 stroke-white stroke-[0.8]">
                        {/* North America */}
                        <path d="M 120 70 L 260 65 L 300 120 L 250 180 L 190 230 L 130 150 Z" />
                        <path d="M 180 230 L 230 250 L 200 300 L 180 270 Z" />
                        {/* South America */}
                        <path d="M 240 280 L 320 290 L 310 400 L 260 450 L 230 360 Z" />
                        {/* Europe */}
                        <path d="M 450 70 L 530 80 L 550 150 L 480 160 L 440 120 Z" />
                        <path d="M 430 80 L 450 90 L 440 110 L 420 95 Z" />
                        {/* Africa */}
                        <path d="M 460 170 L 560 170 L 570 270 L 530 360 L 480 340 L 450 240 Z" />
                        {/* Asia & Russia */}
                        <path d="M 530 60 L 860 60 L 820 170 L 730 210 L 610 180 L 550 140 Z" />
                        {/* Australia */}
                        <path d="M 760 310 L 870 300 L 880 380 L 790 390 L 750 350 Z" />
                        
                        {/* Highlighted Country: India in Deep Royal Blue */}
                        <path
                          d="M 640 180 L 685 190 L 695 240 L 665 290 L 645 250 L 630 210 Z"
                          fill="#3B82F6"
                          className="hover:fill-blue-600 transition-colors cursor-pointer"
                        />
                      </svg>

                      {/* Tooltip Card over Top Country */}
                      {topCountry && (
                        <div className="absolute top-[38%] left-[64%] -translate-x-1/2 -translate-y-full bg-white rounded-lg shadow-lg border border-slate-200/90 px-2.5 py-1 text-xs whitespace-nowrap pointer-events-none z-20 animate-in fade-in">
                          <div className="flex items-center gap-1.5">
                            <span>{topCountry.flag}</span>
                            <span className="font-bold text-slate-900 text-[11px]">{topCountry.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <span className="font-bold text-slate-800">{topCountry.clicks.toLocaleString()} clicks</span>
                            <span className="text-slate-400 font-semibold">({topCountry.share}%)</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Gradient Legend on Bottom */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-2 text-[9.5px] text-slate-400 font-medium">
                      <span>Low traffic</span>
                      <div className="w-16 h-2 rounded-full bg-gradient-to-r from-slate-200 via-sky-300 to-blue-600" />
                      <span>High traffic</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Countries by Clicks Ranked List */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Top Countries by Clicks</h3>
                    </div>
                    <button type="button" className="text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-800">
                      View All
                    </button>
                  </div>
                  <div className="space-y-2.5 mt-3">
                    {countriesList.slice(0, 6).map((c) => (
                      <div key={c.name} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <span className="text-[10.5px] font-bold text-slate-400 w-3">{c.rank}</span>
                          <span className="text-[16px] leading-none select-none">{c.flag}</span>
                          <span className="font-medium text-slate-900 truncate">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-1 max-w-[220px]">
                          <span className="font-bold text-slate-900 tabular-nums w-12 text-right">{c.clicks.toLocaleString()}</span>
                          <span className="text-[11px] text-slate-400 tabular-nums w-10 text-right">{c.share}%</span>
                          <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.pctBar}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Horizontal Bar Chart (50%) + Country Performance Bubble Scatter (50%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
              {/* Horizontal Bar Chart */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Top Countries by Clicks</h3>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={barChartData} margin={{ top: 10, right: 35, left: 35, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                        <YAxis type="category" dataKey="country" tick={{ fontSize: 10.5, fill: '#475569' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip />
                        <Bar dataKey="clicks" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={10} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bubble Scatter Chart */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Country Performance by CTR and Position</h3>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 15, right: 20, bottom: 10, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis
                          type="number"
                          dataKey="ctr"
                          name="CTR"
                          unit="%"
                          tick={{ fontSize: 10, fill: '#94A3B8' }}
                          axisLine={{ stroke: '#E2E8F0' }}
                          tickLine={false}
                        />
                        <YAxis
                          type="number"
                          dataKey="position"
                          name="Average Position"
                          reversed
                          tick={{ fontSize: 10, fill: '#94A3B8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <ZAxis type="number" dataKey="clicks" range={[80, 400]} />
                        <RechartsTooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-2.5 text-xs">
                                <p className="font-bold text-slate-900">{d.country}</p>
                                <p className="text-slate-500 text-[11px] mt-0.5">CTR: {d.ctr}%</p>
                                <p className="text-slate-500 text-[11px]">Avg Position: {d.position}</p>
                                <p className="text-indigo-600 font-bold text-[11px]">{d.clicks.toLocaleString()} clicks</p>
                              </div>
                            );
                          }}
                        />
                        <Scatter data={bubbleData}>
                          {bubbleData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill ?? '#6366F1'} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 4. TOP WEBSITE PAGES CHARTS (Matching Image 1) ────────────────────── */}
      {activeVariant === 'pages' && pagesData && (() => {
        const {
          pagesList,
          pagesDonutData,
          pageScatterData,
          sectionData,
          topPagePath,
          topPageClicks,
          topPageShare,
          highestCtrPath,
          highestCtrVal,
          biggestOppPath,
          biggestOppImp,
          biggestOppCtr,
        } = pagesData;
        return (
          <div className="space-y-3.5">
            {/* Row 1: Top Landing Pages by Clicks (50%) + Traffic Share & Page Concentration Donut (50%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
              {/* Left: Top Landing Pages by Clicks */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Top Landing Pages by Clicks</h3>
                    </div>
                    {/* Metric Selector Tabs */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => setPageMetricToggle('clicks')}
                        className={`px-2 py-0.5 rounded-md transition-all ${pageMetricToggle === 'clicks' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                      >
                        Clicks
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageMetricToggle('impressions')}
                        className={`px-2 py-0.5 rounded-md transition-all ${pageMetricToggle === 'impressions' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                      >
                        Impressions
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageMetricToggle('ctr')}
                        className={`px-2 py-0.5 rounded-md transition-all ${pageMetricToggle === 'ctr' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                      >
                        CTR
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageMetricToggle('position')}
                        className={`px-2 py-0.5 rounded-md transition-all ${pageMetricToggle === 'position' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                      >
                        Avg Position
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 mt-3">
                    {pagesList.slice(0, 5).map((p) => {
                      const metricVal =
                        pageMetricToggle === 'impressions'
                          ? `${p.impressions.toLocaleString()} imp`
                          : pageMetricToggle === 'ctr'
                          ? `${p.ctr.toFixed(1)}% CTR`
                          : pageMetricToggle === 'position'
                          ? `Pos #${p.position.toFixed(1)}`
                          : `${p.clicks.toLocaleString()} (${p.share}%)`;

                      const maxVal =
                        pageMetricToggle === 'impressions'
                          ? (parsedData[0]?.secondaryValue || 1)
                          : (parsedData[0]?.primaryValue || 1);

                      const barPct =
                        pageMetricToggle === 'impressions'
                          ? Math.max(8, Math.round((p.impressions / maxVal) * 95))
                          : pageMetricToggle === 'ctr'
                          ? Math.min(100, Math.max(8, Math.round(p.ctr * 4)))
                          : pageMetricToggle === 'position'
                          ? Math.max(8, Math.round((1 / Math.max(1, p.position)) * 100))
                          : p.pctBar;

                      return (
                        <div key={p.path} className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <span className="text-[11px] font-bold text-slate-400 w-3">{p.rank}</span>
                            <span className="font-semibold text-indigo-700 truncate font-mono text-[11.5px]">{p.path}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500/80 rounded-full" style={{ width: `${barPct}%` }} />
                            </div>
                            <span className="font-bold text-slate-900 tabular-nums w-24 text-right">
                              {metricVal}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Traffic Share & Page Concentration Donut */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-purple-600" />
                      <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Traffic Share & Page Concentration</h3>
                    </div>
                    <button type="button" className="text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
                      <span>See all pages</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pagesDonutData}
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {pagesDonutData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color ?? '#3B82F6'} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-[17px] font-black text-slate-900 leading-tight">
                          {summary.totalClicks.toLocaleString()}
                        </span>
                        <span className="text-[9.5px] font-semibold text-slate-400">Total Clicks</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {pagesDonutData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-800 truncate">{d.name}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 tabular-nums">
                            <span className="font-bold text-slate-900 w-10 text-right">{d.share}</span>
                            <span className="text-slate-500 w-8 text-right">{d.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Page Performance Map (50%) + Clicks by Content Section (50%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
              {/* Page Performance Map Scatter */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Page Performance Map</h3>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 15, right: 20, bottom: 10, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis
                          type="number"
                          dataKey="impressions"
                          name="Impressions"
                          domain={[0, 10000]}
                          ticks={[0, 2500, 5000, 7500, 10000]}
                          tick={{ fontSize: 10, fill: '#94A3B8' }}
                          tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}K`)}
                          axisLine={{ stroke: '#E2E8F0' }}
                          tickLine={false}
                        />
                        <YAxis
                          type="number"
                          dataKey="ctr"
                          name="CTR"
                          unit="%"
                          domain={[0, 20]}
                          ticks={[0, 10, 20]}
                          tick={{ fontSize: 10, fill: '#94A3B8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <ZAxis type="number" dataKey="clicks" range={[80, 450]} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-2.5 text-xs">
                                <p className="font-bold text-slate-900 font-mono">{d.name}</p>
                                <p className="text-slate-500 text-[11px] mt-0.5">Impressions: {d.impressions.toLocaleString()}</p>
                                <p className="text-slate-500 text-[11px]">CTR: {Number(d.ctr).toFixed(1)}%</p>
                                <p className="text-indigo-600 font-bold text-[11px]">{d.clicks.toLocaleString()} clicks</p>
                              </div>
                            );
                          }}
                        />
                        <Scatter data={pageScatterData}>
                          {pageScatterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill ?? '#6366F1'} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Clicks by Content Section */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-600" />
                      <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Clicks by Content Section</h3>
                    </div>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-semibold text-slate-600">
                      <button
                        type="button"
                        onClick={() => setSectionMetricToggle('clicks')}
                        className={`px-2 py-0.5 rounded-md transition-all ${sectionMetricToggle === 'clicks' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                      >
                        Clicks
                      </button>
                      <button
                        type="button"
                        onClick={() => setSectionMetricToggle('impressions')}
                        className={`px-2 py-0.5 rounded-md transition-all ${sectionMetricToggle === 'impressions' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                      >
                        Impressions
                      </button>
                      <button
                        type="button"
                        onClick={() => setSectionMetricToggle('ctr')}
                        className={`px-2 py-0.5 rounded-md transition-all ${sectionMetricToggle === 'ctr' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
                      >
                        CTR
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 mt-3">
                    {sectionData.map((s) => (
                      <div key={s.section} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-700 w-20 truncate">{s.section}</span>
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-2.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.barPct}%`, backgroundColor: s.color }} />
                          </div>
                          <span className="font-bold text-slate-900 tabular-nums w-10 text-right">{s.clicks}</span>
                          <span className="text-[11px] text-slate-400 tabular-nums w-12 text-right">{s.share}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Key Insights (3 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Top Page by Clicks</div>
                  <div className="text-[15px] font-bold text-slate-900 mt-0.5 font-mono">{topPagePath}</div>
                  <div className="text-[11px] font-bold text-emerald-600 mt-0.5">{topPageClicks.toLocaleString()} clicks ({topPageShare}%)</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Highest CTR Page</div>
                  <div className="text-[15px] font-bold text-slate-900 mt-0.5 font-mono">{highestCtrPath}</div>
                  <div className="text-[11px] font-bold text-emerald-600 mt-0.5">{highestCtrVal.toFixed(1)}% CTR</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-100">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Biggest Opportunity</div>
                  <div className="text-[15px] font-bold text-slate-900 mt-0.5 font-mono">{biggestOppPath}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{biggestOppImp.toLocaleString()} impressions, {biggestOppCtr.toFixed(1)}% CTR</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 5. TOP SEARCH KEYWORDS CHARTS (queries) ───────────────────────────── */}
      {activeVariant === 'queries' && queriesData && (() => {
        const {
          queriesList,
          intentDonutData,
          queryScatterData,
          tierData,
          topQueryName,
          topQueryClicks,
          topQueryShare,
          highestCtrName,
          highestCtrVal,
          quickWinName,
          quickWinPos,
          quickWinCtr,
        } = queriesData;
        return (
          <div className="space-y-3.5">
            {/* Row 1: Top Queries by Clicks (50%) + Traffic Share by Intent (50%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Top Search Queries by Clicks</h3>
                    </div>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10.5px] font-semibold text-slate-600">
                      <button type="button" className="px-2 py-0.5 rounded-md bg-white text-emerald-600 shadow-2xs font-bold">Clicks</button>
                      <button type="button" className="px-2 py-0.5 rounded-md hover:text-slate-900">Impressions</button>
                      <button type="button" className="px-2 py-0.5 rounded-md hover:text-slate-900">CTR</button>
                      <button type="button" className="px-2 py-0.5 rounded-md hover:text-slate-900">Avg Position</button>
                    </div>
                  </div>
                  <div className="space-y-3 mt-3">
                    {queriesList.slice(0, 5).map((q) => (
                      <div key={q.query} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <span className="text-[11px] font-bold text-slate-400 w-3">{q.rank}</span>
                          <span className="font-semibold text-emerald-800 truncate text-[11.5px]">&ldquo;{q.query}&rdquo;</span>
                        </div>
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${q.pctBar}%` }} />
                          </div>
                          <span className="font-bold text-slate-900 tabular-nums w-20 text-right">
                            {q.clicks.toLocaleString()} <span className="text-slate-400 font-normal">({q.share}%)</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Traffic Share by Intent Donut */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Keyword Intent & Traffic Share</h3>
                    </div>
                    <button type="button" className="text-[11.5px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-0.5">
                      <span>See all queries</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={intentDonutData}
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {intentDonutData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color ?? '#3B82F6'} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-[17px] font-black text-slate-900 leading-tight">
                          {summary.totalClicks.toLocaleString()}
                        </span>
                        <span className="text-[9.5px] font-semibold text-slate-400">Total Clicks</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {intentDonutData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-800 truncate">{d.name}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 tabular-nums">
                            <span className="font-bold text-slate-900 w-10 text-right">{d.share}</span>
                            <span className="text-slate-500 w-8 text-right">{d.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Scatter & Tier Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Query Performance Map</h3>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 15, right: 20, bottom: 10, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis
                          type="number"
                          dataKey="position"
                          name="Position"
                          reversed
                          domain={[0, 25]}
                          ticks={[0, 5, 10, 15, 20, 25]}
                          tick={{ fontSize: 10, fill: '#94A3B8' }}
                          axisLine={{ stroke: '#E2E8F0' }}
                          tickLine={false}
                        />
                        <YAxis
                          type="number"
                          dataKey="ctr"
                          name="CTR"
                          unit="%"
                          domain={[0, 35]}
                          ticks={[0, 10, 20, 30]}
                          tick={{ fontSize: 10, fill: '#94A3B8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <ZAxis type="number" dataKey="clicks" range={[80, 450]} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            return (
                              <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-2.5 text-xs">
                                <p className="font-bold text-slate-900">&ldquo;{d.name}&rdquo;</p>
                                <p className="text-slate-500 text-[11px] mt-0.5">Rank: {Number(d.position).toFixed(1)}</p>
                                <p className="text-slate-500 text-[11px]">CTR: {Number(d.ctr).toFixed(1)}%</p>
                                <p className="text-emerald-600 font-bold text-[11px]">{d.clicks.toLocaleString()} clicks</p>
                              </div>
                            );
                          }}
                        />
                        <Scatter data={queryScatterData}>
                          {queryScatterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill ?? '#6366F1'} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">Clicks by Search Ranking Tier</h3>
                  </div>

                  <div className="space-y-2 mt-2">
                    {tierData.map((s) => (
                      <div key={s.tier} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-700 w-28 truncate">{s.tier}</span>
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-2.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.barPct}%`, backgroundColor: s.color }} />
                          </div>
                          <span className="font-bold text-slate-900 tabular-nums w-10 text-right">{s.clicks}</span>
                          <span className="text-[11px] text-slate-400 tabular-nums w-12 text-right">{s.share}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Key Insights (3 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Top Search Query</div>
                  <div className="text-[14px] font-bold text-slate-900 mt-0.5">&ldquo;{topQueryName}&rdquo;</div>
                  <div className="text-[11px] font-bold text-emerald-600 mt-0.5">{topQueryClicks.toLocaleString()} clicks ({topQueryShare}%)</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Highest CTR Query</div>
                  <div className="text-[14px] font-bold text-slate-900 mt-0.5">&ldquo;{highestCtrName}&rdquo;</div>
                  <div className="text-[11px] font-bold text-emerald-600 mt-0.5">{highestCtrVal.toFixed(1)}% CTR</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-100">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">Page 2 Quick Win</div>
                  <div className="text-[14px] font-bold text-slate-900 mt-0.5">&ldquo;{quickWinName}&rdquo;</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Rank #{quickWinPos.toFixed(1)} — {quickWinCtr.toFixed(1)}% CTR</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
