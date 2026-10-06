'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Layers,
  Globe,
  Compass,
  Search,
} from 'lucide-react';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
  brandId: string;
  brandName?: string;
  primaryDomain?: string | null;
  onPublishSuccess?: () => void;
}

export function PublishModal({
  isOpen,
  onClose,
  tenantSlug,
  brandId,
  brandName = 'LocalBi Site',
  primaryDomain,
  onPublishSuccess,
}: PublishModalProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const publishSteps = [
    { label: 'Validating templates & draft versions', icon: Layers },
    { label: 'Generating metadata & sitemaps', icon: Search },
    { label: 'Generating structured data (JSON-LD)', icon: Sparkles },
    { label: 'Revalidating edge cache routes', icon: RefreshCw },
    { label: 'Activating live published version', icon: Globe },
  ];

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStepIndex(0);
      setIsSuccess(false);
      setIsPublishing(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartPublish = async () => {
    setIsPublishing(true);
    setErrorMessage(null);
    setProgress(15);
    setCurrentStepIndex(0);

    try {
      // Step simulation for high quality feedback
      const stepTimer1 = setTimeout(() => {
        setProgress(40);
        setCurrentStepIndex(1);
      }, 400);

      const stepTimer2 = setTimeout(() => {
        setProgress(70);
        setCurrentStepIndex(2);
      }, 800);

      const stepTimer3 = setTimeout(() => {
        setProgress(85);
        setCurrentStepIndex(3);
      }, 1200);

      // Real API call to activate live version
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PUBLISH_ALL',
          brandId,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish website changes.');
      }

      setProgress(100);
      setCurrentStepIndex(4);
      setIsSuccess(true);
      onPublishSuccess?.();
    } catch (err: any) {
      console.error('Publishing failed:', err);
      setErrorMessage(err.message || 'An error occurred while publishing.');
    } finally {
      setIsPublishing(false);
    }
  };

  const clientLiveUrl = primaryDomain
    ? `https://${primaryDomain}`
    : `/client/${tenantSlug}/website/preview?brandId=${brandId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              <span>Publish Changes</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and promote your draft changes to your live client domain
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Publishing blocked: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">
                  Website Published Successfully!
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your changes are now live and serving globally on your client domain.
                </p>
              </div>

              {primaryDomain ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-center gap-2 max-w-sm mx-auto">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-semibold text-slate-900">{primaryDomain}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                    Active
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 max-w-sm mx-auto">
                  Draft promoted! Connect your client domain in the Domains tab to point your public traffic.
                </div>
              )}

              <div className="pt-4 flex items-center justify-center gap-3">
                <a
                  href={clientLiveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm shadow-indigo-600/30"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Visit Website</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Checklist of changes */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Changes to be Published
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Homepage content updated</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Navigation menus synced</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>SEO & Metadata structured</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Brand tokens & styles synced</span>
                  </div>
                </div>
              </div>

              {/* Progress UI if publishing */}
              {isPublishing ? (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      <span>{publishSteps[currentStepIndex]?.label}</span>
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Target Client Domain
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {primaryDomain || 'No primary domain connected yet'}
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Ready to Publish
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartPublish}
              disabled={isPublishing}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/30 disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Website</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
