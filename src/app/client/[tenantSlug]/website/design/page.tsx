'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Palette,
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Eye,
  Type,
  Maximize2,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { BrandThemeDto } from '@/modules/page-builder/theme-service';

export default function SiteStudioDesignPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [theme, setTheme] = useState<Partial<BrandThemeDto>>({
    primaryColor: '#4F46E5',
    secondaryColor: '#0F172A',
    accentColor: '#F59E0B',
    backgroundColor: '#FFFFFF',
    textColor: '#0F172A',
    fontHeading: 'Inter, sans-serif',
    fontBody: 'Inter, sans-serif',
    buttonRadius: '0.5rem',
    cardRadius: '0.75rem',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSource, setImportSource] = useState<'ORIGINAL' | 'URL'>('ORIGINAL');
  const [targetUrl, setTargetUrl] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [extractedReview, setExtractedReview] = useState<any | null>(null);

  useEffect(() => {
    async function loadTheme() {
      try {
        setLoading(true);
        const url = brandId
          ? `/api/tenants/${tenantSlug}/website/design?brandId=${brandId}`
          : `/api/tenants/${tenantSlug}/website/design`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.theme) {
          setTheme(data.theme);
        }
      } catch (err) {
        console.error('Failed to load theme', err);
      } finally {
        setLoading(false);
      }
    }
    loadTheme();
  }, [tenantSlug, brandId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveSuccess(false);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/design`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          ...theme,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTheme(data.theme);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'Failed to save theme.');
      }
    } catch (err) {
      alert('Error saving theme.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunImport = async () => {
    try {
      setImporting(true);
      setImportError(null);
      setExtractedReview(null);

      const payload =
        importSource === 'ORIGINAL'
          ? { source: 'ORIGINAL_SURFACE', brandId }
          : { source: 'URL', url: targetUrl };

      const res = await fetch(`/api/tenants/${tenantSlug}/website/design/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setExtractedReview(data.draftDesign);
      } else {
        setImportError(data.error || 'We could not import this site’s visual style.');
      }
    } catch (err: any) {
      setImportError(err.message || 'Error importing design.');
    } finally {
      setImporting(false);
    }
  };

  const handleApplyExtractedTheme = () => {
    if (!extractedReview?.theme) return;
    setTheme((prev) => ({
      ...prev,
      ...extractedReview.theme,
    }));
    setImportModalOpen(false);
    setExtractedReview(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-600" />
            <span>Brand Design & Visual Identity</span>
          </h2>
          <p className="text-xs text-slate-500">
            Define global colors, typography, and card radius tokens applied across all site pages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Import Brand Design</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Brand styling saved successfully. Changes propagated to live CSS tokens.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Form Controls (Left 7 Cols) ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Colors Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Color Palette Tokens
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Primary Brand</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
                  <input
                    type="color"
                    value={theme.primaryColor || '#4F46E5'}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={theme.primaryColor || '#4F46E5'}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="text-xs font-mono font-semibold text-slate-800 bg-transparent border-0 w-full focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Secondary / Slate</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
                  <input
                    type="color"
                    value={theme.secondaryColor || '#0F172A'}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={theme.secondaryColor || '#0F172A'}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                    className="text-xs font-mono font-semibold text-slate-800 bg-transparent border-0 w-full focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Accent / Highlight</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
                  <input
                    type="color"
                    value={theme.accentColor || '#F59E0B'}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={theme.accentColor || '#F59E0B'}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="text-xs font-mono font-semibold text-slate-800 bg-transparent border-0 w-full focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Typography Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Typography Stack
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Headings Font</label>
                <select
                  value={theme.fontHeading || 'Inter, sans-serif'}
                  onChange={(e) => setTheme({ ...theme, fontHeading: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Inter, sans-serif">Inter (Modern Clean Sans)</option>
                  <option value="'Playfair Display', serif">Playfair Display (Editorial Luxury Serif)</option>
                  <option value="'Outfit', sans-serif">Outfit (Contemporary Geometric)</option>
                  <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans (Crisp Tech)</option>
                  <option value="'Merriweather', serif">Merriweather (Classic Warm Serif)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Body Font</label>
                <select
                  value={theme.fontBody || 'Inter, sans-serif'}
                  onChange={(e) => setTheme({ ...theme, fontBody: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Inter, sans-serif">Inter (High Legibility)</option>
                  <option value="'Roboto', sans-serif">Roboto (Clean Neutral)</option>
                  <option value="'Outfit', sans-serif">Outfit (Modern Tech)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Shape & Radius Tokens */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Corner Radius Tendencies
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Button Curvature</label>
                <select
                  value={theme.buttonRadius || '0.5rem'}
                  onChange={(e) => setTheme({ ...theme, buttonRadius: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden"
                >
                  <option value="0px">Sharp (0px)</option>
                  <option value="0.375rem">Subtle Rounded (6px)</option>
                  <option value="0.5rem">Standard Rounded (8px)</option>
                  <option value="0.75rem">Smooth Curved (12px)</option>
                  <option value="9999px">Pill / Full Oval (9999px)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Card Curvature</label>
                <select
                  value={theme.cardRadius || '0.75rem'}
                  onChange={(e) => setTheme({ ...theme, cardRadius: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden"
                >
                  <option value="0px">Sharp (0px)</option>
                  <option value="0.5rem">Small (8px)</option>
                  <option value="0.75rem">Medium (12px)</option>
                  <option value="1rem">Large (16px)</option>
                  <option value="1.5rem">Extra Large (24px)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Live Interactive Preview Card (Right 5 Cols) ── */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Real-Time Component Preview</span>
            </span>
            <span className="text-[11px] text-slate-400">Tokens Injected Live</span>
          </div>

          <div
            className="p-6 bg-white border border-slate-200 shadow-sm space-y-6 transition-all"
            style={{
              borderRadius: theme.cardRadius || '12px',
              fontFamily: theme.fontBody || 'Inter, sans-serif',
            }}
          >
            {/* Header Preview */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: theme.primaryColor || '#4F46E5' }}
                >
                  B
                </div>
                <span
                  className="font-bold text-sm tracking-tight text-slate-900"
                  style={{ fontFamily: theme.fontHeading || 'Inter, sans-serif' }}
                >
                  Brand Showcase
                </span>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-95 shadow-2xs"
                style={{
                  backgroundColor: theme.primaryColor || '#4F46E5',
                  borderRadius: theme.buttonRadius || '8px',
                }}
              >
                Call Store
              </button>
            </div>

            {/* Hero Section Preview */}
            <div className="space-y-3">
              <span
                className="inline-block px-2.5 py-0.5 text-[11px] font-bold tracking-wide"
                style={{
                  color: theme.accentColor || '#F59E0B',
                  backgroundColor: `${theme.accentColor || '#F59E0B'}15`,
                  borderRadius: theme.buttonRadius || '8px',
                }}
              >
                ★ Verified Storefront
              </span>

              <h4
                className="text-xl font-bold tracking-tight text-slate-900 leading-snug"
                style={{ fontFamily: theme.fontHeading || 'Inter, sans-serif' }}
              >
                Luxury Fragrances & Attars
              </h4>

              <p className="text-xs text-slate-600 leading-relaxed">
                Experience authentic artisanal perfumery in-store or order online via WhatsApp with same-day dispatch.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-bold text-white shadow-2xs"
                  style={{
                    backgroundColor: theme.primaryColor || '#4F46E5',
                    borderRadius: theme.buttonRadius || '8px',
                  }}
                >
                  Get Directions
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100"
                  style={{
                    borderRadius: theme.buttonRadius || '8px',
                  }}
                >
                  View Catalog
                </button>
              </div>
            </div>

            {/* Product Card Preview */}
            <div
              className="p-4 bg-slate-50 border border-slate-200/80 space-y-2"
              style={{ borderRadius: theme.cardRadius || '12px' }}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Royal White Oudh (12ml)</span>
                <span style={{ color: theme.primaryColor || '#4F46E5' }}>₹2,499</span>
              </div>
              <p className="text-[11px] text-slate-500">
                In-stock at Mannadi branch with price override applied.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Brand Design Import Modal ── */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full shadow-xl space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>AI-Assisted Design Extraction</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Import Style From Original Website
              </h3>
              <p className="text-xs text-slate-500">
                Analyzes colors, fonts, and tendencies from your brand website with strict SSRF protection.
                Does not clone HTML or proprietary articles.
              </p>
            </div>

            {importError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {!extractedReview ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="importSrc"
                      checked={importSource === 'ORIGINAL'}
                      onChange={() => setImportSource('ORIGINAL')}
                      className="text-indigo-600"
                    />
                    <span>Verified Brand Website (ORIGINAL WebSurface)</span>
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="importSrc"
                      checked={importSource === 'URL'}
                      onChange={() => setImportSource('URL')}
                      className="text-indigo-600"
                    />
                    <span>Specific Website URL</span>
                  </label>
                </div>

                {importSource === 'URL' && (
                  <div className="space-y-1.5 pl-6">
                    <input
                      type="url"
                      placeholder="https://brandwebsite.com"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Private IP ranges and loopbacks are strictly blocked.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleRunImport}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs flex items-center gap-2"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing Website...</span>
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="w-3.5 h-3.5" />
                        <span>Extract Visual Tokens</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Human Review Step */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span>Detected Design Tokens</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block">Primary</span>
                      <div
                        className="w-5 h-5 mx-auto rounded-full my-1 border border-slate-200"
                        style={{ backgroundColor: extractedReview.theme.primaryColor }}
                      />
                      <span className="text-[10px] font-mono text-slate-600">
                        {extractedReview.theme.primaryColor}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block">Secondary</span>
                      <div
                        className="w-5 h-5 mx-auto rounded-full my-1 border border-slate-200"
                        style={{ backgroundColor: extractedReview.theme.secondaryColor }}
                      />
                      <span className="text-[10px] font-mono text-slate-600">
                        {extractedReview.theme.secondaryColor}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block">Accent</span>
                      <div
                        className="w-5 h-5 mx-auto rounded-full my-1 border border-slate-200"
                        style={{ backgroundColor: extractedReview.theme.accentColor }}
                      />
                      <span className="text-[10px] font-mono text-slate-600">
                        {extractedReview.theme.accentColor}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 pt-1">
                    <p>
                      <strong>Heading Font:</strong> {extractedReview.theme.fontHeading}
                    </p>
                    <p>
                      <strong>Button Radius:</strong> {extractedReview.theme.buttonRadius}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setExtractedReview(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Retry / Back
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyExtractedTheme}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    Apply Theme Tokens
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
