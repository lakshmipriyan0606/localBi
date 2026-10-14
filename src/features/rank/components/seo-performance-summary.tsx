'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Award,
  BarChart3,
  Search,
  MousePointerClick,
  Eye,
  Percent,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { SeoPerformanceSummaryDto } from '@/modules/rank/keyword-service';

interface SeoPerformanceSummaryProps {
  summary: SeoPerformanceSummaryDto | null;
  isLoading?: boolean;
}

export function SeoPerformanceSummary({ summary, isLoading }: SeoPerformanceSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm animate-pulse h-28"
          >
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
            <div className="h-7 w-14 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
            <div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-850 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const s = summary || {
    totalTrackedKeywords: 0,
    activeKeywordsCount: 0,
    pausedKeywordsCount: 0,
    keywordsWithRankData: 0,
    improvedCount: 0,
    declinedCount: 0,
    unchangedCount: 0,
    top3Count: 0,
    top10Count: 0,
    top20Count: 0,
    beyond20Count: 0,
    totalGscClicks: 0,
    totalGscImpressions: 0,
    averageGscCtr: 0,
    averageGscPosition: null,
    lastScanTime: null,
    lastSyncTime: null,
  };

  const rankDataPercent =
    s.totalTrackedKeywords > 0
      ? Math.round((s.keywordsWithRankData / s.totalTrackedKeywords) * 100)
      : 0;

  return (
    <div className="space-y-3.5">
      {/* 6 Top-Level KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Tracked Keywords */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Tracked Keywords</span>
            <Search className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {s.totalTrackedKeywords}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" /> {s.activeKeywordsCount} Active
              </span>
              {s.pausedKeywordsCount > 0 && (
                <>
                  <span>•</span>
                  <span>{s.pausedKeywordsCount} Paused</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Local Rank Coverage */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">With Rank Data</span>
            <Award className="h-4 w-4 text-teal-500" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {s.keywordsWithRankData}
              <span className="text-xs font-medium text-slate-400 ml-1.5 font-sans">
                ({rankDataPercent}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Verified local geo-grid scans</p>
          </div>
        </div>

        {/* Card 3: Ranking Movement */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Rank Movement</span>
            <Sparkles className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <TrendingUp className="h-3.5 w-3.5" /> +{s.improvedCount}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                <TrendingDown className="h-3.5 w-3.5" /> -{s.declinedCount}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {s.unchangedCount} unchanged vs previous scan
            </p>
          </div>
        </div>

        {/* Card 4: GSC Impressions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">GSC Impressions</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Web
              </span>
            </div>
            <Eye className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {s.totalGscImpressions.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Search Console query views</p>
          </div>
        </div>

        {/* Card 5: GSC Clicks & CTR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">GSC Clicks & CTR</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Web
              </span>
            </div>
            <MousePointerClick className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {s.totalGscClicks.toLocaleString()}
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 ml-1.5 font-sans">
                {s.averageGscCtr}% CTR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Organic web search clicks</p>
          </div>
        </div>

        {/* Card 6: GSC Average Position */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg GSC Position</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Web
              </span>
            </div>
            <BarChart3 className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {s.averageGscPosition !== null ? `${s.averageGscPosition}` : '—'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Weighted Search Console rank</p>
          </div>
        </div>
      </div>

      {/* Position Bands Distribution Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-emerald-500" />
            Position Bands (Local Rank):
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Top 3: {s.top3Count}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              4–10: {s.top10Count}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              11–20: {s.top20Count}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              &gt;20: {s.beyond20Count}
            </span>
          </div>
        </div>

        {/* Freshness Timestamps */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {s.lastScanTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-emerald-500" />
              Last Geo Scan: {new Date(s.lastScanTime).toLocaleDateString()}
            </span>
          )}
          {s.lastSyncTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              GSC Sync: {new Date(s.lastSyncTime).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
