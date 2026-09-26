'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Puck, type Data } from '@measured/puck';
import '@measured/puck/puck.css';
import {
  ArrowLeft,
  ExternalLink,
  Save,
  Check,
} from 'lucide-react';
import {
  puckConfig,
  type PuckComponentProps,
  DEFAULT_FOOD_LAYOUT,
  normalizePuckData,
} from '@/modules/microsites/puck-config';

export default function MicrositeBuilderStudio({
  params,
}: {
  params: Promise<{ tenantSlug: string; subdomain: string }>;
}) {
  const resolvedParams = use(params);
  const { tenantSlug, subdomain } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data<PuckComponentProps> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadLayout() {
      try {
        const res = await fetch(`/api/microsites/${subdomain}/puck`);
        if (res.ok) {
          const json = await res.json();
          const cleanData = json.data ? normalizePuckData(json.data) : DEFAULT_FOOD_LAYOUT;
          setData(cleanData);
        }
      } catch (err) {
        console.error(err);
        setData(DEFAULT_FOOD_LAYOUT);
      } finally {
        setLoading(false);
      }
    }
    loadLayout();
  }, [subdomain]);

  const handlePublish = async (newData: Data<PuckComponentProps>) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/microsites/${subdomain}/puck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newData }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setData(newData);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading Landing Page Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* Top Builder Control Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <Link
            href={`/client/${tenantSlug}/microsites`}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Back to Microsites"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">Landing Page Builder</span>
              <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {subdomain}.localbi.app
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Drag & drop blocks to create your high-converting storefront landing page
            </p>
          </div>
        </div>

        {/* Center Live Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Interactive Storefront Canvas</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <a
            href={`/site/${subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <span>Live View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              Published Live!
            </span>
          )}

          <button
            type="button"
            onClick={() => data && handlePublish(data)}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Publishing...' : 'Save & Publish Live'}
          </button>
        </div>
      </header>

      {/* Puck Editor Canvas Container */}
      <div className="flex-1 overflow-hidden relative bg-slate-100/60">
        <Puck
          key="puck-landing-page-builder"
          config={puckConfig}
          data={data}
          onPublish={handlePublish}
        />
      </div>
    </div>
  );
}
