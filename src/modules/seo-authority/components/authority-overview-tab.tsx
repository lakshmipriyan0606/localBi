'use client';

import {
  Link2,
  Globe2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { SeoAuthorityOverviewDto } from '../authority-types';

interface AuthorityOverviewTabProps {
  overview: SeoAuthorityOverviewDto | null;
  onTabChange: (tab: 'overview' | 'backlinks' | 'domains' | 'gaps' | 'citations' | 'opportunities') => void;
  onSync: () => void;
  isSyncing: boolean;
}

export function AuthorityOverviewTab({
  overview,
  onTabChange,
  onSync,
  isSyncing,
}: AuthorityOverviewTabProps) {
  if (!overview) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const { providerState, providerMessage, backlinks, citations, freshness } = overview;

  return (
    <div className="space-y-6">
      {/* ── Freshness & Sync Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>Last audited: {freshness?.lastAuditedAt ? new Date(freshness.lastAuditedAt).toLocaleString() : 'Recent'}</span>
        </div>
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Authority'}
        </button>
      </div>

      {/* ── Status Banner for Provider Configuration ── */}
      {providerState === 'NOT_CONFIGURED' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-amber-900">Backlink Data Provider Not Configured</h4>
            <p className="mt-0.5 text-amber-800">
              {providerMessage ||
                'To automatically sync live external backlinks, configure DataForSEO API credentials in your environment variables. In the meantime, Citation Intelligence and internal authority monitoring remain fully active.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Overview Metrics Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Referring Domains */}
        <div
          onClick={() => onTabChange('domains')}
          className="cursor-pointer group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Referring Domains</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 group-hover:bg-indigo-100 transition">
              <Globe2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {backlinks.referringDomains.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">unique domains</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
            <span>{backlinks.newLinksLast30Days} new links (30d)</span>
          </div>
        </div>

        {/* Total Active Backlinks */}
        <div
          onClick={() => onTabChange('backlinks')}
          className="cursor-pointer group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Backlinks</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 group-hover:bg-blue-100 transition">
              <Link2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {backlinks.totalBacklinks.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">active links</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-500">
            <span>{backlinks.lostLinksLast30Days} lost links (30d)</span>
          </div>
        </div>

        {/* Citation Health */}
        <div
          onClick={() => onTabChange('citations')}
          className="cursor-pointer group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Healthy Listings</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 group-hover:bg-emerald-100 transition">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {citations.healthyListings}
            </span>
            <span className="text-xs text-slate-500">/ {citations.trackedListings} listings</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-amber-600 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 mr-0.5" />
            <span>{citations.mismatchedListings} NAP mismatches</span>
          </div>
        </div>

        {/* Growth Opportunities */}
        <div
          onClick={() => onTabChange('opportunities')}
          className="cursor-pointer group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-purple-300 hover:shadow-md"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Authority Opportunities</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600 group-hover:bg-purple-100 transition">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">
              {backlinks.activeOpportunities + citations.confirmedMissingDirectories}
            </span>
            <span className="text-xs text-slate-500">actionable items</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-purple-600 font-medium">
            <span>{citations.confirmedMissingDirectories} missing directory profiles</span>
          </div>
        </div>
      </div>

      {/* ── Two Column Breakdown: Top Referring Domains & Competitor Gaps ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Referring Domains */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Top Referring Domains</h3>
              <p className="text-xs text-slate-500">Highest authority external domains linking to your site</p>
            </div>
            <button
              onClick={() => onTabChange('domains')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {overview.topReferringDomains.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {providerState === 'NOT_CONFIGURED'
                  ? 'Connect provider to see referring domains'
                  : 'No referring domains indexed yet'}
              </div>
            ) : (
              overview.topReferringDomains.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-800">{d.domain}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    {d.providerAuthorityMetric != null && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 font-mono">
                        {d.providerAuthorityMetricName || 'DR'} {Math.round(d.providerAuthorityMetric)}
                      </span>
                    )}
                    <span className="text-slate-500">{d.activeLinksCount} links</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Competitor Backlink Gaps Preview */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Competitor Backlink Gaps</h3>
              <p className="text-xs text-slate-500">Authoritative domains linking to competitors but not you</p>
            </div>
            <button
              onClick={() => onTabChange('gaps')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {overview.topCompetitorGaps.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {providerState === 'NOT_CONFIGURED'
                  ? 'Connect provider to analyze competitor backlink gaps'
                  : 'No competitor gap candidates identified'}
              </div>
            ) : (
              overview.topCompetitorGaps.slice(0, 5).map((gap) => (
                <div key={gap.domain} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{gap.domain}</span>
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                        {gap.relevance.overall} relevance
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Links to {gap.competitorCount} competitor(s)
                    </p>
                  </div>
                  <button
                    onClick={() => onTabChange('gaps')}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Review
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
