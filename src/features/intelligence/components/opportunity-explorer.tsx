'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  RefreshCw,
  ShieldCheck,
  MapPin,
  FileText,
  Package,
  Layers,
  BarChart3,
} from 'lucide-react';
import {
  OpportunityDto,
  OpportunitySummaryStats,
  OpportunityStatus,
  OpportunityPriority,
  OpportunityActionType,
  DismissalReason,
  DismissalReasonValue,
  OpportunityStatusValue,
} from '@/modules/intelligence/opportunity-types';
import { ScopedBrandDto, ScopedLocationDto } from '@/modules/reports/report-context-service';
import { useActiveBrand } from '@/providers/active-brand-context';

interface Props {
  tenantSlug: string;
  brands: ScopedBrandDto[];
  stores: ScopedLocationDto[];
  initialBrandId?: string;
}

export function OpportunityExplorer({
  tenantSlug,
  brands,
  stores,
  initialBrandId,
}: Props) {
  const brandCtx = useActiveBrand();
  const [selectedBrandId, setSelectedBrandId] = useState<string>(
    initialBrandId || brandCtx?.activeBrandId || brands[0]?.id || ''
  );

  useEffect(() => {
    if (brandCtx?.activeBrandId && brandCtx.activeBrandId !== selectedBrandId) {
      setSelectedBrandId(brandCtx.activeBrandId);
      setSelectedStoreId('');
    }
  }, [brandCtx?.activeBrandId]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data states
  const [opportunities, setOpportunities] = useState<OpportunityDto[]>([]);
  const [stats, setStats] = useState<OpportunitySummaryStats | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dismissal Modal State
  const [dismissModalOpen, setDismissModalOpen] = useState<boolean>(false);
  const [dismissTargetId, setDismissTargetId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<DismissalReasonValue>(
    DismissalReason.NOT_RELEVANT
  );
  const [isSubmittingDismiss, setIsSubmittingDismiss] = useState<boolean>(false);

  // Fetch opportunities
  const loadOpportunities = useCallback(async () => {
    if (!selectedBrandId) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('brandId', selectedBrandId);
      if (selectedStoreId) params.set('storeId', selectedStoreId);

      if (statusFilter === 'ACTIVE') {
        // default server behavior fetches OPEN, IN_REVIEW, ACCEPTED
      } else if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      } else {
        params.set('status', 'ALL');
      }

      if (priorityFilter !== 'ALL') {
        params.set('priority', priorityFilter);
      }

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const res = await fetch(
        `/api/tenants/${tenantSlug}/intelligence/opportunities?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error('Failed to load opportunities');
      }

      const data = await res.json();
      setOpportunities(data.opportunities || []);
      setStats(data.stats || null);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Error loading opportunities');
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug, selectedBrandId, selectedStoreId, statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  // Run evaluation pipeline
  const handleRunEvaluation = async () => {
    if (!selectedBrandId) return;
    setIsEvaluating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/intelligence/opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: selectedBrandId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Failed to run opportunity evaluation');
      }

      const result = await res.json();
      setSuccessMessage(
        `Evaluation complete! Processed factual signals: ${result.created} new recommendations detected, ${result.updated} updated.`
      );
      await loadOpportunities();
    } catch (err: any) {
      setError(err.message || 'Error running evaluation pipeline');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Workflow transition
  const handleStatusChange = async (
    opportunityId: string,
    status: OpportunityStatusValue,
    dismissalReason?: string
  ) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/intelligence/opportunities/${opportunityId}/workflow`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, dismissalReason }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Failed to update opportunity status');
      }

      await loadOpportunities();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleConfirmDismiss = async () => {
    if (!dismissTargetId) return;
    setIsSubmittingDismiss(true);
    try {
      await handleStatusChange(dismissTargetId, OpportunityStatus.DISMISSED, selectedReason);
      setDismissModalOpen(false);
      setDismissTargetId(null);
    } finally {
      setIsSubmittingDismiss(false);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case OpportunityPriority.CRITICAL:
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20';
      case OpportunityPriority.HIGH:
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20';
      case OpportunityPriority.MEDIUM:
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/20';
    }
  };

  const getSourceBadgeClass = (source: string) => {
    switch (source) {
      case 'GSC':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'GBP':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'LOCAL_RANK':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LOCALBI':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'MERCHANT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case OpportunityActionType.UPDATE_METADATA:
        return 'Update Page Metadata';
      case OpportunityActionType.IMPROVE_EXISTING_PAGE:
        return 'Improve Existing Page';
      case OpportunityActionType.CREATE_PAGE:
        return 'Create Landing Page';
      case OpportunityActionType.FIX_GBP_PROFILE:
        return 'Complete GBP Profile';
      case OpportunityActionType.RESPOND_TO_REVIEWS:
        return 'Respond to Reviews';
      case OpportunityActionType.FIX_MERCHANT_PRODUCT:
        return 'Fix Merchant Issue';
      case OpportunityActionType.INVESTIGATE_RANK_DECLINE:
        return 'Investigate Rank Drop';
      case OpportunityActionType.IMPROVE_CTA:
        return 'Optimize CTAs & Phone';
      case OpportunityActionType.ADD_KEYWORD_TRACKING:
        return 'Track Keyword Growth';
      default:
        return actionType;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Lightbulb className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              SEO Opportunity Engine
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Factual search signals, explainable recommendations, and transparent priority scoring. Zero black-box metrics.
          </p>
        </div>

        {/* Brand & Store Selectors + Evaluation CTA */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Brand Selector - Commented out per client feedback: Brand selection is handled globally via the top header. Uncomment if local selection is needed.
          {brands.length > 1 && (
            <select
              value={selectedBrandId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedBrandId(newId);
                setSelectedStoreId('');
                brandCtx?.setActiveBrandId(newId);
              }}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          */}

          {stores.length > 0 && (
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Store Locations</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg shadow-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
            {isEvaluating ? 'Evaluating Signals...' : 'Run Signal Evaluation'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-medium">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 font-medium">
            Close
          </button>
        </div>
      )}

      {/* KPI Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Active Opportunities</span>
              <span className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <Layers className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{stats.open + stats.inReview}</span>
              <span className="text-xs text-slate-500 font-normal">ready for action</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-rose-600">Critical Priority</span>
              <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-rose-600">{stats.byPriority.critical}</span>
              <span className="text-xs text-slate-500 font-normal">high commercial impact</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-amber-600">High Growth</span>
              <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-amber-600">{stats.byPriority.high}</span>
              <span className="text-xs text-slate-500 font-normal">strong search demand</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-600">Accepted / Executed</span>
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-600">{stats.accepted + stats.completed}</span>
              <span className="text-xs text-slate-500 font-normal">{stats.completed} marked done</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Recommendations
            </button>
            <button
              onClick={() => setStatusFilter(OpportunityStatus.ACCEPTED)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === OpportunityStatus.ACCEPTED
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Accepted ({stats?.accepted ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter(OpportunityStatus.COMPLETED)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === OpportunityStatus.COMPLETED
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({stats?.completed ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter(OpportunityStatus.DISMISSED)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === OpportunityStatus.DISMISSED
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dismissed ({stats?.dismissed ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search keyword or store..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Priority:
          </span>
          {['ALL', OpportunityPriority.CRITICAL, OpportunityPriority.HIGH, OpportunityPriority.MEDIUM, OpportunityPriority.LOW].map(
            (p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-md border ${
                  priorityFilter === p
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p === 'ALL' ? 'All Priorities' : p}
              </button>
            )
          )}
        </div>
      </div>

      {/* Opportunity Cards List */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <h3 className="text-sm font-medium text-slate-900">Loading SEO opportunities...</h3>
          <p className="text-xs text-slate-500 mt-1">Ingesting search signals and evaluating transparent rule engine.</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No opportunities match the selected criteria</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Run the Signal Evaluation pipeline to ingest real customer search data across Google Search Console, Google Business Profile, and geo-grid tracking.
          </p>
          <button
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg shadow-sm hover:bg-amber-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
            Run Signal Evaluation
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Showing {opportunities.length} of {totalCount} recommendations</span>
            <span>Sorted by deterministic Priority Score (0–100)</span>
          </div>

          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Left Color Accent Bar based on Priority */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  opp.priority === OpportunityPriority.CRITICAL
                    ? 'bg-rose-500'
                    : opp.priority === OpportunityPriority.HIGH
                    ? 'bg-amber-500'
                    : opp.priority === OpportunityPriority.MEDIUM
                    ? 'bg-blue-500'
                    : 'bg-slate-400'
                }`}
              />

              <div className="pl-2">
                {/* Header row: Title + Priority + Confidence + Action Type */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ring-1 ${getPriorityBadgeClass(
                          opp.priority
                        )}`}
                      >
                        {opp.priority} ({opp.priorityScore.toFixed(0)}/100)
                      </span>

                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {getActionTypeLabel(opp.actionType)}
                      </span>

                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {opp.confidence} Confidence
                      </span>

                      {opp.status !== OpportunityStatus.OPEN && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                            opp.status === OpportunityStatus.ACCEPTED
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : opp.status === OpportunityStatus.COMPLETED
                              ? 'bg-slate-800 text-white'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          Status: {opp.status}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">{opp.title}</h2>
                  </div>

                  {/* Human Workflow Action Buttons */}
                  <div className="flex items-center gap-2 self-start">
                    {opp.status !== OpportunityStatus.ACCEPTED && opp.status !== OpportunityStatus.COMPLETED && (
                      <button
                        onClick={() => handleStatusChange(opp.id, OpportunityStatus.ACCEPTED)}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept
                      </button>
                    )}

                    {opp.status === OpportunityStatus.ACCEPTED && (
                      <button
                        onClick={() => handleStatusChange(opp.id, OpportunityStatus.COMPLETED)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Done
                      </button>
                    )}

                    {opp.status !== OpportunityStatus.DISMISSED && (
                      <button
                        onClick={() => {
                          setDismissTargetId(opp.id);
                          setDismissModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary / Explainable Rationale */}
                <p className="text-sm text-slate-700 mt-2 leading-relaxed">{opp.summary}</p>

                {/* Affected Entities */}
                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  {opp.storeName && (
                    <span className="flex items-center gap-1 font-medium bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      Store: {opp.storeName}
                    </span>
                  )}
                  {opp.pageSlug && (
                    <span className="flex items-center gap-1 font-medium bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                      <FileText className="w-3 h-3 text-slate-400" />
                      Page: /{opp.pageSlug}
                    </span>
                  )}
                  {opp.productName && (
                    <span className="flex items-center gap-1 font-medium bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                      <Package className="w-3 h-3 text-slate-400" />
                      Product: {opp.productName}
                    </span>
                  )}
                  {opp.keywordTerm && (
                    <span className="flex items-center gap-1 font-medium bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                      <Search className="w-3 h-3 text-slate-400" />
                      Query: {opp.keywordTerm}
                    </span>
                  )}
                  <span className="text-slate-400 ml-auto">
                    Evaluated: {new Date(opp.lastEvaluatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Explicit Evidence Breakdown (No black box) */}
                {opp.evidence && opp.evidence.length > 0 && (
                  <div className="mt-3 bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                      Supporting Evidence & Provenance:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {opp.evidence.map((ev) => (
                        <div
                          key={ev.id}
                          className="bg-white border border-slate-200 rounded p-2 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span
                              className={`font-semibold px-1.5 py-0.2 rounded border text-[10px] ${getSourceBadgeClass(
                                ev.source
                              )}`}
                            >
                              {ev.source}
                            </span>
                            <span className="text-slate-400">{ev.metric.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800">
                            {ev.formattedValue || String(ev.value)}
                          </div>
                          {ev.entityLabel && (
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {ev.entityLabel}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dismissal details if dismissed */}
                {opp.status === OpportunityStatus.DISMISSED && (
                  <div className="mt-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-2.5">
                    <strong>Dismissed reason:</strong> {opp.dismissalReason?.replace(/_/g, ' ') || 'None provided'}{' '}
                    on {opp.dismissedAt ? new Date(opp.dismissedAt).toLocaleDateString() : 'N/A'}.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dismissal Reason Modal */}
      {dismissModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Dismiss Recommendation</h3>
            <p className="text-sm text-slate-500 mt-1">
              Select why this opportunity is not being pursued. This informs future signal evaluations and prevents premature re-generation.
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-slate-700">Dismissal Reason:</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value as DismissalReasonValue)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value={DismissalReason.NOT_RELEVANT}>Not relevant to business strategy</option>
                <option value={DismissalReason.ALREADY_ADDRESSED}>Already addressed / being handled</option>
                <option value={DismissalReason.BUSINESS_DECISION}>Intentional business decision</option>
                <option value={DismissalReason.INCORRECT_MAPPING}>Incorrect keyword or store association</option>
                <option value={DismissalReason.LOW_PRIORITY}>Low commercial return at this time</option>
                <option value={DismissalReason.OTHER}>Other operational reason</option>
              </select>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDismissModalOpen(false);
                  setDismissTargetId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDismiss}
                disabled={isSubmittingDismiss}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmittingDismiss ? 'Dismissing...' : 'Confirm Dismissal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
