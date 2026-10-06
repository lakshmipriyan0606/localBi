'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  Plus,
  Edit3,
  Eye,
  Copy,
  Trash2,
  MoreVertical,
  Search,
  Globe,
  Clock,
  CheckCircle2,
  Layers,
  Sparkles,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { TemplatePickerModal } from '@/components/site-studio/pages/template-picker-modal';
import { SitePageDto } from '@/modules/page-builder/site-studio-service';

// Curated thumbnail images for templates to match reference Screen 3
const PAGE_THUMBNAILS: Record<string, string> = {
  HOME: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
  ABOUT: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
  STORE: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=600&q=80',
  PRODUCT: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  CONTACT: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=600&q=80',
  CUSTOM: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80',
  LANDING: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
};

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
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  const handleCreateFromTemplate = async (
    templateType: string,
    templateName: string,
    initialSlug: string
  ) => {
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          name: templateName,
          pageType: templateType,
          slug: initialSlug,
        }),
      });
      const data = await res.json();
      if (data.success && data.page) {
        const queryBrand = brandId ? `?brandId=${brandId}` : '';
        router.push(`/client/${tenantSlug}/website/builder/${data.page.id}${queryBrand}`);
      } else {
        alert(data.error || 'Failed to create page');
      }
    } catch (err) {
      console.error('Error creating page:', err);
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    try {
      setActionLoadingId(pageId);
      setActionMenuOpenId(null);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DUPLICATE',
          brandId,
          pageId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ message: 'Page duplicated successfully!', type: 'success' });
        loadPages();
      } else {
        setNotification({ message: data.error || 'Failed to duplicate page.', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Error duplicating page.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page? This cannot be undone.')) {
      return;
    }
    try {
      setActionLoadingId(pageId);
      setActionMenuOpenId(null);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages?pageId=${pageId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ message: 'Page deleted successfully.', type: 'success' });
        loadPages();
      } else {
        setNotification({ message: data.error || 'Failed to delete page.', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Error deleting page.', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter pages by search and status tab
  const filteredPages = pages.filter((p) => {
    const matchesSearch =
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      p.pageType.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PUBLISHED') return matchesSearch && p.status === 'PUBLISHED';
    if (statusFilter === 'DRAFT') return matchesSearch && p.status !== 'PUBLISHED';
    return matchesSearch;
  });

  const publishedCount = pages.filter((p) => p.status === 'PUBLISHED').length;
  const draftCount = pages.length - publishedCount;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Header Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages by path or title..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 transition-all"
          />
        </div>

        {/* Status Filter Pills & Create Button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              All ({pages.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PUBLISHED')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'PUBLISHED'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'DRAFT'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Draft ({draftCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPickerModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create Page</span>
          </button>
        </div>
      </div>

      {/* ── Page Cards Grid (Screen 3 Reference) ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
          <Layers className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">No pages found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search ? 'No pages match your search term.' : 'Create your first page to start building your website.'}
          </p>
          <button
            type="button"
            onClick={() => setPickerModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Page</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map((page) => {
            const thumbnail =
              PAGE_THUMBNAILS[page.pageType] || PAGE_THUMBNAILS.CUSTOM;
            const isMenuOpen = actionMenuOpenId === page.id;
            const isBusy = actionLoadingId === page.id;

            return (
              <div
                key={page.id}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group"
              >
                {/* Visual Thumbnail */}
                <div className="relative h-36 bg-slate-100 overflow-hidden">
                  <div
                    className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                    style={{ backgroundImage: `url("${thumbnail}")` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />

                  {/* Slug Pill */}
                  <span className="absolute bottom-2.5 left-3 font-mono text-[11px] font-semibold text-white bg-black/40 backdrop-blur-xs px-2.5 py-0.5 rounded-md border border-white/20">
                    {page.slug}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`absolute top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      page.status === 'PUBLISHED'
                        ? 'bg-emerald-500/90 text-white border-emerald-400'
                        : 'bg-amber-500/90 text-white border-amber-400'
                    }`}
                  >
                    ● {page.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                  </span>
                </div>

                {/* Card Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                        {page.slug === '/' ? 'Home' : page.slug.replace('/', '').toUpperCase()}
                      </h4>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActionMenuOpenId(isMenuOpen ? null : page.id)
                          }
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-30 text-xs font-medium">
                            <button
                              type="button"
                              onClick={() => handleDuplicatePage(page.id)}
                              disabled={isBusy}
                              className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Copy className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Duplicate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePage(page.id)}
                              disabled={isBusy}
                              className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        Updated {new Date(page.updatedAt).toLocaleDateString()}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">v{page.latestVersion}</span>
                    </div>
                  </div>

                  {/* Actions on Card */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <Link
                      href={`/client/${tenantSlug}/website/builder/${page.id}${
                        brandId ? `?brandId=${brandId}` : ''
                      }`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-semibold text-xs transition-colors shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit in Puck</span>
                    </Link>

                    <Link
                      href={`/client/${tenantSlug}/website/preview${
                        brandId ? `?brandId=${brandId}` : ''
                      }`}
                      className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                      title="Preview page"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={pickerModalOpen}
        onClose={() => setPickerModalOpen(false)}
        onSelectTemplate={handleCreateFromTemplate}
      />
    </div>
  );
}
