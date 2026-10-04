'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Search,
  Sparkles,
  BarChart3,
  TrendingUp,
  Globe,
  ShieldCheck,
  CheckCircle2,
  Users,
  AlertCircle,
  Clock,
  Layers,
  FileText,
} from 'lucide-react';
import { AnalysisForm } from '@/modules/seo-intelligence/components/analysis-form';
import { JobProgress } from '@/modules/seo-intelligence/components/job-progress';
import { ComparisonTable } from '@/modules/seo-intelligence/components/comparison-table';
import { RecommendationsSection } from '@/modules/seo-intelligence/components/recommendations-section';
import { HistoryTable } from '@/modules/seo-intelligence/components/history-table';

export default function SeoIntelligencePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId') || undefined;

  const [activeTab, setActiveTab] = useState<'ANALYZE' | 'HISTORY'>('ANALYZE');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Load Overview stats
  const loadOverview = async () => {
    try {
      const url = brandId
        ? `/api/tenants/${tenantSlug}/seo/overview?brandId=${brandId}`
        : `/api/tenants/${tenantSlug}/seo/overview`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        if (data.stats.recentAnalyses && data.stats.recentAnalyses.length > 0) {
          setHistory(data.stats.recentAnalyses);
          if (!selectedAnalysisId && !activeJobId) {
            setSelectedAnalysisId(data.stats.recentAnalyses[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load SEO overview', err);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [tenantSlug, brandId]);

  // Load Analysis Details
  const loadAnalysisDetails = async (id: string) => {
    setLoadingAnalysis(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/seo/analysis/${id}`);
      const data = await res.json();
      if (data.success && data.analysis) {
        setAnalysisData(data);
      }
    } catch (err) {
      console.error('Failed to load analysis details', err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    if (selectedAnalysisId) {
      loadAnalysisDetails(selectedAnalysisId);
    }
  }, [selectedAnalysisId]);

  const handleAnalysisStarted = (jobId: string) => {
    setActiveJobId(jobId);
  };

  const handleJobCompleted = (jobId: string) => {
    setActiveJobId(null);
    setSelectedAnalysisId(jobId);
    loadOverview();
  };

  const gsc = analysisData?.analysis?.gscEvidence;
  const clientSignals = analysisData?.analysis?.clientSignals;
  const competitors = analysisData?.analysis?.selectedCompetitors || [];
  const compSignals = analysisData?.analysis?.competitorSignals || [];

  // Match competitor candidate with their crawled signals
  const combinedCompetitors = competitors.map((cand: any) => {
    const matched = compSignals.find((cs: any) => cs.domain === cand.domain);
    return {
      candidate: cand,
      signals: matched?.signals || {
        title: cand.title,
        metaDescription: cand.snippet,
        headings: { h1: [cand.title], h2: [], h3: [] },
        canonical: null,
        indexability: { isIndexable: true, reason: 'Presumed indexable' },
        structuredDataTypes: [],
        internalLinkCount: 5,
        wordCount: 450,
        faqSignals: [],
        serviceTopics: [],
      },
    };
  });

  return (
    <div className="space-y-6">
      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ANALYZE')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === 'ANALYZE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Analyze & Recommendations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === 'HISTORY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Analysis History ({history.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
          GSC + Organic SERP + Safe Page Crawl
        </span>
      </div>

      {/* ── Factual Metric KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Search Clicks</span>
          <div className="text-xl font-extrabold text-slate-900">
            {stats?.searchClicks?.toLocaleString() || 0}
          </div>
          <span className="text-[10px] text-slate-400">Past 30 Days (GSC)</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Impressions</span>
          <div className="text-xl font-extrabold text-slate-900">
            {stats?.searchImpressions?.toLocaleString() || 0}
          </div>
          <span className="text-[10px] text-slate-400">Past 30 Days (GSC)</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Avg CTR</span>
          <div className="text-xl font-extrabold text-slate-900">
            {((stats?.averageCtr || 0) * 100).toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400">Click-through Rate</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Avg Position</span>
          <div className="text-xl font-extrabold text-slate-900">
            {stats?.averagePosition ? stats.averagePosition.toFixed(1) : '—'}
          </div>
          <span className="text-[10px] text-slate-400">Google Search Rank</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Tracked Keywords</span>
          <div className="text-xl font-extrabold text-indigo-600">
            {stats?.trackedKeywordsCount || 0}
          </div>
          <span className="text-[10px] text-slate-400">Canonical Keywords</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Open SEO Gaps</span>
          <div className="text-xl font-extrabold text-amber-600">
            {stats?.openOpportunitiesCount || 0}
          </div>
          <span className="text-[10px] text-slate-400">Pending Approvals</span>
        </div>
      </div>

      {activeTab === 'ANALYZE' ? (
        <div className="space-y-6">
          {/* Analysis Form */}
          <AnalysisForm
            tenantSlug={tenantSlug}
            brandId={brandId}
            onAnalysisStarted={handleAnalysisStarted}
          />

          {/* Active Job Progress */}
          {activeJobId && (
            <JobProgress
              tenantSlug={tenantSlug}
              jobId={activeJobId}
              onCompleted={handleJobCompleted}
            />
          )}

          {/* Results View */}
          {analysisData && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Target & GSC Summary Header */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold uppercase tracking-wider">
                      Analysis Target
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {analysisData.analysis.targetUrl}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Keyword: &quot;{analysisData.analysis.keyword}&quot; · {analysisData.analysis.searchLocation}
                  </h3>
                  {analysisData.analysis.aiAnalysis?.summary && (
                    <p className="text-xs text-slate-600 pt-1 max-w-3xl leading-relaxed">
                      {analysisData.analysis.aiAnalysis.summary}
                    </p>
                  )}
                </div>

                {gsc?.available ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Google Search Console
                    </span>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {gsc.clicks} Clicks · {gsc.impressions.toLocaleString()} Impr
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Avg Rank: {gsc.averagePosition.toFixed(1)} · {(gsc.ctr * 100).toFixed(1)}% CTR
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-800 shrink-0 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Search Console data unlinked (Partial Analysis)</span>
                  </div>
                )}
              </div>

              {/* Side-by-Side Comparison Table */}
              {clientSignals && combinedCompetitors.length > 0 && (
                <ComparisonTable clientSignals={clientSignals} competitors={combinedCompetitors} />
              )}

              {/* Evidence-First Recommendations */}
              <RecommendationsSection
                tenantSlug={tenantSlug}
                opportunities={analysisData.opportunities || []}
                onRefresh={() => selectedAnalysisId && loadAnalysisDetails(selectedAnalysisId)}
              />
            </div>
          )}
        </div>
      ) : (
        <HistoryTable
          history={history}
          onSelectAnalysis={(id) => {
            setSelectedAnalysisId(id);
            setActiveTab('ANALYZE');
          }}
        />
      )}
    </div>
  );
}
