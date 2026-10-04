'use client';

import { useState } from 'react';
import {
  Sparkles,
  Link2,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface AuthorityOpportunitiesViewProps {
  tenantSlug: string;
  opportunities: any[];
  loading: boolean;
  onRefresh: () => void;
}

export function AuthorityOpportunitiesView({
  tenantSlug,
  opportunities,
  loading,
  onRefresh,
}: AuthorityOpportunitiesViewProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
        <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-purple-600" />
          Authority Growth & Outreach Opportunities
        </h4>
        <p className="mt-1">
          Evidence-backed recommendations for acquiring relevant external editorial backlinks and resolving critical business citation discrepancies across top local directories.
        </p>
      </div>

      {/* ── Cards List ── */}
      <div className="space-y-3">
        {opportunities.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
            No active authority opportunities at this time. Run sync or check competitor gaps to discover candidates.
          </div>
        ) : (
          opportunities.map((opp) => (
            <div
              key={opp.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        opp.type === 'BACKLINK_OPPORTUNITY'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {opp.type === 'BACKLINK_OPPORTUNITY' ? 'BACKLINK' : 'CITATION'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Priority: {opp.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{opp.title}</h4>
                </div>

                <a
                  href={`/client/${tenantSlug}/opportunities`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shrink-0"
                >
                  Review Action
                  <ArrowRight className="h-3 w-3 inline ml-1" />
                </a>
              </div>

              {/* ── WHAT / WHY / EVIDENCE / ACTION Framework ── */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    What & Why
                  </span>
                  <p className="mt-0.5 text-slate-700 leading-relaxed">{opp.summary}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Evidence Signals
                  </span>
                  <div className="mt-0.5 text-slate-600 space-y-1">
                    {opp.actionPayload?.competitors && (
                      <p>
                        Competitors linked:{' '}
                        <span className="font-semibold text-slate-800">
                          {opp.actionPayload.competitors.join(', ')}
                        </span>
                      </p>
                    )}
                    {opp.actionPayload?.relevance && (
                      <p>
                        Relevance:{' '}
                        <span className="font-semibold text-purple-700">
                          {opp.actionPayload.relevance.overall}
                        </span>{' '}
                        ({opp.actionPayload.relevance.relationshipType})
                      </p>
                    )}
                    {opp.actionPayload?.risk && (
                      <p>
                        Risk Level:{' '}
                        <span className="font-semibold text-emerald-700">
                          {opp.actionPayload.risk.level}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Recommended Action
                  </span>
                  <div className="mt-0.5 text-slate-800 font-medium">
                    {opp.actionType?.replace(/_/g, ' ')}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Provenance: {opp.actionPayload?.provenance || 'RULE_BASED'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
