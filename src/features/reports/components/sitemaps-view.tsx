'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Trash2,
  Filter,
  FileCode,
} from 'lucide-react';
import { browserClient } from '@/lib/http/browser-client';
import { notify } from '@/lib/notify';
import type {
  GscSitemapItem,
  GscSitemapsSummary,
} from '@/modules/integrations/google/gsc-sitemaps-service';

export interface SitemapsViewProps {
  tenantSlug: string;
  propertyUrl: string;
}

export function SitemapsView({ tenantSlug, propertyUrl }: SitemapsViewProps) {
  const [data, setData] = useState<GscSitemapsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Sitemap Input
  const [sitemapInput, setSitemapInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Top URL Inspection bar
  const [inspectUrlInput, setInspectUrlInput] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);

  // Filter
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const fetchSitemaps = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await browserClient.get<{ success: boolean; data: GscSitemapsSummary }>(
        `/tenants/${tenantSlug}/reports/gsc/sitemaps`
      );
      if (res.data?.success) {
        setData(res.data.data);
        if (isManualRefresh) {
          notify.success('Updated sitemaps from Google Search Console!');
        }
      }
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to fetch GSC sitemaps');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSitemaps();
  }, [tenantSlug]);

  const handleSubmitSitemap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sitemapInput.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await browserClient.post<{ success: boolean; data: GscSitemapItem }>(
        `/tenants/${tenantSlug}/reports/gsc/sitemaps`,
        { sitemapUrl: sitemapInput.trim() }
      );
      if (res.data?.success) {
        notify.success('Sitemap submitted to Google Search Console!');
        setSitemapInput('');
        await fetchSitemaps();
      }
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to submit sitemap to GSC');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSitemap = async (sitemapUrl: string) => {
    if (!confirm(`Are you sure you want to remove sitemap "${sitemapUrl}" from Google Search Console?`)) {
      return;
    }

    try {
      await browserClient.delete(
        `/tenants/${tenantSlug}/reports/gsc/sitemaps`,
        { data: { sitemapUrl } }
      );
      notify.success('Sitemap removed from Google Search Console');
      await fetchSitemaps();
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to delete sitemap');
    }
  };

  const handleInspectUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const target = inspectUrlInput.trim() || propertyUrl;
    setIsInspecting(true);
    window.location.href = `/client/${tenantSlug}/reports/gsc/pages?inspect=${encodeURIComponent(target)}`;
  };

  const cleanSitePrefix = propertyUrl ? propertyUrl.replace(/\/$/, '') + '/' : 'https://.../';
  const sitemaps = data?.sitemaps || [];
  const filteredSitemaps = sitemaps.filter((s) =>
    s.path.toLowerCase().includes(filterText.toLowerCase())
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#dadce0] bg-white p-12 text-center space-y-3 font-sans">
        <div className="w-8 h-8 border-3 border-[#0f9d58] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-medium text-[#202124]">Connecting to Google Search Console Sitemaps API...</p>
        <p className="text-[11px] text-[#5f6368]">Retrieving submitted XML sitemaps and index status.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Google Search Console URL Inspection Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-2xl rounded-full border border-[#dadce0] bg-white hover:border-[#bdc1c6] focus-within:shadow-md transition-all px-4 py-2 flex items-center gap-3">
          <Search className="w-4 h-4 text-[#5f6368] shrink-0" />
          <form onSubmit={handleInspectUrl} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Inspect any URL in "${propertyUrl}"`}
              value={inspectUrlInput}
              onChange={(e) => setInspectUrlInput(e.target.value)}
              className="w-full bg-transparent text-xs text-[#202124] placeholder-[#5f6368] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isInspecting}
              className="text-xs font-medium text-[#0f9d58] hover:text-[#0b8043] shrink-0 px-2.5 py-1 rounded cursor-pointer disabled:opacity-50"
            >
              Inspect
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => fetchSitemaps(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#dadce0] bg-white hover:bg-slate-50 text-xs font-medium text-[#3c4043] cursor-pointer disabled:opacity-50 self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0f9d58]' : 'text-[#5f6368]'}`} />
          <span>{refreshing ? 'Syncing...' : 'Sync with GSC'}</span>
        </button>
      </div>

      {/* ── Title Header ── */}
      <div>
        <h2 className="text-xl sm:text-2xl font-normal text-[#202124] tracking-tight">
          Sitemaps
        </h2>
      </div>

      {/* ── Card 1: Add a new sitemap (Matching GSC Screenshot 1:1) ── */}
      <div className="rounded-xl border border-[#dadce0] bg-white p-5 sm:p-6 shadow-none">
        <h3 className="text-sm sm:text-base font-normal text-[#202124] mb-4">
          Add a new sitemap
        </h3>

        <form onSubmit={handleSubmitSitemap} className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex items-center border-b border-[#1a73e8] focus-within:border-b-2 py-1.5 px-1 transition-all">
            <span className="text-xs sm:text-sm font-mono text-[#5f6368] select-none truncate shrink-0">
              {cleanSitePrefix}
            </span>
            <input
              type="text"
              placeholder="Enter sitemap URL"
              value={sitemapInput}
              onChange={(e) => setSitemapInput(e.target.value)}
              className="flex-1 min-w-[120px] bg-transparent text-xs sm:text-sm font-mono text-[#202124] placeholder-[#80868b] focus:outline-none pl-1"
            />
          </div>

          <button
            type="submit"
            disabled={!sitemapInput.trim() || isSubmitting}
            className={`px-5 py-2 rounded text-xs font-medium uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              sitemapInput.trim() && !isSubmitting
                ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs'
                : 'bg-[#f1f3f4] text-[#80868b] cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
          </button>
        </form>
      </div>

      {/* ── Card 2: Submitted sitemaps (Matching GSC Screenshot 1:1) ── */}
      <div className="rounded-xl border border-[#dadce0] bg-white p-5 sm:p-6 shadow-none space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm sm:text-base font-normal text-[#202124]">
            Submitted sitemaps
          </h3>

          <div className="flex items-center gap-2">
            {showFilter && (
              <input
                type="text"
                placeholder="Filter by sitemap..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="px-2.5 py-1 text-xs border border-[#dadce0] rounded-md focus:outline-none focus:border-[#1a73e8]"
                autoFocus
              />
            )}
            <button
              type="button"
              onClick={() => setShowFilter(!showFilter)}
              className="p-1.5 rounded-full hover:bg-[#f1f3f4] text-[#5f6368] transition-colors cursor-pointer"
              title="Filter by sitemap"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sitemaps Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#dadce0] text-[#5f6368] text-[11px] font-medium select-none">
                <th className="py-2.5 px-3">Sitemap</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 cursor-pointer hover:text-black">
                    <span>Submitted</span>
                    <span className="text-[10px]">↓</span>
                  </span>
                </th>
                <th className="py-2.5 px-3">Last read</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Discovered pages</th>
                <th className="py-2.5 px-3 text-right">Discovered videos</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f4]">
              {filteredSitemaps.length > 0 ? (
                filteredSitemaps.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[#1a73e8] hover:underline truncate max-w-sm"
                        >
                          {item.path}
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#5f6368]">
                      {item.type}
                    </td>
                    <td className="py-3 px-3 text-[#5f6368] font-mono text-[11px]">
                      {item.submitted}
                    </td>
                    <td className="py-3 px-3 text-[#5f6368] font-mono text-[11px]">
                      {item.lastRead}
                    </td>
                    <td className="py-3 px-3">
                      {item.status === 'Success' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[#137333]">
                          Success
                        </span>
                      ) : item.status === 'Pending' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[#e37400]">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-[#d93025]">
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#202124]">
                      {item.discoveredPages}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#202124]">
                      {item.discoveredVideos}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteSitemap(item.path)}
                        className="p-1 rounded text-[#5f6368] hover:text-[#d93025] hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete sitemap"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#70757a] text-xs">
                    No sitemaps submitted yet. Enter a sitemap URL above (e.g. <span className="font-mono text-[#202124]">sitemap.xml</span>) and click Submit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Pagination Bar (Matching GSC Screenshot) ── */}
        <div className="flex items-center justify-end gap-6 text-xs text-[#5f6368] pt-2 border-t border-[#f1f3f4]">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <span className="font-medium text-[#202124] inline-flex items-center gap-1">
              10 <span className="text-[9px]">▼</span>
            </span>
          </div>

          <div>
            {filteredSitemaps.length > 0
              ? `1-${filteredSitemaps.length} of ${filteredSitemaps.length}`
              : '0-0 of 0'}
          </div>

          <div className="flex items-center gap-2 text-[#5f6368]">
            <button
              disabled
              className="p-1 rounded disabled:opacity-40 cursor-not-allowed"
            >
              &lt;
            </button>
            <button
              disabled
              className="p-1 rounded disabled:opacity-40 cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
