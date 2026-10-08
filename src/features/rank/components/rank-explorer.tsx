'use client';

import React, { useState, useEffect } from 'react';
import {
  Radar,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
  Award,
  RefreshCw,
  Plus,
  Sliders,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  BarChart3,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import { ScopedBrandDto, ScopedLocationDto } from '@/modules/reports/report-context-service';

interface RankRunSummary {
  totalPoints: number;
  validCheckedPoints: number;
  foundPoints: number;
  top3Count: number;
  top10Count: number;
  averageFoundRank: number | null;
  top3Coverage: number;
  top10Coverage: number;
  shareOfVoice: number;
}

interface PointObservation {
  pointIndex: number;
  row: number;
  col: number;
  latitude: number;
  longitude: number;
  distanceKm: number;
  rank: number | null;
  found: boolean;
  checkedDepth: number;
  topCompetitors?: Array<{ position: number; name: string; externalPlaceId?: string | null }>;
}

interface RankRun {
  id: string;
  storeId: string;
  keywordId: string;
  gridConfigId: string;
  provider: string;
  status: string;
  businessKey: string;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  summary?: RankRunSummary | null;
  observations?: PointObservation[];
}

interface KeywordItem {
  id: string;
  term: string;
  normalizedTerm: string;
  source: 'MANUAL' | 'GSC_IMPORT' | 'GBP_IMPORT';
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  tags: string[];
}

interface CompetitorItem {
  id: string;
  name: string;
  externalPlaceId: string | null;
  domain: string | null;
  category: string | null;
  observedFrequency: number;
  lastObservedAt: string;
}

interface RankExplorerProps {
  tenantSlug: string;
  tenantName: string;
  brands: ScopedBrandDto[];
  locations: ScopedLocationDto[];
  initialBrandId: string;
}

import { useActiveBrand } from '@/providers/active-brand-context';

export function RankExplorer({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
}: RankExplorerProps) {
  const brandCtx = useActiveBrand();
  const effectiveBrandId = brandCtx?.activeBrandId || initialBrandId || brands[0]?.id || '';
  const [selectedBrandId, setSelectedBrandId] = useState<string>(effectiveBrandId);

  useEffect(() => {
    if (brandCtx?.activeBrandId && brandCtx.activeBrandId !== selectedBrandId) {
      setSelectedBrandId(brandCtx.activeBrandId);
    }
  }, [brandCtx?.activeBrandId, selectedBrandId]);

  const brandLocations = locations.filter((loc) => !selectedBrandId || loc.brandId === selectedBrandId);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(brandLocations[0]?.id || '');

  // Reset store if it doesn't belong to newly selected brand
  useEffect(() => {
    if (selectedStoreId && !brandLocations.some(l => l.id === selectedStoreId)) {
      setSelectedStoreId(brandLocations[0]?.id || '');
    }
  }, [selectedBrandId, brandLocations, selectedStoreId]);

  // State
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>('');
  const [latestRun, setLatestRun] = useState<RankRun | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedPoint, setSelectedPoint] = useState<PointObservation | null>(null);

  // Dialogs
  const [isAddKeywordOpen, setIsAddKeywordOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [newKeywordTerm, setNewKeywordTerm] = useState('');
  const [gridSize, setGridSize] = useState<number>(5);
  const [radiusKm, setRadiusKm] = useState<number>(5);

  // When selectedBrandId changes, update store
  useEffect(() => {
    const validLocs = locations.filter((loc) => !selectedBrandId || loc.brandId === selectedBrandId);
    if (validLocs.length > 0 && !validLocs.some((l) => l.id === selectedStoreId)) {
      setSelectedStoreId(validLocs[0]!.id);
    }
  }, [selectedBrandId, locations]);

  // Load keywords when brand changes
  useEffect(() => {
    if (!selectedBrandId) return;
    loadKeywords();
  }, [selectedBrandId, tenantSlug]);

  // Load latest run when store or keyword changes
  useEffect(() => {
    if (selectedStoreId && selectedKeywordId) {
      loadLatestRun(selectedStoreId, selectedKeywordId);
      loadCompetitors(selectedStoreId);
    } else {
      setLatestRun(null);
    }
  }, [selectedStoreId, selectedKeywordId, tenantSlug]);

  const loadKeywords = async () => {
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/rank/keywords?brandId=${selectedBrandId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setKeywords(data.items);
        if (data.items.length > 0 && (!selectedKeywordId || !data.items.some((k: any) => k.id === selectedKeywordId))) {
          setSelectedKeywordId(data.items[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load keywords:', err);
    }
  };

  const loadLatestRun = async (storeId: string, keywordId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/rank/runs?storeId=${storeId}&keywordId=${keywordId}&latest=true`
      );
      const data = await res.json();
      if (data.success) {
        setLatestRun(data.run);
      }
    } catch (err) {
      console.error('Failed to load latest rank run:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompetitors = async (storeId: string) => {
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/rank/stores/${storeId}/competitors?limit=15`);
      const data = await res.json();
      if (data.success && Array.isArray(data.competitors)) {
        setCompetitors(data.competitors);
      }
    } catch (err) {
      console.error('Failed to load store competitors:', err);
    }
  };

  const handleTriggerRun = async () => {
    if (!selectedStoreId || !selectedKeywordId) {
      notify.error('Please select both a store location and a keyword to check rank.');
      return;
    }

    setIsScanning(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/rank/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStoreId,
          keywordId: selectedKeywordId,
          gridSize,
          radiusKm,
          force: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.run) {
        setLatestRun(data.run);
        notify.success('Rank scan completed successfully with verified coordinates.');
        loadCompetitors(selectedStoreId);
      } else {
        notify.error(data.error || 'Failed to complete rank scan.');
      }
    } catch (err: any) {
      notify.error(err.message || 'An error occurred during rank scan.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreateKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordTerm.trim()) return;

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/rank/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          brandId: selectedBrandId,
          term: newKeywordTerm.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.keyword) {
        notify.success(`Keyword "${data.keyword.term}" registered.`);
        setNewKeywordTerm('');
        setIsAddKeywordOpen(false);
        await loadKeywords();
        setSelectedKeywordId(data.keyword.id);
      } else {
        notify.error(data.error || 'Failed to add keyword.');
      }
    } catch (err: any) {
      notify.error(err.message || 'Error creating keyword.');
    }
  };

  const handleImportFromGbp = async () => {
    if (!selectedStoreId) {
      notify.error('Select a store location first.');
      return;
    }
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/rank/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_gbp',
          brandId: selectedBrandId,
          locationId: selectedStoreId,
          minSearches: 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Imported ${data.importedCount} search keywords from Google Business Profile!`);
        setIsAddKeywordOpen(false);
        await loadKeywords();
      } else {
        notify.error(data.error || 'No customer search keywords eligible for import.');
      }
    } catch (err: any) {
      notify.error(err.message || 'Import failed.');
    }
  };

  // Geo-Grid rendering calculations
  const observations = latestRun?.observations || [];
  const currentGridSize = latestRun ? Math.round(Math.sqrt(observations.length)) || 5 : gridSize;
  const summary = latestRun?.summary;

  const getRankBadgeClass = (rank: number | null, found: boolean) => {
    if (!found || rank === null) {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700';
    }
    if (rank <= 3) {
      return 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold ring-2 ring-emerald-300 dark:ring-emerald-800 shadow-md shadow-emerald-500/20';
    }
    if (rank <= 10) {
      return 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold ring-2 ring-blue-300 dark:ring-blue-800 shadow-sm';
    }
    if (rank <= 20) {
      return 'bg-gradient-to-br from-amber-500 to-orange-600 text-white font-medium ring-2 ring-amber-300 dark:ring-amber-800 shadow-sm';
    }
    return 'bg-gradient-to-br from-rose-500 to-red-600 text-white font-medium ring-2 ring-rose-300 dark:ring-rose-800 shadow-sm';
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Hyper Rank Intelligence
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Geo-Grid Engine
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Deterministic coordinate-accurate local search rank heatmaps and competitor intelligence for {tenantName}
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition"
          >
            <Sliders className="h-3.5 w-3.5 text-slate-500" />
            Grid Config ({gridSize}x{gridSize}, {radiusKm}km)
          </button>

          <button
            onClick={() => setIsAddKeywordOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition"
          >
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            Manage Keywords
          </button>

          <button
            onClick={handleTriggerRun}
            disabled={isScanning || !selectedStoreId || !selectedKeywordId}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-sm shadow-emerald-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning Grid...' : 'Run Rank Check'}
          </button>
        </div>
      </div>

      {/* Selectors Bar: Brand, Store, Keyword Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Brand Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Brand Portfolio
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="w-full text-sm font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Store Location Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Physical Store Location
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full text-sm font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {brandLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.city || 'Store'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Keyword Quick Selection Pills */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tracked Keywords ({keywords.length})
            </span>
            <button
              onClick={() => setIsAddKeywordOpen(true)}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add Keyword
            </button>
          </div>

          {keywords.length === 0 ? (
            <div className="py-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
              <Search className="h-6 w-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No keywords tracked yet for this brand. Add your first keyword or import customer search terms from Google Business Profile.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {keywords.map((kw) => {
                const isSelected = kw.id === selectedKeywordId;
                return (
                  <button
                    key={kw.id}
                    onClick={() => setSelectedKeywordId(kw.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{kw.term}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded uppercase ${
                        isSelected
                          ? 'bg-emerald-700/60 text-emerald-100'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {kw.source.replace('_IMPORT', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Avg Found Rank</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary?.averageFoundRank !== null && summary?.averageFoundRank !== undefined
              ? `#${summary.averageFoundRank}`
              : '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Average position across found grid nodes</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Top 3 Coverage</span>
            <Award className="h-4 w-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary ? `${summary.top3Coverage}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary ? `${summary.top3Count} of ${summary.validCheckedPoints} in Local 3-Pack` : 'Local 3-Pack'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Top 10 Coverage</span>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary ? `${summary.top10Coverage}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">First Page SERP prominence</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Share of Voice</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary ? `${summary.shareOfVoice}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Position-weighted SERP power</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Grid Points</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary ? `${summary.foundPoints}/${summary.validCheckedPoints}` : '0/0'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary ? `${currentGridSize}x${currentGridSize} Verified Nodes` : 'No run selected'}
          </p>
        </div>
      </div>

      {/* Main Visualizer Area: Heatmap Grid & Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Card (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-emerald-500" />
                Geo-Grid Rank Heatmap
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any coordinate node to inspect SERP details and competing businesses
              </p>
            </div>

            {/* Color Legend */}
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> 1-3
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> 4-10
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> 11-20
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> &gt;20
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-300" /> None
              </span>
            </div>
          </div>

          {/* Grid Render Container */}
          {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
              <p className="text-xs text-slate-500">Loading geo-grid observations...</p>
            </div>
          ) : !latestRun || observations.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Radar className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                No Rank Scan Performed Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                Click &quot;Run Rank Check&quot; above to calculate deterministic coordinates and scan Google Maps local rankings for this store and keyword.
              </p>
              <button
                onClick={handleTriggerRun}
                disabled={isScanning || !selectedStoreId || !selectedKeywordId}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Start Scan Now
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <div
                className="grid gap-2.5 sm:gap-3.5"
                style={{
                  gridTemplateColumns: `repeat(${currentGridSize}, minmax(0, 1fr))`,
                  width: '100%',
                  maxWidth: '520px',
                }}
              >
                {observations.map((obs) => {
                  const isCenter =
                    obs.row === Math.floor(currentGridSize / 2) &&
                    obs.col === Math.floor(currentGridSize / 2);
                  const isSelected = selectedPoint?.pointIndex === obs.pointIndex;

                  return (
                    <button
                      key={obs.pointIndex}
                      onClick={() => setSelectedPoint(obs)}
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${getRankBadgeClass(
                        obs.rank,
                        obs.found
                      )} ${
                        isSelected
                          ? 'ring-4 ring-emerald-400 dark:ring-emerald-300 scale-105 z-10'
                          : ''
                      }`}
                    >
                      <span className="text-sm sm:text-base font-extrabold tracking-tight">
                        {obs.found && obs.rank !== null ? obs.rank : '—'}
                      </span>
                      <span className="text-[9px] opacity-80 leading-none mt-0.5">
                        {obs.distanceKm}km
                      </span>

                      {/* Store Center Location Indicator */}
                      {isCenter && (
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-md">
                          <MapPin className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 mt-6 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-900 dark:text-white" /> Store Location (Center)
                </span>
                <span>•</span>
                <span>Scan Radius: {radiusKm} km</span>
                <span>•</span>
                <span>Status: {latestRun.status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Coordinate Point Inspector & Detail (1 Col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              Coordinate Inspector
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Details for selected geo-grid scan node
            </p>
          </div>

          {selectedPoint ? (
            <div className="space-y-4 flex-1">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Observed Position
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      selectedPoint.found && selectedPoint.rank
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {selectedPoint.found && selectedPoint.rank ? `Rank #${selectedPoint.rank}` : 'Not Found (20+)'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Node Coordinate:</span>
                    <span className="font-mono">
                      {selectedPoint.latitude.toFixed(5)}, {selectedPoint.longitude.toFixed(5)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Distance from Store:</span>
                    <span>{selectedPoint.distanceKm} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Grid Position:</span>
                    <span>
                      Row {selectedPoint.row + 1}, Col {selectedPoint.col + 1}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Checked Depth:</span>
                    <span>Top {selectedPoint.checkedDepth} results</span>
                  </div>
                </div>
              </div>

              {/* Observed Competitors at this Point */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Observed Competitors at this Node
                </h4>
                {selectedPoint.topCompetitors && selectedPoint.topCompetitors.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPoint.topCompetitors.map((comp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                            #{comp.position}
                          </span>
                          <span className="text-xs font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                            {comp.name}
                          </span>
                        </div>
                        {comp.externalPlaceId && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {comp.externalPlaceId.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No competitors recorded for this point.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <MapPin className="h-6 w-6 text-slate-400 mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select any node on the heatmap to view its geographical coordinates and competitors.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Competitor Intelligence Leaderboard */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-500" />
              Observed Competitor Leaderboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Businesses most frequently appearing in local map pack results within your scan perimeter
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {competitors.length} Unique Competitors Observed
          </span>
        </div>

        {competitors.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <Building2 className="h-6 w-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No competitor intelligence recorded yet. Scan a keyword to automatically discover competing businesses.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Rank</th>
                  <th className="py-3 px-4 font-semibold">Business Name</th>
                  <th className="py-3 px-4 font-semibold">Place ID</th>
                  <th className="py-3 px-4 font-semibold">Website</th>
                  <th className="py-3 px-4 font-semibold text-right">Observation Count</th>
                  <th className="py-3 px-4 font-semibold text-right">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {competitors.map((comp, idx) => (
                  <tr key={comp.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {comp.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {comp.externalPlaceId || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {comp.domain ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          {comp.domain}
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px]">
                        {comp.observedFrequency} points
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400">
                      {new Date(comp.lastObservedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Import Keyword Modal */}
      {isAddKeywordOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Add Tracked Keyword
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Add target local search keywords to track across physical geo-grid coordinates.
            </p>

            <form onSubmit={handleCreateKeyword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Keyword Term
                </label>
                <input
                  type="text"
                  placeholder="e.g. coffee shop near me, best orthodontist"
                  value={newKeywordTerm}
                  onChange={(e) => setNewKeywordTerm(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddKeywordOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newKeywordTerm.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm disabled:opacity-50"
                >
                  Save Keyword
                </button>
              </div>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">Or import</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleImportFromGbp}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-lg transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              Import Customer Keywords from GBP
            </button>
          </div>
        </div>
      )}

      {/* Grid Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Grid Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Set the coordinate scan resolution and radius around this store.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Grid Dimensions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 7].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setGridSize(size)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        gridSize === size
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {size}x{size} ({size * size} pts)
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scan Radius
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 5, 10].map((rad) => (
                    <button
                      key={rad}
                      type="button"
                      onClick={() => setRadiusKm(rad)}
                      className={`py-2 text-xs font-semibold rounded-lg border transition ${
                        radiusKm === rad
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {rad} km
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
                >
                  Apply Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
