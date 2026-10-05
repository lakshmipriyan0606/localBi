'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  MapPin,
  Laptop,
  Smartphone,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface AnalysisFormProps {
  tenantSlug: string;
  brandId?: string;
  onAnalysisStarted: (analysisId: string) => void;
}

export function AnalysisForm({ tenantSlug, brandId, onAnalysisStarted }: AnalysisFormProps) {
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState(brandId || '');
  const [surfaces, setSurfaces] = useState<any[]>([]);
  const [selectedSurfaceId, setSelectedSurfaceId] = useState('');
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchLocation, setSearchLocation] = useState('Chennai');
  const [country] = useState('IN');
  const [device, setDevice] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Brands
  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch(`/api/tenants/${tenantSlug}/brands`);
        const data = await res.json();
        if (data.success && data.brands) {
          setBrands(data.brands);
          if (!selectedBrandId && data.brands.length > 0) {
            setSelectedBrandId(data.brands[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load brands', e);
      }
    }
    loadBrands();
  }, [tenantSlug]);

  // Load WebSurfaces for Brand
  useEffect(() => {
    if (!selectedBrandId) return;
    async function loadSurfaces() {
      try {
        const res = await fetch(`/api/tenants/${tenantSlug}/website/surfaces?brandId=${selectedBrandId}`);
        const data = await res.json();
        if (data.success && data.surfaces && data.surfaces.length > 0) {
          setSurfaces(data.surfaces);
          setSelectedSurfaceId(data.surfaces[0].id);
        } else {
          // Fallback surface
          const fallback = [{ id: 'default_localbi', name: 'LocalBi Subdomain Website', type: 'LOCALBI' }];
          setSurfaces(fallback);
          setSelectedSurfaceId('default_localbi');
        }
      } catch {
        const fallback = [{ id: 'default_localbi', name: 'LocalBi Subdomain Website', type: 'LOCALBI' }];
        setSurfaces(fallback);
        setSelectedSurfaceId('default_localbi');
      }
    }
    loadSurfaces();
  }, [tenantSlug, selectedBrandId]);

  // Load LocalBi Pages
  useEffect(() => {
    if (!selectedBrandId) return;
    async function loadPages() {
      try {
        const res = await fetch(`/api/tenants/${tenantSlug}/website/pages?brandId=${selectedBrandId}`);
        const data = await res.json();
        if (data.success && data.pages) {
          setPages(data.pages);
          if (data.pages.length > 0) {
            setSelectedPageId(data.pages[0].id);
            setTargetUrl(data.pages[0].slug ? `https://${tenantSlug}.localbi.site/${data.pages[0].slug}` : 'https://example.com');
          }
        }
      } catch (e) {
        console.error('Failed to load pages', e);
      }
    }
    loadPages();
  }, [tenantSlug, selectedBrandId]);

  const currentSurface = surfaces.find((s) => s.id === selectedSurfaceId) || surfaces[0];
  const isLocalBi = currentSurface?.type !== 'ORIGINAL';

  const handlePageSelect = (pageId: string) => {
    setSelectedPageId(pageId);
    const p = pages.find((pg) => pg.id === pageId);
    if (p) {
      setTargetUrl(`https://${tenantSlug}.localbi.site/${p.slug.replace(/^\//, '')}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      setError('Please provide a target keyword to analyze.');
      return;
    }
    if (!targetUrl.trim()) {
      setError('Please provide a target URL.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/seo/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          webSurfaceId: selectedSurfaceId,
          pageId: isLocalBi ? selectedPageId : undefined,
          targetUrl,
          keyword,
          searchLocation,
          country,
          device,
        }),
      });

      const data = await res.json();
      if (data.success && data.analysisId) {
        onAnalysisStarted(data.analysisId);
      } else {
        setError(data.error || 'Failed to start analysis.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error initiating analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
          <Search className="w-4 h-4" />
          <span>Run SEO Competitor & Keyword Intelligence</span>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
          Deterministic + Factual
        </span>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Brand */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Target Brand</label>
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Website Surface */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">WebSurface</label>
          <select
            value={selectedSurfaceId}
            onChange={(e) => setSelectedSurfaceId(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {surfaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type || 'LOCALBI'})
              </option>
            ))}
          </select>
        </div>

        {/* Page / Target URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            {isLocalBi ? 'Canonical LocalBi Page' : 'Target Page URL'}
          </label>
          {isLocalBi && pages.length > 0 ? (
            <select
              value={selectedPageId}
              onChange={(e) => handlePageSelect(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (/{p.slug})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/services"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          )}
        </div>

        {/* Primary Keyword */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Primary Keyword</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. oud perfume chennai"
            className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Search Location */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Search Location Context</label>
          <div className="relative">
            <input
              type="text"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              placeholder="e.g. Chennai"
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Device */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Device Simulator</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDevice('DESKTOP')}
              className={`flex-1 py-2 px-3 text-xs rounded-xl flex items-center justify-center gap-1.5 font-medium border transition-colors ${
                device === 'DESKTOP'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice('MOBILE')}
              className={`flex-1 py-2 px-3 text-xs rounded-xl flex items-center justify-center gap-1.5 font-medium border transition-colors ${
                device === 'MOBILE'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          Target URL: <span className="font-mono text-slate-600">{targetUrl}</span>
        </span>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Starting Analysis...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Run SEO Analysis</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
