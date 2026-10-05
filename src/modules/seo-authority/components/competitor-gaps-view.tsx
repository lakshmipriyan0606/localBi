'use client';

import { useState } from 'react';
import {
  Globe2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { CompetitorBacklinkGapCandidate } from '../authority-types';

interface CompetitorGapsViewProps {
  tenantSlug: string;
  brandId: string;
  webSurfaceId: string;
  gaps: CompetitorBacklinkGapCandidate[];
  loading: boolean;
  onOpportunityCreated?: (domain: string) => void;
}

export function CompetitorGapsView({
  tenantSlug,
  brandId,
  webSurfaceId,
  gaps,
  loading,
  onOpportunityCreated,
}: CompetitorGapsViewProps) {
  const [creatingForDomain, setCreatingForDomain] = useState<string | null>(null);
  const [createdDomains, setCreatedDomains] = useState<Record<string, boolean>>({});

  const handleCreateOpportunity = async (candidate: CompetitorBacklinkGapCandidate) => {
    setCreatingForDomain(candidate.domain);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/authority/opportunities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate,
          brandId,
          webSurfaceId,
        }),
      });
      if (res.ok) {
        setCreatedDomains((prev) => ({ ...prev, [candidate.domain]: true }));
        if (onOpportunityCreated) {
          onOpportunityCreated(candidate.domain);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingForDomain(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Explanation Banner ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
        <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-purple-600" />
          Competitor Referring Domain Gap Engine
        </h4>
        <p className="mt-1">
          Identifies authoritative external websites that currently link to your established competitors, but do not yet link to your website.
          Each gap is deterministically vetted for topical relevance, local fit, and risk prior to creating an ethical outreach action.
        </p>
      </div>

      {/* ── Gap Table ── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Candidate Domain</th>
              <th className="px-4 py-3">Client Backlink</th>
              <th className="px-4 py-3">Competitors Linked</th>
              <th className="px-4 py-3">Relevance</th>
              <th className="px-4 py-3">Risk Assessment</th>
              <th className="px-4 py-3">Evidence & Context</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <RefreshCw className="mx-auto h-5 w-5 animate-spin" />
                  <span className="mt-2 block">Analyzing competitor backlink gaps...</span>
                </td>
              </tr>
            ) : gaps.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No competitor backlink gaps detected. All competitor links are either shared or unconfigured.
                </td>
              </tr>
            ) : (
              gaps.map((gap) => (
                <tr key={gap.domain} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{gap.domain}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <XCircle className="h-3.5 w-3.5 text-slate-300" />
                      None
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">
                        {gap.competitorCount} competitor(s)
                      </span>
                      <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                        ({gap.competitorDomains.join(', ')})
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        gap.relevance.overall === 'HIGH'
                          ? 'bg-purple-50 text-purple-700'
                          : gap.relevance.overall === 'MEDIUM'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {gap.relevance.overall}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        gap.risk.level === 'LOW'
                          ? 'bg-emerald-50 text-emerald-700'
                          : gap.risk.level === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {gap.risk.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs text-slate-600 text-[11px]">
                    <p className="truncate">{gap.relevance.explanation}</p>
                    <span className="text-[10px] text-slate-400">Provenance: {gap.provenance}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {createdDomains[gap.domain] ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Opportunity Created
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCreateOpportunity(gap)}
                        disabled={creatingForDomain === gap.domain}
                        className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        {creatingForDomain === gap.domain ? (
                          <RefreshCw className="h-3 w-3 animate-spin inline mr-1" />
                        ) : (
                          <Plus className="h-3 w-3 inline mr-1" />
                        )}
                        Create Opportunity
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
