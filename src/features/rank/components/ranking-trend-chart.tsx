'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, Layers, Calendar, Info, RefreshCw } from 'lucide-react';
import { RankTrendPointDto } from '@/modules/rank/rank-run-service';

interface RankingTrendChartProps {
  keywordTerm: string;
  trend: RankTrendPointDto[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function RankingTrendChart({
  keywordTerm,
  trend,
  isLoading,
  onRefresh,
}: RankingTrendChartProps) {
  const [activeSeries, setActiveSeries] = useState<'BOTH' | 'LOCAL' | 'GSC'>('BOTH');

  // Custom Tooltip for Rank Trend
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey?: string | number; name?: string; value?: number | null; color?: string }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
        <div className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1">
          {label}
        </div>
        {payload.map((entry, index: number) => {
          const val = entry.value;

          return (
            <div key={index} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold font-mono">
                {val !== null && val !== undefined ? `#${val}` : 'Unranked (>20)'}
              </span>
            </div>
          );
        })}
        {/* Source Note */}
        <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Rank 1 is the top position.
        </div>
      </div>
    );
  };

  // Check if we have observations
  const hasLocalObservations = trend.some((t) => t.localRank !== null);
  const hasGscObservations = trend.some((t) => t.gscAvgPosition !== null);
  const hasAnyData = hasLocalObservations || hasGscObservations;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Historical Ranking Trend
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
              {keywordTerm || 'Selected Keyword'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified local geo-grid rank telemetry vs Google Search Console average query position over time.
          </p>
        </div>

        {/* View Mode Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveSeries('BOTH')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
              activeSeries === 'BOTH'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Sources
          </button>
          <button
            onClick={() => setActiveSeries('LOCAL')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
              activeSeries === 'LOCAL'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Local Geo-Grid
          </button>
          <button
            onClick={() => setActiveSeries('GSC')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
              activeSeries === 'GSC'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Search Console
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Refresh Trend"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin" />
          <span className="text-xs text-slate-400">Loading historical snapshots...</span>
        </div>
      ) : !hasAnyData || trend.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <Layers className="h-8 w-8 text-slate-400 mb-2" />
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            No Historical Observations Yet
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Execute rank checks over time or sync Search Console data to build verifiable ranking history for &quot;{keywordTerm}&quot;.
          </p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                tick={{ fill: '#64748B', fontSize: 11 }}
                dy={6}
              />
              {/* Inverted Y-Axis: Rank 1 is at the top (reversed: true, domain: [1, 20]) */}
              <YAxis
                reversed={true}
                domain={[1, 20]}
                ticks={[1, 3, 5, 10, 15, 20]}
                tickLine={false}
                axisLine={{ stroke: '#CBD5E1' }}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(val) => `#${val}`}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />

              {/* Local Geo-Grid Rank (Emerald Line) */}
              {(activeSeries === 'BOTH' || activeSeries === 'LOCAL') && (
                <Line
                  type="monotone"
                  dataKey="localRank"
                  name="Local Geo-Grid Rank (Maps/Pack)"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#059669' }}
                  connectNulls={false}
                />
              )}

              {/* Google Search Console Average Position (Blue Dashed Line) */}
              {(activeSeries === 'BOTH' || activeSeries === 'GSC') && (
                <Line
                  type="monotone"
                  dataKey="gscAvgPosition"
                  name="Google Search Console Avg Position (Web)"
                  stroke="#2563EB"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3.5, fill: '#2563EB', strokeWidth: 1, stroke: '#fff' }}
                  activeDot={{ r: 5, fill: '#2563EB' }}
                  connectNulls={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Metric Explainer Footnote */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
        <Info className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span>
          <strong>Methodology Note:</strong> Geo-Grid rank represents physical coordinate proximity scanning (1–20 pack depth). Search Console represents aggregated organic web search impression positions reported by Google.
        </span>
      </div>
    </div>
  );
}
