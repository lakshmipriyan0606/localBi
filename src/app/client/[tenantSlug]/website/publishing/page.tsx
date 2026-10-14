'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  Globe,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Server,
  Zap,
  RefreshCw,
  ExternalLink,
  History,
  AlertCircle,
  FileText,
  Lock,
} from 'lucide-react';
import { PublishModal } from '@/components/site-studio/publishing/publish-modal';

interface SiteOverviewDto {
  isLive?: boolean;
  primaryDomain?: string | null;
  brandName?: string;
}

export default function WebsitePublishingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId') || '';

  const [overview, setOverview] = useState<SiteOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const url = brandId
        ? `/api/tenants/${tenantSlug}/website/overview?brandId=${brandId}`
        : `/api/tenants/${tenantSlug}/website/overview`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOverview(data.overview);
      }
    } catch (err) {
      console.error('Failed to load publishing overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [tenantSlug, brandId]);

  const isLive = Boolean(overview?.isLive);
  const primaryDomain = overview?.primaryDomain || null;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Send className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Publishing & Deployments
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-11">
            Manage production releases, verify edge CDN availability, and monitor live website deployments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPublishModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm shadow-indigo-600/30 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>Publish Draft to Live</span>
        </button>
      </div>

      {/* ── Live Deployment Status Banner ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Production Status */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Live Status</span>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live on Production
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Draft Mode
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLive ? 'Active & Serving' : 'Unpublished Draft'}
          </div>
          <p className="text-xs text-slate-500">
            {isLive
              ? 'All published pages are distributed globally via edge CDN caching.'
              : 'Changes are currently in draft and only visible in preview mode.'}
          </p>
        </div>

        {/* Card 2: Connected Domain */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Primary Domain</span>
            <Globe className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 truncate">
            {primaryDomain || 'No custom domain'}
          </div>
          <div className="flex items-center justify-between pt-1">
            <Link
              href={`/client/${tenantSlug}/website/domains${brandId ? `?brandId=${brandId}` : ''}`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Configure Domains & DNS →
            </Link>
            {primaryDomain && (
              <a
                href={`https://${primaryDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-700"
                title="Visit Live URL"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Card 3: Security & Edge CDN */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Security & SSL</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>TLS 1.3 Active</span>
          </div>
          <p className="text-xs text-slate-500">
            Automated Let&apos;s Encrypt certificate renewal with HTTP/2 and edge caching.
          </p>
        </div>
      </div>

      {/* ── Pre-flight Deployment Checklist ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Automated Deployment Pipeline Checklist</h3>
        <p className="text-xs text-slate-500">
          Every time you publish, our deployment pipeline executes these steps atomically:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {[
            {
              title: 'Template & Block Schema Validation',
              desc: 'Ensures all visual builder blocks adhere to strict JSON schema.',
            },
            {
              title: 'SEO Title & Meta Description Compilation',
              desc: 'Generates Open Graph, Twitter Cards, and canonical tags for all active pages.',
            },
            {
              title: 'JSON-LD Structured Data Generation',
              desc: 'Auto-embeds Organization, LocalBusiness, and Breadcrumb schemas.',
            },
            {
              title: 'Instant Global Edge Cache Invalidation',
              desc: 'Purges stale CDN caches across edge locations in under 300ms.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/60"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Publish Modal */}
      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        tenantSlug={tenantSlug}
        brandId={brandId}
        brandName={overview?.brandName}
        primaryDomain={primaryDomain}
        onPublishSuccess={() => {
          fetchOverview();
        }}
      />
    </div>
  );
}
