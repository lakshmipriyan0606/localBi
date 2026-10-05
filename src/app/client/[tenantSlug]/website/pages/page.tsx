'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  Plus,
  Edit,
  Eye,
  Send,
  ExternalLink,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  Archive,
  Copy,
  ArrowRight,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/analytics/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { SitePageDto, CreateLandingPageInput } from '@/modules/page-builder/site-studio-service';

export default function SiteStudioPagesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [pages, setPages] = useState<SitePageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');

  // Modal State for Create Page
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPageType, setNewPageType] = useState<string>('LANDING');
  const [newSlug, setNewSlug] = useState('');

  // Publish State
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const loadPages = async () => {
    try {
      setLoading(true);
      const url = brandId
        ? `/api/tenants/${tenantSlug}/website/pages?brandId=${brandId}`
        : `/api/tenants/${tenantSlug}/website/pages`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPages(data.pages);
      }
    } catch (err) {
      console.error('Failed to load pages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, [tenantSlug, brandId]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSlug.trim()) {
      setFormError('Please provide a page title and URL slug.');
      return;
    }

    try {
      setCreating(true);
      setFormError(null);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          name: newTitle,
          pageType: newPageType,
          slug: newSlug,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setNewTitle('');
        setNewSlug('');
        loadPages();
        // Route to builder
        const resolvedId = brandId || data.page?.brandId;
        router.push(
          `/client/${tenantSlug}/website/builder/${data.page.id}${
            resolvedId ? `?brandId=${resolvedId}` : ''
          }`
        );
      } else {
        setFormError(data.error || 'Failed to create page.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error creating page.');
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (pageId: string) => {
    try {
      setPublishingId(pageId);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages/${pageId}/publish`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        loadPages();
      } else {
        alert(data.error || 'Failed to publish page.');
      }
    } catch (err) {
      alert('Network error publishing page.');
    } finally {
      setPublishingId(null);
    }
  };

  // Filtered pages
  const filteredPages = pages.filter((p) => {
    const matchesSearch =
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      p.pageType.toLowerCase().includes(search.toLowerCase()) ||
      (p.storeName && p.storeName.toLowerCase().includes(search.toLowerCase())) ||
      (p.productName && p.productName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const columns: ColumnDef<SitePageDto>[] = [
    {
      key: 'pageType',
      header: 'Page Type',
      accessor: (p) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            {p.pageType}
          </span>
          {p.storeName && (
            <span className="text-xs text-slate-500">({p.storeName})</span>
          )}
          {p.productName && (
            <span className="text-xs text-slate-500">({p.productName})</span>
          )}
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'URL Route',
      accessor: (p) => (
        <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
          {p.slug}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (p) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            p.status === 'PUBLISHED'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {p.status === 'PUBLISHED' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span>{p.status === 'PUBLISHED' ? 'Published' : 'Draft'}</span>
        </span>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      accessor: (p) => (
        <span className="text-xs text-slate-500">
          v{p.latestVersion}
          {p.publishedVersion ? ` (Live: v${p.publishedVersion})` : ''}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      accessor: (p) => (
        <span className="text-xs text-slate-400">
          {new Date(p.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (p) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/client/${tenantSlug}/website/builder/${p.id}${
              brandId ? `?brandId=${brandId}` : ''
            }`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Edit className="w-3 h-3 text-slate-400" />
            <span>Edit</span>
          </Link>

          {p.status !== 'PUBLISHED' && (
            <button
              type="button"
              disabled={publishingId === p.id}
              onClick={() => handlePublish(p.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>{publishingId === p.id ? 'Publishing...' : 'Publish'}</span>
            </button>
          )}

          <a
            href={p.slug}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Preview live"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Bar with Create Page Button ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Website Pages & Templates
          </h2>
          <p className="text-xs text-slate-500">
            Create landing pages, city hubs, store profiles, and catalog showcases without code.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Landing Page</span>
        </button>
      </div>

      {/* ── Data Table ── */}
      <DataTable
        columns={columns}
        data={filteredPages}
        keyExtractor={(p) => p.id}
        isLoading={loading}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search routes or page types..."
        filterControls={
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Pages' : st === 'PUBLISHED' ? 'Live Only' : 'Drafts'}
              </button>
            ))}
          </div>
        }
      />

      {/* ── Create Landing Page Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full shadow-xl space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Create New Page</h3>
              <p className="text-xs text-slate-500">
                Choose a page archetype and custom URL slug for your brand website.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Page Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Artisanal Collection"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (!newSlug) {
                      setNewSlug(
                        '/' +
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, '')
                      );
                    }
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Page Archetype</label>
                <select
                  value={newPageType}
                  onChange={(e) => setNewPageType(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LANDING">Custom Landing Page</option>
                  <option value="STORE">Store Location Profile</option>
                  <option value="PRODUCT">Product Showcase Page</option>
                  <option value="CITY">City Hub Page</option>
                  <option value="SERVICE">Service Offering Page</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">URL Route Slug</label>
                <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 overflow-hidden px-3.5 py-2 text-xs">
                  <span className="text-slate-400 font-mono select-none">/</span>
                  <input
                    type="text"
                    required
                    placeholder="summer-collection"
                    value={newSlug.replace(/^\//, '')}
                    onChange={(e) => setNewSlug('/' + e.target.value.toLowerCase().replace(/[^a-z0-9\-\/]/g, ''))}
                    className="w-full bg-transparent border-0 p-0 text-slate-900 font-mono focus:outline-hidden focus:ring-0 ml-0.5"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Example: /chennai/mannadi or /summer-sale
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
                >
                  {creating ? 'Creating...' : 'Create & Open Builder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
