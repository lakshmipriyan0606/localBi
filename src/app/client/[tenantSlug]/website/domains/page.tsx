'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Globe,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2,
  Star,
  Check,
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
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
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
        // Exclude any customer-facing *.localbi.app subdomains strictly
        const filtered = data.domains.filter(
          (d: DomainDto) => !d.hostname.endsWith('.localbi.app')
        );
        setDomains(filtered);
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

    if (newHostname.trim().toLowerCase().endsWith('.localbi.app')) {
      setError(
        'LocalBi customer subdomains (*.localbi.app) are not allowed. Please enter your client-owned domain (e.g. www.abc.com).'
      );
      return;
    }

    try {
      setAdding(true);
      setError(null);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          hostname: newHostname.trim().toLowerCase(),
          isPrimary: domains.length === 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewHostname('');
        loadDomains();
      } else {
        setError(data.error || 'Failed to connect domain.');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting domain.');
    } finally {
      setAdding(false);
    }
  };

  const handleVerifyDns = async (domainId: string) => {
    try {
      setVerifyingId(domainId);
      setError(null);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/domains`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          domainId,
          action: 'VERIFY',
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadDomains();
      } else {
        setError(data.error || 'DNS records not yet propagated.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify DNS.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleMakePrimary = async (domainId: string) => {
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/website/domains`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          domainId,
          action: 'MAKE_PRIMARY',
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadDomains();
      }
    } catch {
      alert('Failed to set primary domain');
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain mapping?')) return;
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/website/domains?domainId=${domainId}&brandId=${brandId || ''}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success) {
        loadDomains();
      }
    } catch {
      alert('Failed to remove domain');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const primaryDomain = domains.find((d) => d.isPrimary) || domains[0] || null;

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-600" />
          <span>Domains</span>
        </h2>
        <p className="text-xs text-slate-500">
          Connect and map your client-owned public domain (e.g. www.abc.com or site.abc.com)
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* ── 1. Primary Domain Card (Screen 11 Reference) ── */}
      {primaryDomain ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Primary Domain
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live & Serving
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900 font-mono">
                  {primaryDomain.hostname}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <Check className="w-3.5 h-3.5" /> Connected
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <Check className="w-3.5 h-3.5" /> Verified
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <Check className="w-3.5 h-3.5" /> SSL Active
                  </span>
                </div>
              </div>
            </div>

            <a
              href={`https://${primaryDomain.hostname}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors self-start sm:self-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Website</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-amber-300 p-6 shadow-2xs space-y-2 bg-amber-50/20">
          <div className="font-bold text-sm text-slate-900">No Domain Connected Yet</div>
          <p className="text-xs text-slate-600">
            Connect your client-owned domain below (e.g.{' '}
            <code className="text-indigo-600 font-bold font-mono">www.abc.com</code>) to map your
            website to public traffic.
          </p>
        </div>
      )}

      {/* ── 2. Custom Domain Input Card (Screen 11 Reference) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Connect Client Domain</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add a domain owned by your organization. LocalBi resolves traffic without subdomains or redirects.
          </p>
        </div>

        <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newHostname}
            onChange={(e) => setNewHostname(e.target.value)}
            placeholder="e.g. www.abc.com or site.abc.com"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
          />
          <button
            type="submit"
            disabled={adding || !newHostname.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/30 disabled:opacity-50"
          >
            {adding ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Connect Domain</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── 3. Additional Domains List (if > 1 domain) ── */}
      {domains.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Additional Domains</h3>
          <div className="divide-y divide-slate-100">
            {domains
              .filter((d) => !d.isPrimary)
              .map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span className="font-mono font-semibold text-slate-900">{d.hostname}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                      ✓ Connected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMakePrimary(d.id)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px]"
                    >
                      Make Primary
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(d.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── 4. DNS Configuration Guide (Screen 11 Reference) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>DNS Configuration Instructions</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Log into your domain registrar (GoDaddy, Cloudflare, Namecheap, Route 53) and add the following records:
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Name / Host</th>
                <th className="px-4 py-2.5">Value / Points To</th>
                <th className="px-4 py-2.5 text-right">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
              <tr>
                <td className="px-4 py-3 font-bold text-indigo-600">CNAME</td>
                <td className="px-4 py-3">www (or subdomain)</td>
                <td className="px-4 py-3 text-slate-900 font-bold">cname.vercel-dns.com.</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => copyToClipboard('cname.vercel-dns.com.', 'cname')}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-500"
                  >
                    {copiedKey === 'cname' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-indigo-600">A Record</td>
                <td className="px-4 py-3">@ (apex root)</td>
                <td className="px-4 py-3 text-slate-900 font-bold">76.76.21.21</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => copyToClipboard('76.76.21.21', 'a')}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-500"
                  >
                    {copiedKey === 'a' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
