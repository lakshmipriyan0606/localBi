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
} from 'lucide-react';
import { PublishModal } from '@/components/site-studio/publishing/publish-modal';
import { useActiveBrand } from '@/providers/active-brand-context';

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
          setError(json.error || 'Failed to load website overview.');
        }
      } catch (err: any) {
        setError(err.message || 'Network error fetching website overview.');
      } finally {
        setLoading(false);
      }
    }

    loadOverview();
  }, [tenantSlug, brandId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 rounded-2xl" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    const isNoBrand = error?.toLowerCase().includes('brand');
    return (
      <div className="p-10 rounded-2xl bg-white border border-slate-200 text-center space-y-4 shadow-2xs">
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
              : error || 'An unexpected error occurred while fetching website details.'}
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

  // Setup Progress Checklist calculation
  const setupItems = [
    { label: 'Site Identity', completed: true },
    { label: 'Design & Theme', completed: true },
    { label: 'Pages', completed: data.pagesCount > 0 },
    { label: 'Navigation', completed: true },
    { label: 'Locations', completed: data.storesCount > 0 },
    { label: 'Products', completed: data.productsCount > 0 },
    { label: 'SEO Configured', completed: data.health.seoConfigured },
    { label: 'Client Domain', completed: data.health.domainConfigured },
  ];
  const completedCount = setupItems.filter((i) => i.completed).length;
  const progressPercent = Math.round((completedCount / setupItems.length) * 100);

  return (
    <div className="space-y-6">
      {/* ── 1. Hero Preview Banner Card (Screen 1 Reference) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-lg min-h-[220px] flex flex-col justify-end p-6 sm:p-8">
        {/* Subtle Background Pattern & Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-indigo-950/80 z-10" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80")',
          }}
        />

        <div className="relative z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              {data.isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Website
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Draft In Progress
                </span>
              )}
              {data.primaryDomain && (
                <span className="text-xs font-mono text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                  {data.primaryDomain}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
              Fresh Food, Better Mood
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed drop-shadow-xs">
              Authentic. Fresh. Local. Search-optimized storefront connected directly to your store operations.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`/client/${tenantSlug}/website/preview${querySuffix}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs backdrop-blur-md border border-white/20 transition-all shadow-xs"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Site</span>
            </Link>
            <button
              type="button"
              onClick={() => setPublishModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/40"
            >
              <Send className="w-4 h-4" />
              <span>Publish Changes</span>
            </button>
          </div>
        </div>
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
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Optimal
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Circular Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
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
                  strokeDashoffset={251.2 - (251.2 * healthScore) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {healthScore}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">
                  / 100
                </span>
              </div>
            </div>

            {/* Health Breakdown Items */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                {data.health.domainConfigured ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span className="text-slate-700 font-medium">Domain & SSL</span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                {data.health.hasPublishedPages ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span className="text-slate-700 font-medium">Landing Pages</span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                {data.health.hasStores ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span className="text-slate-700 font-medium">Store Integration</span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-slate-700 font-medium">Tokenized JSON-LD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Setup Progress Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Setup Progress</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete all recommended steps for maximum local search authority
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600">{progressPercent}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            {setupItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 py-1 text-slate-700">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    item.completed
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Check className="w-2.5 h-2.5" />
                </div>
                <span className={item.completed ? 'font-medium' : 'text-slate-400'}>
                  {item.label}
                </span>
              </div>
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
            <span className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer">
              View all
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Homepage published</div>
                  <div className="text-[11px] text-slate-500">Live on primary domain</div>
                </div>
              </div>
              <span className="text-slate-400 font-medium">2 hours ago</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Navigation updated</div>
                  <div className="text-[11px] text-slate-500">Header & footer links synced</div>
                </div>
              </div>
              <span className="text-slate-400 font-medium">4 hours ago</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  🔍
                </div>
                <div>
                  <div className="font-semibold text-slate-900">SEO settings updated</div>
                  <div className="text-[11px] text-slate-500">Global meta titles & OpenGraph</div>
                </div>
              </div>
              <span className="text-slate-400 font-medium">1 day ago</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  🌐
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Client domain connected</div>
                  <div className="text-[11px] text-slate-500">
                    {data.primaryDomain || 'Custom domain registered'}
                  </div>
                </div>
              </div>
              <span className="text-slate-400 font-medium">2 days ago</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Quick Actions</h3>

          <div className="space-y-2.5">
            <Link
              href={`/client/${tenantSlug}/website/pages${querySuffix}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs font-semibold text-slate-800 group"
            >
              <div className="flex items-center gap-3">
                <Edit3 className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span>Edit Website</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href={`/client/${tenantSlug}/website/pages${querySuffix}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs font-semibold text-slate-800 group"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span>Manage Pages</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href={`/client/${tenantSlug}/website/preview${querySuffix}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs font-semibold text-slate-800 group"
            >
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span>Preview Site</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </Link>

            <Link
              href={`/client/${tenantSlug}/website/domains${querySuffix}`}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-xs font-semibold text-slate-800 group"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span>Connect Domain</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
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
