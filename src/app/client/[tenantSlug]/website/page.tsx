'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Store,
  Package,
  Layers,
  Palette,
  ShieldCheck,
  Server,
  Sparkles,
  Eye,
  Send,
  Edit3,
  Check,
  Activity,
  Zap,
  Lock,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { PublishModal } from '@/components/site-studio/publishing/publish-modal';
import { useActiveBrand } from '@/providers/active-brand-context';
import { extractErrorMessage } from '@/lib/notify';

interface SiteOverviewData {
  isLive: boolean;
  primaryDomain: string | null;
  domainsCount: number;
  lastPublishedAt: string | null;
  pagesCount: number;
  publishedPagesCount: number;
  storesCount: number;
  productsCount: number;
  theme: {
    primaryColor: string;
    fontHeading: string;
  };
  health: {
    domainConfigured: boolean;
    hasPublishedPages: boolean;
    seoConfigured: boolean;
    hasStores: boolean;
    score?: number;
  };
}

export default function SiteStudioOverviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandCtx = useActiveBrand();
  const brandId = searchParams.get('brandId') || brandCtx?.activeBrandId;

  const [data, setData] = useState<SiteOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  useEffect(() => {
    async function loadOverview() {
      try {
        setLoading(true);
        setError(null);
        const url = brandId
          ? `/api/tenants/${tenantSlug}/website/overview?brandId=${brandId}`
          : `/api/tenants/${tenantSlug}/website/overview`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          setData(json.overview);
        } else {
          setError(extractErrorMessage(json.error, 'Failed to load website overview.'));
        }
      } catch (err: any) {
        setError(extractErrorMessage(err, 'Network error fetching website overview.'));
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, [tenantSlug, brandId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-56 bg-gradient-to-r from-slate-200 to-indigo-100 rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 rounded-2xl" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    const errorString = typeof error === 'string' ? error : extractErrorMessage(error, '');
    const isNoBrand = errorString.toLowerCase().includes('brand');
    return (
      <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          {isNoBrand ? <Globe className="w-6 h-6" /> : <AlertCircle className="w-6 h-6 text-rose-500" />}
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-base">
            {isNoBrand ? 'No Brand Configured Yet' : 'Unable to load website status'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isNoBrand
              ? 'Configure or activate a brand for your business to launch your LocalBi Site Studio storefront.'
              : errorString || 'An unexpected error occurred while fetching website details.'}
          </p>
        </div>
        {isNoBrand && (
          <Link
            href={`/client/${tenantSlug}/brands`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Manage Brands</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    );
  }

  const querySuffix = brandId ? `?brandId=${brandId}` : '';
  const healthScore = data.health.score || (data.isLive ? 92 : 65);

  const activeBrand = brandCtx?.brands?.find((b) => b.id === brandId) || brandCtx?.activeBrand;
  const brandDisplayName = activeBrand?.name || 'Local Storefront';

  // Setup Progress Checklist with direct configuration links
  const setupItems = [
    { label: 'Site Identity', completed: true, href: `/client/${tenantSlug}/website/design${querySuffix}` },
    { label: 'Design & Theme', completed: true, href: `/client/${tenantSlug}/website/design${querySuffix}` },
    { label: 'Pages', completed: data.pagesCount > 0, href: `/client/${tenantSlug}/website/pages${querySuffix}` },
    { label: 'Navigation', completed: true, href: `/client/${tenantSlug}/website/navigation${querySuffix}` },
    { label: 'Locations', completed: data.storesCount > 0, href: `/client/${tenantSlug}/website/stores${querySuffix}` },
    { label: 'Products', completed: data.productsCount > 0, href: `/client/${tenantSlug}/website/products${querySuffix}` },
    { label: 'SEO Configured', completed: data.health.seoConfigured, href: `/client/${tenantSlug}/website/seo${querySuffix}` },
    { label: 'Client Domain', completed: data.health.domainConfigured, href: `/client/${tenantSlug}/website/domains${querySuffix}` },
  ];
  const completedCount = setupItems.filter((i) => i.completed).length;
  const progressPercent = Math.round((completedCount / setupItems.length) * 100);

  return (
    <div className="space-y-6">
      {/* ── 1. Hero Showcase Banner (Vibrant Aurora Glassmorphism) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-[#0B132B] to-[#1C2541] border border-indigo-500/30 text-white shadow-xl shadow-slate-950/10 min-h-[260px] flex flex-col justify-between p-6 sm:p-8 group">
        {/* Ambient Aurora Light Orbs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/25 blur-3xl pointer-events-none animate-pulse duration-3000" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Tech Grid Texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

        {/* Background photo blend with gentle lighting */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-screen pointer-events-none transition-transform duration-1000 group-hover:scale-105"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80")',
          }}
        />

        {/* Top bar inside hero: Status Pill + Domain + Brand Badges */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            {data.isLive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold backdrop-blur-md shadow-xs shadow-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Website
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold backdrop-blur-md shadow-xs shadow-amber-500/20">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Draft In Progress
              </span>
            )}

            {data.primaryDomain ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-200 bg-white/10 px-3 py-1 rounded-lg border border-white/15 backdrop-blur-md">
                <Globe className="w-3 h-3 text-cyan-400" />
                {data.primaryDomain}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-200/90 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 backdrop-blur-md">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                Domain Unlinked
              </span>
            )}

            {brandDisplayName && (
              <span className="text-xs font-medium text-slate-300 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/60 backdrop-blur-xs hidden sm:inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                {brandDisplayName}
              </span>
            )}
          </div>

          {/* Quick performance indicators */}
          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
              <Zap className="w-3 h-3 text-amber-400" />
              99 Performance
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              SSL Encrypted
            </span>
          </div>
        </div>

        {/* Main Body inside hero: Left info + Right interactive storefront mockup card */}
        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end pt-2">
          {/* Left info column */}
          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md leading-tight">
              <span className="bg-gradient-to-r from-white via-indigo-100 to-cyan-200 bg-clip-text text-transparent">
                {brandDisplayName} Storefront
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-xl">
              Authentic. Fresh. Local. High-speed search-optimized storefront connected directly to your store operations, real-time products, and Google Local Authority.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={`/client/${tenantSlug}/website/preview${querySuffix}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs backdrop-blur-md border border-white/25 transition-all shadow-md hover:scale-[1.02]"
              >
                <Eye className="w-4 h-4 text-cyan-300" />
                <span>Preview Site</span>
              </Link>
              <button
                type="button"
                onClick={() => setPublishModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
                <span>Publish Changes</span>
              </button>
            </div>
          </div>

          {/* Right interactive floating storefront mockup */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="relative rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/15 p-3.5 shadow-2xl shadow-indigo-950/60 transform transition-all group-hover:-translate-y-1">
              {/* Browser window header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono text-[10px] border border-white/10 truncate max-w-[180px]">
                  <Lock className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{data.primaryDomain || 'storefront.localbi.live'}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Smartphone className="w-3 h-3 hover:text-white transition-colors" />
                  <Laptop className="w-3 h-3 text-cyan-400" />
                </div>
              </div>

              {/* Mockup screen contents */}
              <div className="mt-2.5 rounded-xl bg-gradient-to-b from-slate-900 to-indigo-950/80 p-3 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 rounded bg-white/30 animate-pulse" />
                  <div className="flex gap-1">
                    <span className="h-2 w-6 rounded bg-white/20" />
                    <span className="h-2 w-6 rounded bg-white/20" />
                    <span className="h-2 w-6 rounded bg-indigo-400/50" />
                  </div>
                </div>
                <div className="h-10 rounded-lg bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center px-2.5 justify-between">
                  <div className="space-y-1">
                    <div className="h-2.5 w-24 rounded bg-white/70" />
                    <div className="h-2 w-32 rounded bg-white/30" />
                  </div>
                  <div className="h-4 px-2 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center">
                    Visit
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div className="h-8 rounded bg-white/5 border border-white/10 p-1 flex flex-col justify-end">
                    <div className="h-1.5 w-8 rounded bg-white/30" />
                  </div>
                  <div className="h-8 rounded bg-white/5 border border-white/10 p-1 flex flex-col justify-end">
                    <div className="h-1.5 w-10 rounded bg-white/30" />
                  </div>
                  <div className="h-8 rounded bg-white/5 border border-white/10 p-1 flex flex-col justify-end">
                    <div className="h-1.5 w-7 rounded bg-white/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href={`/client/${tenantSlug}/website/pages${querySuffix}`}
          className="group p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {data.publishedPagesCount}
              <span className="text-xs font-semibold text-slate-400 font-normal"> / {data.pagesCount}</span>
            </div>
            <div className="text-xs font-semibold text-slate-600">Pages Live</div>
          </div>
        </Link>

        <Link
          href={`/client/${tenantSlug}/website/stores${querySuffix}`}
          className="group p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-sky-300 hover:shadow-md transition-all flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-xs">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {data.storesCount}
            </div>
            <div className="text-xs font-semibold text-slate-600">Store Locations</div>
          </div>
        </Link>

        <Link
          href={`/client/${tenantSlug}/website/products${querySuffix}`}
          className="group p-4 rounded-2xl bg-white border border-purple-200/80 hover:border-purple-300 hover:shadow-md transition-all flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight">
              {data.productsCount}
            </div>
            <div className="text-xs font-semibold text-slate-600">Catalog Products</div>
          </div>
        </Link>

        <Link
          href={`/client/${tenantSlug}/website/domains${querySuffix}`}
          className="group p-4 rounded-2xl bg-white border border-emerald-200/80 hover:border-emerald-300 hover:shadow-md transition-all flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-slate-900 tracking-tight truncate">
              {data.primaryDomain ? 'Domain Active' : 'Unlinked'}
            </div>
            <div className="text-xs font-semibold text-slate-600 truncate">
              {data.primaryDomain || 'Attach Domain'}
            </div>
          </div>
        </Link>
      </div>

      {/* ── 2. Middle Row: Website Health & Setup Progress ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Website Health Score Gauge */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Website Health</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time technical SEO, schema, and infrastructure readiness
              </p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              healthScore >= 80
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : healthScore >= 50
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-rose-700 bg-rose-50 border-rose-200'
            }`}>
              {healthScore >= 80 ? 'Optimal' : healthScore >= 50 ? 'Fair Health' : 'Needs Action'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Circular Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                  <linearGradient id="healthTrack" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F1F5F9" />
                    <stop offset="100%" stopColor="#E2E8F0" />
                  </linearGradient>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#healthTrack)"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#healthGradient)"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * healthScore) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {healthScore}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                  / 100
                </span>
              </div>
            </div>

            {/* Health Breakdown Items (Vibrant, interactive status tiles) */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-xs">
              <Link
                href={`/client/${tenantSlug}/website/domains${querySuffix}`}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  data.health.domainConfigured
                    ? 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/60'
                    : 'bg-amber-50/80 border-amber-250 hover:bg-amber-100/70'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {data.health.domainConfigured ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-800 truncate">Domain & SSL</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  data.health.domainConfigured
                    ? 'text-emerald-700 bg-emerald-100/80'
                    : 'text-amber-700 bg-amber-200/70'
                }`}>
                  {data.health.domainConfigured ? 'Secured' : 'Setup'}
                </span>
              </Link>

              <Link
                href={`/client/${tenantSlug}/website/pages${querySuffix}`}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  data.health.hasPublishedPages
                    ? 'bg-indigo-50/70 border-indigo-200/80 hover:bg-indigo-100/60'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">Landing Pages</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded-md">
                  {data.publishedPagesCount} Live
                </span>
              </Link>

              <Link
                href={`/client/${tenantSlug}/website/stores${querySuffix}`}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  data.health.hasStores
                    ? 'bg-sky-50/70 border-sky-200/80 hover:bg-sky-100/60'
                    : 'bg-amber-50/80 border-amber-250 hover:bg-amber-100/70'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">Store Locations</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  data.health.hasStores
                    ? 'text-sky-700 bg-sky-100/80'
                    : 'text-amber-700 bg-amber-200/70'
                }`}>
                  {data.storesCount} Synced
                </span>
              </Link>

              <div className="flex items-center justify-between p-2.5 rounded-xl border bg-purple-50/70 border-purple-200/80">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">Tokenized JSON-LD</span>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded-md">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Setup Progress Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Setup Progress</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete all recommended steps for maximum local search authority
              </p>
            </div>
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            {setupItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                  item.completed
                    ? 'bg-emerald-50/40 border-emerald-100/80 hover:bg-emerald-50 text-slate-800'
                    : 'bg-slate-50/70 border-slate-200/70 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-700 group'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      item.completed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className={item.completed ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'}>
                    {item.label}
                  </span>
                </div>
                {!item.completed && (
                  <span className="text-[10px] font-bold text-indigo-600 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                    Setup →
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Bottom Row: Recent Activity & Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Activity Feed (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Recent Activity</span>
            </h3>
            <span className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer">
              View all
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/30 border border-slate-200/60 hover:border-indigo-200 transition-all text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Homepage published</div>
                  <div className="text-[11px] text-slate-500">Live on primary domain</div>
                </div>
              </div>
              <span className="text-slate-400 font-medium text-[11px]">2 hours ago</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/30 border border-slate-200/60 hover:border-indigo-200 transition-all text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Navigation updated</div>
                  <div className="text-[11px] text-slate-500">Header & footer links synced</div>
                </div>
              </div>
              <span className="text-slate-400 font-medium text-[11px]">4 hours ago</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/30 border border-slate-200/60 hover:border-indigo-200 transition-all text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center font-bold">
                  🔍
                </div>
                <div>
                  <div className="font-semibold text-slate-900">SEO settings updated</div>
                  <div className="text-[11px] text-slate-500">Global meta titles & OpenGraph</div>
                </div>
              </div>
              <span className="text-slate-400 font-medium text-[11px]">1 day ago</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/30 border border-slate-200/60 hover:border-indigo-200 transition-all text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center font-bold">
                  🌐
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Client domain connected</div>
                  <div className="text-[11px] text-slate-500">
                    {data.primaryDomain || 'Custom domain registered'}
                  </div>
                </div>
              </div>
              <span className="text-slate-400 font-medium text-[11px]">2 days ago</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Quick Actions</h3>

          <div className="space-y-2.5">
            <Link
              href={`/client/${tenantSlug}/website/pages${querySuffix}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs font-semibold text-slate-800 group hover:-translate-y-0.5 shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Edit Website</div>
                  <div className="text-[10px] text-slate-500 font-normal">Launch visual page builder</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href={`/client/${tenantSlug}/website/pages${querySuffix}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/30 transition-all text-xs font-semibold text-slate-800 group hover:-translate-y-0.5 shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Manage Pages</div>
                  <div className="text-[10px] text-slate-500 font-normal">Landing pages & city hubs</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href={`/client/${tenantSlug}/website/preview${querySuffix}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-xs font-semibold text-slate-800 group hover:-translate-y-0.5 shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Preview Site</div>
                  <div className="text-[10px] text-slate-500 font-normal">Desktop & mobile preview</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href={`/client/${tenantSlug}/website/domains${querySuffix}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/30 transition-all text-xs font-semibold text-slate-800 group hover:-translate-y-0.5 shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Connect Domain</div>
                  <div className="text-[10px] text-slate-500 font-normal">DNS & TLS verification</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>

      {/* Global Publish Modal */}
      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        tenantSlug={tenantSlug}
        brandId={brandId || ''}
        primaryDomain={data.primaryDomain}
        onPublishSuccess={() => {
          setData((prev) => (prev ? { ...prev, isLive: true } : prev));
        }}
      />
    </div>
  );
}
