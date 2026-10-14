'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Award,
  BarChart3,
  Search,
  Eye,
  MousePointerClick,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';
import { KeywordPerformanceItemDto } from '@/modules/rank/keyword-service';
import { RankTrendPointDto } from '@/modules/rank/rank-run-service';
import { RankingTrendChart } from './ranking-trend-chart';
import { ScopedLocationDto } from '@/modules/reports/report-context-service';
import { notify } from '@/lib/notify';

interface KeywordDetailsDrawerProps {
  keyword: KeywordPerformanceItemDto | null;
  tenantSlug: string;
  locations: ScopedLocationDto[];
  onClose: () => void;
  onRefreshData?: () => void;
}

export function KeywordDetailsDrawer({
  keyword,
  tenantSlug,
  locations,
  onClose,
  onRefreshData,
}: KeywordDetailsDrawerProps) {
  const [trend, setTrend] = useState<RankTrendPointDto[]>([]);
  const [isLoadingTrend, setIsLoadingTrend] = useState(false);
  const [selectedStoreToAssign, setSelectedStoreToAssign] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Load trend when keyword changes
  useEffect(() => {
    if (!keyword) return;
    loadKeywordTrend(keyword.id);
  }, [keyword?.id]);

  const loadKeywordTrend = async (keywordId: string) => {
    setIsLoadingTrend(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/rank/runs?keywordId=${keywordId}&trend=true&days=30`
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.trend)) {
        setTrend(data.trend);
      } else {
        setTrend([]);
      }
    } catch (err) {
      console.error('Failed to load keyword trend:', err);
      setTrend([]);
    } finally {
      setIsLoadingTrend(false);
    }
  };

  const handleAssignStore = async () => {
    if (!keyword || !selectedStoreToAssign) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/rank/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_store',
          keywordId: keyword.id,
          storeId: selectedStoreToAssign,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success('Store location assigned to keyword.');
        setSelectedStoreToAssign('');
        if (onRefreshData) onRefreshData();
      } else {
        notify.error(data.error || 'Failed to assign store.');
      }
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : 'Error assigning store.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (!keyword) return null;

  // Find stores for this brand not yet assigned
  const assignedStoreIds = new Set(keyword.assignedStores.map((s) => s.id));
  const unassignedStores = locations.filter(
    (l) => l.brandId === keyword.brandId && !assignedStoreIds.has(l.id)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {keyword.term}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  keyword.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {keyword.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Source: {keyword.source.replace('_IMPORT', '')}</span>
              <span>•</span>
              <span>Locale: {keyword.locale} ({keyword.country})</span>
              <span>•</span>
              <span>Added: {new Date(keyword.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Telemetry Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Local Rank */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Local Rank
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {keyword.latestRank !== null ? `#${keyword.latestRank}` : '—'}
              </div>
              <span className="text-[10px] text-slate-400">
                {keyword.previousRank !== null ? `Prev: #${keyword.previousRank}` : 'First scan'}
              </span>
            </div>

            {/* Top 3 Coverage */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Top 3 Pack
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {keyword.top3Coverage !== null ? `${keyword.top3Coverage}%` : '—'}
              </div>
              <span className="text-[10px] text-slate-400">Local 3-Pack prominence</span>
            </div>

            {/* GSC Clicks */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                GSC Clicks
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {keyword.hasGscData ? keyword.gscClicks.toLocaleString() : '—'}
              </div>
              <span className="text-[10px] text-slate-400">
                {keyword.hasGscData ? `${keyword.gscCtr}% CTR` : 'No GSC query views'}
              </span>
            </div>

            {/* GSC Position */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                GSC Avg Pos
              </span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {keyword.gscAvgPosition !== null ? `${keyword.gscAvgPosition}` : '—'}
              </div>
              <span className="text-[10px] text-slate-400">Web search average</span>
            </div>
          </div>

          {/* Historical Trend Chart Component */}
          <div>
            <RankingTrendChart
              keywordTerm={keyword.term}
              trend={trend}
              isLoading={isLoadingTrend}
              onRefresh={() => loadKeywordTrend(keyword.id)}
            />
          </div>

          {/* Assigned Physical Stores */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  Assigned Store Locations ({keyword.assignedStores.length})
                </h4>
                <p className="text-xs text-slate-400">
                  Physical locations configured to scan this keyword across geo-grid perimeters
                </p>
              </div>
            </div>

            {keyword.assignedStores.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                This keyword is not yet assigned to any specific physical store location.
              </p>
            ) : (
              <div className="space-y-2">
                {keyword.assignedStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {store.name}
                      </span>
                      {store.city && (
                        <span className="text-slate-400">({store.city})</span>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Tracking
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Store Assignment */}
            {unassignedStores.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <select
                  value={selectedStoreToAssign}
                  onChange={(e) => setSelectedStoreToAssign(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">Select store to track...</option>
                  {unassignedStores.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.city || 'Store'})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignStore}
                  disabled={!selectedStoreToAssign || isAssigning}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isAssigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
