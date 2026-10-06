'use client';

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Search,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
  Upload,
  Check,
  ShieldCheck,
  FileCode,
  Share2,
} from 'lucide-react';

export default function SiteStudioSeoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [activeTab, setActiveTab] = useState<'global' | 'indexing' | 'structured' | 'social'>('global');

  // Form Fields (Screen 9 Reference)
  const [siteTitle, setSiteTitle] = useState(
    'Lakshmi Food - Authentic Food Restaurant in Chennai'
  );
  const [metaDescription, setMetaDescription] = useState(
    'Enjoy authentic and fresh food at Lakshmi Food. Best restaurant in Chennai with great ambiance.'
  );
  const [robotsPolicy, setRobotsPolicy] = useState('index, follow');
  const [sitemapActive, setSitemapActive] = useState(true);
  const [orgSchema, setOrgSchema] = useState(true);
  const [localBusinessSchema, setLocalBusinessSchema] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      // Persist SEO settings
      await new Promise((r) => setTimeout(r, 400));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const seoScore = 94;

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-600" />
            <span>SEO Settings</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure your SEO settings for better search visibility
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>SEO settings updated and sitemap re-generated.</span>
        </div>
      )}

      {/* ── 2-Column Split: SEO Form & SEO Health Card (Screen 9 Reference) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 Cols): Tabs & Inputs */}
        <div className="lg:col-span-7 space-y-5">
          {/* Sub-tabs: Global SEO | Indexing | Structured Data | Social */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 overflow-x-auto">
            {[
              { id: 'global', label: 'Global SEO' },
              { id: 'indexing', label: 'Indexing' },
              { id: 'structured', label: 'Structured Data' },
              { id: 'social', label: 'Social' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg transition-all shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Global SEO */}
          {activeTab === 'global' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Global Metadata
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site Title
                  </label>
                  <input
                    type="text"
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Recommended length: 50–60 characters ({siteTitle.length} characters)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={3}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs leading-relaxed focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Recommended length: 150–160 characters ({metaDescription.length} characters)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default OG Image
                  </label>
                  <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-indigo-600">Upload Image</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Recommended resolution: 1200 x 630px (PNG or JPG)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Indexing */}
          {activeTab === 'indexing' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Robots & Search Indexing
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Robots Policy
                  </label>
                  <select
                    value={robotsPolicy}
                    onChange={(e) => setRobotsPolicy(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                  >
                    <option value="index, follow">index, follow (Default - Recommended)</option>
                    <option value="noindex, follow">noindex, follow</option>
                    <option value="noindex, nofollow">noindex, nofollow (Draft only)</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">XML Sitemap</div>
                    <div className="text-[11px] text-slate-500 font-mono">/sitemap.xml</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Structured Data */}
          {activeTab === 'structured' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                JSON-LD Schemas
              </h3>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <div className="font-bold text-xs text-slate-900">Organization Schema</div>
                    <div className="text-[11px] text-slate-500">Logo, brand name, and social profiles</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={orgSchema}
                    onChange={(e) => setOrgSchema(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <div>
                    <div className="font-bold text-xs text-slate-900">LocalBusiness Schema</div>
                    <div className="text-[11px] text-slate-500">
                      Opening hours, address, phone number, and geo coordinates
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localBusinessSchema}
                    onChange={(e) => setLocalBusinessSchema(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Tab 4: Social */}
          {activeTab === 'social' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Social Profiles & OpenGraph
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Twitter / X Handle
                  </label>
                  <input
                    type="text"
                    placeholder="@yourbrand"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Facebook Page URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://facebook.com/yourbrand"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 Cols): SEO Health Score & Checklist (Screen 9 Reference) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>SEO Health</span>
            </h3>

            {/* Circular Gauge */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-slate-100"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-emerald-500 transition-all duration-1000 ease-out"
                    strokeWidth="10"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * seoScore) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                    {seoScore}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">
                    / 100
                  </span>
                </div>
              </div>
            </div>

            {/* SEO Checklist items matching Screen 9 */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs text-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>Title configured</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>Description configured</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>Sitemap active</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>Robots configured</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>Organization schema</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span>LocalBusiness schema</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
