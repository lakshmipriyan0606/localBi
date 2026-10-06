'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Eye,
  History,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import type { Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { siteStudioPuckConfig } from '@/modules/page-builder/site-studio-puck-config';
import { PageContextProvider } from '@/modules/page-builder/page-context-react';
import { PageContext } from '@/modules/page-builder/page-context-service';

// Dynamically import Puck canvas with SSR disabled so it is code-split
const Puck = dynamic(() => import('@measured/puck').then((mod) => mod.Puck), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-3 text-slate-400">
      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      <span className="text-xs font-semibold">Loading Site Studio Visual Canvas...</span>
    </div>
  ),
});

function sanitizeBlockItem(item: any, idx: number, prefix = 'block'): any {
  if (!item || typeof item !== 'object') return item;
  const props = { ...(item.props || {}) };
  const id = props.id || `${item.type || prefix}-${idx}-${Math.random().toString(36).substring(2, 8)}`;
  props.id = id;

  for (const [key, val] of Object.entries(props)) {
    if (Array.isArray(val)) {
      props[key] = val.map((child, cIdx) => sanitizeBlockItem(child, cIdx, `${id}-${key}`));
    }
  }

  return {
    ...item,
    props,
  };
}

function sanitizeClientPuckData(raw: any): Data {
  if (!raw) return { content: [], root: { props: { title: '' } } };
  const content = (raw.content || []).map((item: any, idx: number) => sanitizeBlockItem(item, idx));
  const zones: Record<string, any[]> = {};
  if (raw.zones && typeof raw.zones === 'object') {
    for (const [zKey, zItems] of Object.entries(raw.zones)) {
      if (Array.isArray(zItems)) {
        zones[zKey] = zItems.map((child, cIdx) => sanitizeBlockItem(child, cIdx, zKey));
      }
    }
  }
  return {
    ...raw,
    content,
    ...(Object.keys(zones).length > 0 ? { zones } : {}),
  };
}

export default function SiteStudioBuilderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const pageId = params.pageId as string;
  const brandId = searchParams.get('brandId');

  // Page & Version State
  const [pageInfo, setPageInfo] = useState<any | null>(null);
  const [templateInfo, setTemplateInfo] = useState<any | null>(null);
  const [puckData, setPuckData] = useState<Data | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [historicalVersions, setHistoricalVersions] = useState<any[]>([]);

  // Editor UI State
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // Debounced autosave ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial page and puckData
  const loadPageData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages/${pageId}/puck`);
      const data = await res.json();
      if (data.success && data.puckData) {
        setPageInfo(data.page);
        setTemplateInfo(data.template);
        setPuckData(sanitizeClientPuckData(data.puckData));
        setCurrentVersion(data.currentVersion);
        setPublishedVersion(data.publishedVersion);
        setHistoricalVersions(data.historicalVersions || []);
      }
    } catch (err) {
      console.error('Failed to load page builder data', err);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, pageId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Handle puck change with debounced save
  const handlePuckChange = (newData: Data) => {
    setPuckData(newData);
    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tenants/${tenantSlug}/website/pages/${pageId}/puck`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puckData: newData }),
        });
        const json = await res.json();
        if (json.success) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2500);
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        setSaveStatus('error');
      }
    }, 1200); // 1.2s debounce
  };

  // Publish latest draft
  const handlePublish = async () => {
    try {
      setPublishing(true);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages/${pageId}/publish`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setPublishSuccess(true);
        setPublishedVersion(data.version);
        setTimeout(() => {
          setPublishSuccess(false);
          setPublishModalOpen(false);
          loadPageData();
        }, 1500);
      } else {
        alert(data.error || 'Failed to publish page.');
      }
    } catch (err) {
      alert('Network error publishing page.');
    } finally {
      setPublishing(false);
    }
  };

  // Rollback to historical version
  const handleRollback = async (targetVersion: number) => {
    if (!templateInfo?.id) return;
    try {
      setRollingBack(true);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages/${pageId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: templateInfo.id,
          targetVersionNumber: targetVersion,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRollbackModalOpen(false);
        loadPageData();
      } else {
        alert(data.error || 'Failed to rollback version.');
      }
    } catch (err) {
      alert('Error rolling back version.');
    } finally {
      setRollingBack(false);
    }
  };

  // Safe Mock PageContext for visual builder preview
  const previewContext: PageContext = {
    tenant: { id: 't1', name: 'Demo Organization', slug: tenantSlug },
    brand: { id: 'b1', name: 'Brand Showcase', slug: 'brand' },
    webSurface: {
      id: 'ws1',
      tenantId: 't1',
      brandId: 'b1',
      type: 'LOCALBI',
      name: 'Main Website',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    domain: {
      id: 'd1',
      tenantId: 't1',
      brandId: 'b1',
      webSurfaceId: 'ws1',
      hostname: 'www.example.com',
      isPrimary: true,
      isVerified: true,
      sslStatus: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    theme: {
      id: 'th1',
      tenantId: 't1',
      brandId: 'b1',
      primaryColor: '#4F46E5',
      secondaryColor: '#0F172A',
      accentColor: '#F59E0B',
      backgroundColor: '#FFFFFF',
      textColor: '#0F172A',
      fontHeading: 'Inter, sans-serif',
      fontBody: 'Inter, sans-serif',
      buttonRadius: '0.5rem',
      cardRadius: '0.75rem',
      customCss: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    cssBlock: ':root { --brand-primary: #4F46E5; }',
    navigation: {
      headerItems: [
        { id: '1', label: 'Home', type: 'INTERNAL_PAGE', target: '/', order: 0 },
        { id: '2', label: 'Locations', type: 'INTERNAL_PAGE', target: '/locations', order: 1 },
        { id: '3', label: 'Catalog', type: 'INTERNAL_PAGE', target: '/products', order: 2 },
      ],
      footerItems: [
        { id: 'f1', label: 'Privacy Policy', type: 'INTERNAL_PAGE', target: '/privacy', order: 0 },
      ],
    },
    pageType: pageInfo?.pageType || 'HOME',
    path: pageInfo?.slug || '/',
    store: {
      id: 's1',
      name: 'Mannadi Storefront',
      addressLine1: 'No. 42 Angappa Naicken Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600001',
      phone: '+91 98400 12345',
      rating: 4.8,
      reviewCount: 142,
    },
    products: [
      { id: 'p1', name: 'Royal White Oudh (12ml)', sku: 'OUD-01', slug: 'royal-white-oudh', basePrice: 2499, currency: 'INR', isAvailable: true },
      { id: 'p2', name: 'Dehn Al Oudh Cambodi', sku: 'OUD-02', slug: 'cambodi-oudh', basePrice: 3899, currency: 'INR', isAvailable: true },
      { id: 'p3', name: 'Mukhallat Rose Petals', sku: 'ATT-03', slug: 'mukhallat-rose', basePrice: 1250, currency: 'INR', isAvailable: true },
    ],
    nearbyStores: [],
    reviews: [
      { id: 'r1', authorName: 'Ibrahim K.', rating: 5, comment: 'Exceptional long-lasting fragrance and polite staff assistance.' },
      { id: 'r2', authorName: 'Saravanan M.', rating: 5, comment: 'Authentic local branch with great variety of attars.' },
    ],
    faqs: [],
    seo: {
      title: 'Storefront | Official LocalBi Website',
      description: 'Official storefront and products.',
      canonicalUrl: `${pageInfo?.slug || '/'}`,
      robots: 'index, follow',
      openGraph: { title: 'Storefront', description: 'Storefront', url: '', siteName: '', type: 'website' },
      twitter: { card: 'summary', title: 'Storefront', description: 'Storefront' },
    },
    structuredData: [],
    breadcrumbs: [{ name: 'Home', url: '/' }],
    trackingContext: {
      tenantSlug,
      brandId: 'b1',
      webSurfaceId: 'ws1',
      pageType: pageInfo?.pageType || 'HOME',
    },
  };

  if (loading || !puckData) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-3 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-xs font-semibold">Loading Page & Visual Elements...</span>
      </div>
    );
  }

  const viewportContainerClass =
    viewport === 'mobile'
      ? 'max-w-[390px] mx-auto border-x border-slate-300 shadow-xl min-h-screen bg-white transition-all duration-300'
      : viewport === 'tablet'
      ? 'max-w-[768px] mx-auto border-x border-slate-300 shadow-xl min-h-screen bg-white transition-all duration-300'
      : 'w-full bg-white transition-all duration-300';

  return (
    <PageContextProvider value={previewContext}>
      <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 -m-4 lg:-m-5">
        {/* ── Top Editor Header Bar ── */}
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs">
          {/* Left: Back & Route Info */}
          <div className="flex items-center gap-3">
            <Link
              href={`/client/${tenantSlug}/website/pages${brandId ? `?brandId=${brandId}` : ''}`}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Back to Pages"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900">
                  {pageInfo?.pageType} Page
                </span>
                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  {pageInfo?.slug}
                </span>
                <span className="text-[11px] text-slate-400">
                  (v{currentVersion})
                </span>
              </div>
            </div>
          </div>

          {/* Center: Viewport Switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewport === 'desktop' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Desktop Viewport"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewport === 'tablet' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tablet (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewport === 'mobile' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Mobile (390px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Autosave status & Publish actions */}
          <div className="flex items-center gap-3">
            {/* Autosave Status */}
            <div className="hidden md:flex items-center text-xs">
              {saveStatus === 'saving' && (
                <span className="text-slate-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                  <span>Saving draft...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Save failed</span>
                </span>
              )}
            </div>

            {/* Rollback Button */}
            {historicalVersions.length > 1 && (
              <button
                type="button"
                onClick={() => setRollbackModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                title="View version history"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">History</span>
              </button>
            )}

            {/* Publish Button */}
            <button
              type="button"
              onClick={() => setPublishModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish</span>
            </button>
          </div>
        </header>

        {/* ── Main Canvas Viewport Container ── */}
        <div className="flex-1 overflow-y-auto">
          <div className={viewportContainerClass}>
            <Puck
              config={siteStudioPuckConfig}
              data={puckData}
              onChange={handlePuckChange}
            />
          </div>
        </div>

        {/* ── Publish Dialog Modal ── */}
        {publishModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Publish Page to Live Website</h3>
                <p className="text-xs text-slate-500">
                  This will atomically promote the current draft layout to the live public subdomain.
                </p>
              </div>

              {publishSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Published Successfully!</p>
                    <p>Live version v{currentVersion} is now active.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Route Slug:</span>
                      <span className="font-mono font-semibold text-slate-900">{pageInfo?.slug}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">New Published Version:</span>
                      <span className="font-bold text-indigo-600">v{currentVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Live Version:</span>
                      <span className="text-slate-600">{publishedVersion ? `v${publishedVersion}` : 'None (Draft only)'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setPublishModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={publishing}
                      onClick={handlePublish}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs flex items-center gap-2"
                    >
                      {publishing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Publishing atomically...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Confirm & Publish</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Rollback History Modal ── */}
        {rollbackModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Version History & Rollback</h3>
                <p className="text-xs text-slate-500">
                  Select an earlier published version to roll back safely. Creates an immutable new version.
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {historicalVersions.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Version {v.version}</span>
                        {v.status === 'PUBLISHED' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Current Live
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(v.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {v.version !== currentVersion && (
                      <button
                        type="button"
                        disabled={rollingBack}
                        onClick={() => handleRollback(v.version)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRollbackModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContextProvider>
  );
}
