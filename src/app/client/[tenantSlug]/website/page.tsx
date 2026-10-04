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
} from 'lucide-react';
import { MetricCard } from '@/components/analytics/metric-card';

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
  };
}

export default function SiteStudioOverviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [data, setData] = useState<SiteOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-900 text-sm">Unable to load website status</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{error || 'Please select a brand.'}</p>
      </div>
    );
  }

  const formattedDate = data.lastPublishedAt
    ? new Date(data.lastPublishedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never published';

  return (
    <div className="space-y-6">
      {/* ── Status Banner Card ── */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {data.isLive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Website is Live & Indexable
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Draft / Setup Incomplete
              </span>
            )}
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-300">
              Active Hostname:{' '}
              <span className="font-mono font-bold text-white">
                {data.primaryDomain || 'None configured'}
              </span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            High-Performance Subdomain Experience
          </h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Your LocalBi site delivers fast server-rendered pages for every store, product,
            and landing route with automatic schema markup and zero code required.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href={`/client/${tenantSlug}/website/pages${brandId ? `?brandId=${brandId}` : ''}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <span>Manage Pages</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={`/client/${tenantSlug}/website/design${brandId ? `?brandId=${brandId}` : ''}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
          >
            <Palette className="w-4 h-4" />
            <span>Customize Design</span>
          </Link>
        </div>
      </div>

      {/* ── Key Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Published Pages"
          value={`${data.publishedPagesCount} / ${data.pagesCount}`}
          description={`Last published: ${formattedDate}`}
          trend="neutral"
          icon={<Layers className="w-4 h-4 text-indigo-600" />}
        />
        <MetricCard
          title="Active Stores"
          value={data.storesCount}
          description="Included in store finder & pages"
          trend="neutral"
          icon={<Store className="w-4 h-4 text-emerald-600" />}
        />
        <MetricCard
          title="Catalog Products"
          value={data.productsCount}
          description="Ready with store-specific pricing"
          trend="neutral"
          icon={<Package className="w-4 h-4 text-amber-600" />}
        />
        <MetricCard
          title="Connected Domains"
          value={data.domainsCount}
          description="SSL active & route verified"
          trend="neutral"
          icon={<Server className="w-4 h-4 text-purple-600" />}
        />
      </div>

      {/* ── System Readiness & Health Checks ── */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Website Readiness & SEO Health Checks</span>
          </h3>
          <span className="text-xs text-slate-400">All checks validated server-side</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              {data.health.domainConfigured ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span>Domain & SSL</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {data.health.domainConfigured
                ? 'Valid domain attached with TLS auto-provisioning'
                : 'No custom or subdomain configured'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              {data.health.hasPublishedPages ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span>Landing Pages</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {data.health.hasPublishedPages
                ? `${data.publishedPagesCount} live pages ready for search crawlers`
                : 'All pages in draft mode'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              {data.health.hasStores ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span>Store Integration</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {data.health.hasStores
                ? `${data.storesCount} verified stores synced from LocalBi DB`
                : 'No store locations linked'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tokenized SEO & JSON-LD</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Automated OpenGraph, BreadcrumbList, and LocalBusiness schema
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
