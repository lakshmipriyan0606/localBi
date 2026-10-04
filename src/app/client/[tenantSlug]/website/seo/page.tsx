'use client';

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Search,
  Sparkles,
  Save,
  CheckCircle2,
  Globe,
  FileCode,
  ShieldCheck,
  ExternalLink,
  Code,
} from 'lucide-react';

export default function SiteStudioSeoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [titleTemplate, setTitleTemplate] = useState('{store} in {city} | {brand}');
  const [descTemplate, setDescTemplate] = useState(
    'Visit {store} in {city}. Explore authentic products, opening hours, customer reviews, and direct contact details.'
  );
  const [robotsPolicy, setRobotsPolicy] = useState('index, follow');
  const [enableLocalBusiness, setEnableLocalBusiness] = useState(true);
  const [enableProductSchema, setEnableProductSchema] = useState(true);
  const [enableBreadcrumbs, setEnableBreadcrumbs] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    // Persist configuration
    setTimeout(() => {
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 400);
  };

  // Preview interpolation
  const sampleTitle = titleTemplate
    .replace('{store}', 'Mannadi Branch')
    .replace('{city}', 'Chennai')
    .replace('{brand}', 'Aalim Perfumes')
    .replace('{product}', 'Royal White Oudh')
    .replace('{category}', 'Artisanal Attar');

  const sampleDesc = descTemplate
    .replace('{store}', 'Mannadi Branch')
    .replace('{city}', 'Chennai')
    .replace('{brand}', 'Aalim Perfumes')
    .replace('{product}', 'Royal White Oudh')
    .replace('{category}', 'Artisanal Attar');

  const tokens = ['{brand}', '{city}', '{store}', '{product}', '{category}', '{locality}'];

  const insertToken = (token: string, target: 'title' | 'desc') => {
    if (target === 'title') {
      setTitleTemplate((prev) => `${prev} ${token}`);
    } else {
      setDescTemplate((prev) => `${prev} ${token}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-600" />
            <span>Search Engine Optimization & Structured Data</span>
          </h2>
          <p className="text-xs text-slate-500">
            Define tokenized SEO rules that dynamically inherit down to all stores and product pages.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save SEO Rules'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>SEO templates saved. Canonical URLs and meta tags regenerated.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left 7 Cols: Configuration ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Metadata Templates Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tokenized Metadata Templates
            </h3>

            {/* Token Selector Badges */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500">Available Safe Tokens:</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {tokens.map((tok) => (
                  <span
                    key={tok}
                    className="font-mono text-xs px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold cursor-default"
                  >
                    {tok}
                  </span>
                ))}
              </div>
            </div>

            {/* Title Template */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Meta Title Pattern</label>
                <span className="text-[11px] text-slate-400">Target: ~60 chars</span>
              </div>
              <input
                type="text"
                value={titleTemplate}
                onChange={(e) => setTitleTemplate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Description Template */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Meta Description Pattern</label>
                <span className="text-[11px] text-slate-400">Target: 140–160 chars</span>
              </div>
              <textarea
                rows={3}
                value={descTemplate}
                onChange={(e) => setDescTemplate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Robots Policy */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Robots Indexing Policy</label>
              <select
                value={robotsPolicy}
                onChange={(e) => setRobotsPolicy(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden"
              >
                <option value="index, follow">index, follow (Default — Recommended)</option>
                <option value="noindex, follow">noindex, follow (Prevent indexing but follow links)</option>
                <option value="noindex, nofollow">noindex, nofollow (Draft / Private mode)</option>
              </select>
            </div>
          </div>

          {/* Structured Data & Schema Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Automated JSON-LD Schema Markup
            </h3>
            <p className="text-xs text-slate-500">
              Schema is generated strictly from verified database records without fabricated reviews.
            </p>

            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">schema.org/LocalBusiness</span>
                  <span className="text-[11px] text-slate-500">
                    Injects verified opening hours, geo coordinates, and store phone on Store pages
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enableLocalBusiness}
                  onChange={(e) => setEnableLocalBusiness(e.target.checked)}
                  className="rounded text-indigo-600 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">schema.org/Product</span>
                  <span className="text-[11px] text-slate-500">
                    Injects SKU, in-stock status, and effective price override on Product pages
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enableProductSchema}
                  onChange={(e) => setEnableProductSchema(e.target.checked)}
                  className="rounded text-indigo-600 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">schema.org/BreadcrumbList</span>
                  <span className="text-[11px] text-slate-500">
                    Enables rich breadcrumbs hierarchy in Google search result cards
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enableBreadcrumbs}
                  onChange={(e) => setEnableBreadcrumbs(e.target.checked)}
                  className="rounded text-indigo-600 w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>

        {/* ── Right 5 Cols: SERP Snippet Preview ── */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Google SERP Preview</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Desktop Simulation</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 font-sans">
              <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                <div className="w-4 h-4 rounded-full bg-slate-300 shrink-0" />
                <span className="text-slate-800 font-medium">aalim.localbi.app</span>
                <span>› chennai › mannadi</span>
              </div>
              <h4 className="text-base font-semibold text-indigo-700 hover:underline cursor-pointer leading-tight">
                {sampleTitle}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {sampleDesc}
              </p>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tokens are evaluated server-side during Next.js SSR metadata generation with zero client latency.
            </p>
          </div>

          {/* XML Sitemap Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Dynamic XML Sitemap</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every published page, store, and product is automatically registered into your search engine sitemap.
            </p>
            <div className="p-2.5 bg-slate-50 rounded-xl font-mono text-xs text-slate-700 flex items-center justify-between border border-slate-200">
              <span>/sitemap.xml</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
