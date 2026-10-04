'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Server,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Globe,
  Radio,
} from 'lucide-react';
import { DomainDto } from '@/modules/page-builder/surface-service';

export default function SiteStudioDomainsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [domains, setDomains] = useState<DomainDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHostname, setNewHostname] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadDomains = async () => {
    try {
      setLoading(true);
      const url = brandId
        ? `/api/tenants/${tenantSlug}/website/domains?brandId=${brandId}`
        : `/api/tenants/${tenantSlug}/website/domains`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.domains) {
        setDomains(data.domains);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load domains.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, [tenantSlug, brandId]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostname.trim()) return;

    try {
      setAdding(true);
      setError(null);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          hostname: newHostname,
          isPrimary: domains.length === 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewHostname('');
        loadDomains();
      } else {
        setError(data.error || 'Failed to add domain.');
      }
    } catch (err: any) {
      setError(err.message || 'Error adding domain.');
    } finally {
      setAdding(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" />
            <span>Connected Hostnames & Custom Domains</span>
          </h2>
          <p className="text-xs text-slate-500">
            Publish your website to a custom branded subdomain (e.g. locate.brand.com) with automated TLS.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Connected Domains List ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900">Active Hostnames</h3>

        <div className="space-y-3">
          {domains.map((dom) => (
            <div
              key={dom.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {dom.hostname}
                  </span>
                  {dom.isPrimary && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Primary Domain
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    SSL Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Directs incoming traffic to this brand’s LOCALBI WebSurface.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://${dom.hostname}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <span>Visit Domain</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add Custom Domain Card ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-2xs">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">Connect New Custom Domain</h3>
          <p className="text-xs text-slate-500">
            Enter a subdomain of your brand’s main website. Point a CNAME record to complete verification.
          </p>
        </div>

        <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            required
            placeholder="e.g. locate.aalimperfumes.com"
            value={newHostname}
            onChange={(e) => setNewHostname(e.target.value)}
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{adding ? 'Connecting...' : 'Connect Domain'}</span>
          </button>
        </form>

        {/* DNS Configuration Instructions */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
            <Globe className="w-4 h-4 text-indigo-600" />
            <span>DNS Configuration for Custom Domains</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-semibold">RECORD TYPE</span>
              <span className="font-mono font-bold text-slate-800">CNAME</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-semibold">HOST / NAME</span>
              <span className="font-mono font-bold text-slate-800">locate (or subdomain)</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">VALUE / TARGET</span>
                <span className="font-mono font-bold text-indigo-600">proxy.localbi.app</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard('proxy.localbi.app', 'cname')}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
              >
                {copiedKey === 'cname' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
