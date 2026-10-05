'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Sparkles,
  ArrowRight,
  Send,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react';

interface RecommendationCardProps {
  tenantSlug: string;
  opportunity: any;
  onRefresh: () => void;
}

export function RecommendationCard({ tenantSlug, opportunity, onRefresh }: RecommendationCardProps) {
  const payload = opportunity.actionPayload || {};
  const explanation = payload.explanation || {};
  const originalSuggestion = payload.originalSuggestion || opportunity.title;
  const approvedValue = payload.approvedValue;
  const options = payload.options || [];
  const implDetails = payload.implementationDetails || {};
  const verificationState = payload.verificationState || {};

  const [isEditing, setIsEditing] = useState(false);
  const [customText, setCustomText] = useState(approvedValue || originalSuggestion);
  const [selectedOption, setSelectedOption] = useState<string>(approvedValue || originalSuggestion);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleReview = async (decision: 'APPROVE' | 'EDIT' | 'REJECT', val?: string) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/seo/opportunities/${opportunity.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          customValue: val ?? (decision === 'EDIT' ? customText : selectedOption),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        setFeedback({ type: 'success', message: `Decision recorded: ${decision}` });
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to review' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApply = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/seo/opportunities/${opportunity.id}/apply`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to apply' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/seo/opportunities/${opportunity.id}/verify`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: data.isVerified ? 'success' : 'error',
          message: data.message,
        });
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Verification failed' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const isApproved = opportunity.status === 'ACCEPTED' || Boolean(approvedValue);
  const isApplied = implDetails.status === 'APPLIED_TO_DRAFT' || implDetails.status === 'TASK_CREATED';
  const isVerified = verificationState.status === 'VERIFIED';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-5 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{opportunity.title}</h4>
            <span className="text-[11px] text-slate-400">Target: {payload.targetUrl}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              opportunity.priority === 'CRITICAL'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : opportunity.priority === 'HIGH'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {opportunity.priority} Priority
          </span>

          {isVerified ? (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Verified Live
            </span>
          ) : isApplied ? (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {implDetails.surface === 'LOCALBI' ? 'Draft Applied' : 'Task Pending'}
            </span>
          ) : isApproved ? (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Approved
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Needs Review
            </span>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* WHAT / WHY / EVIDENCE / ACTION Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-1">
            WHAT?
          </span>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {explanation.what || opportunity.summary}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-1">
            WHY?
          </span>
          <p className="text-xs text-slate-600 leading-relaxed">
            {explanation.why || 'Improves clarity and relevance for search users.'}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-1">
            EVIDENCE
          </span>
          <p className="text-xs text-slate-600 leading-relaxed font-mono">
            {explanation.evidence || 'Grounded in SERP competitor comparison.'}
          </p>
        </div>
      </div>

      {/* Suggested Options vs Current */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">Recommendation Options</span>
          <span className="text-[11px] text-slate-400 font-mono">
            Current: &quot;{payload.currentValue || 'None'}&quot;
          </span>
        </div>

        {/* Options Selector */}
        {options.length > 0 && !isEditing ? (
          <div className="space-y-2">
            {options.map((opt: any, idx: number) => {
              const text = opt.title || opt.description;
              const isSelected = (approvedValue || selectedOption) === text;

              return (
                <div
                  key={idx}
                  onClick={() => !isApproved && setSelectedOption(text)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/40 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{text}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        Option {idx + 1}
                      </span>
                    </div>
                    {opt.reason && <p className="text-[11px] text-slate-500">{opt.reason}</p>}
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : isEditing ? (
          <div className="space-y-2">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={2}
              className="w-full text-xs p-3 bg-white border border-indigo-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReview('EDIT', customText)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Custom Value
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-800">
            {originalSuggestion}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isApproved && !isEditing && (
            <>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleReview('APPROVE', selectedOption)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Selected</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Custom Edit</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleReview('REJECT')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </>
          )}

          {isApproved && !isApplied && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {implDetails.surface === 'LOCALBI' ? 'Apply to Page Draft' : 'Create Implementation Task'}
              </span>
            </button>
          )}

          {isApplied && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleVerify}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
              <span>Re-crawl & Verify Live Site</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-slate-400">
          {approvedValue ? (
            <span className="text-emerald-700 font-medium">Approved: &quot;{approvedValue}&quot;</span>
          ) : (
            'Awaiting review decision'
          )}
        </span>
      </div>
    </div>
  );
}

export function RecommendationsSection({
  tenantSlug,
  opportunities,
  onRefresh,
}: {
  tenantSlug: string;
  opportunities: any[];
  onRefresh: () => void;
}) {
  if (opportunities.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
        <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
        <h4 className="text-sm font-bold text-slate-900">No Pending Recommendations</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Run an SEO analysis above to discover meta title, description, and technical gaps backed by real search evidence.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Evidence-First SEO Recommendations</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Human-in-the-loop review. Approve, edit, or reject before applying to draft.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold">
          {opportunities.length} Items
        </span>
      </div>

      <div className="space-y-4">
        {opportunities.map((opp) => (
          <RecommendationCard
            key={opp.id}
            tenantSlug={tenantSlug}
            opportunity={opp}
            onRefresh={onRefresh}
          />
        ))}
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-indigo-950">Off-Page Authority Intelligence</h4>
          <p className="text-xs text-indigo-800 mt-0.5">
            Audit external referring domains, competitor backlink gaps, and business directory citations.
          </p>
        </div>
        <a
          href={`/client/${tenantSlug}/authority`}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition flex items-center gap-1 shrink-0"
        >
          View Authority
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
