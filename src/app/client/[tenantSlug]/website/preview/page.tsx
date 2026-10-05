'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Render } from '@measured/puck';
import { siteStudioPuckConfig } from '@/modules/page-builder/site-studio-puck-config';
import { PageContextProvider } from '@/modules/page-builder/page-context-react';
import { PageContext } from '@/modules/page-builder/page-context-service';

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

function sanitizeClientPuckData(raw: any) {
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

export default function SiteStudioPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [puckData, setPuckData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Load brand pages
  useEffect(() => {
    async function loadPages() {
      try {
        setLoading(true);
        const url = brandId
          ? `/api/tenants/${tenantSlug}/website/pages?brandId=${brandId}`
          : `/api/tenants/${tenantSlug}/website/pages`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.pages && data.pages.length > 0) {
          setPages(data.pages);
          setSelectedPageId(data.pages[0].id);
        }
      } catch (err) {
        console.error('Failed to load pages for preview', err);
      } finally {
        setLoading(false);
      }
    }
    loadPages();
  }, [tenantSlug, brandId]);

  // Load puck data for selected page
  useEffect(() => {
    if (!selectedPageId) return;
    async function loadPuck() {
      try {
        const res = await fetch(
          `/api/tenants/${tenantSlug}/website/pages/${selectedPageId}/puck`
        );
        const data = await res.json();
        if (data.success && data.puckData) {
          setPuckData(sanitizeClientPuckData(data.puckData));
        }
      } catch (err) {
        console.error('Failed to load puck data for preview', err);
      }
    }
    loadPuck();
  }, [tenantSlug, selectedPageId]);

  const activePage = pages.find((p) => p.id === selectedPageId);

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
      hostname: `${tenantSlug}.localbi.app`,
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
    pageType: activePage?.pageType || 'HOME',
    path: activePage?.slug || '/',
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
      { id: 'r1', authorName: 'Ibrahim K.', rating: 5, comment: 'Exceptional long-lasting fragrance.' },
    ],
    faqs: [],
    seo: {
      title: 'Preview | LocalBi Site Studio',
      description: 'Preview',
      canonicalUrl: '',
      robots: 'noindex, nofollow',
      openGraph: { title: 'Preview', description: '', url: '', siteName: '', type: 'website' },
      twitter: { card: 'summary', title: 'Preview', description: '' },
    },
    structuredData: [],
    breadcrumbs: [{ name: 'Home', url: '/' }],
    trackingContext: {
      tenantSlug,
      brandId: 'b1',
      webSurfaceId: 'ws1',
      pageType: activePage?.pageType || 'HOME',
    },
  };

  const viewportContainerClass =
    viewport === 'mobile'
      ? 'max-w-[390px] mx-auto border-x border-slate-300 shadow-2xl min-h-screen bg-white transition-all duration-300'
      : viewport === 'tablet'
      ? 'max-w-[768px] mx-auto border-x border-slate-300 shadow-2xl min-h-screen bg-white transition-all duration-300'
      : 'w-full bg-white transition-all duration-300';

  return (
    <PageContextProvider value={previewContext}>
      <div className="min-h-screen flex flex-col bg-slate-200/80 -m-4 lg:-m-5">
        {/* ── Top Preview Bar ── */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href={`/client/${tenantSlug}/website${brandId ? `?brandId=${brandId}` : ''}`}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900">Preview Mode</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Draft (noindex)
              </span>
            </div>

            {pages.length > 0 && (
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-hidden"
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.slug} ({p.pageType})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Viewport Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewport === 'desktop' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewport === 'tablet' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewport === 'mobile' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Mobile View (390px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── Viewport Canvas ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className={viewportContainerClass}>
            {puckData && puckData.content && puckData.content.length > 0 ? (
              <Render config={siteStudioPuckConfig} data={puckData} />
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No visual content in this page draft. Open in Builder to add blocks.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContextProvider>
  );
}
