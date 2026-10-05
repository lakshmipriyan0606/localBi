'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  Globe,
  Layout,
  Palette,
  Compass,
  Store,
  Package,
  Search,
  Server,
  BarChart3,
  ExternalLink,
  Eye,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

interface BrandOption {
  id: string;
  name: string;
  slug: string;
}

export default function SiteStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;

  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  // Fetch available brands for this tenant
  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch(`/api/tenants/${tenantSlug}/brands`);
        const data = await res.json();
        if (data.success && data.brands && data.brands.length > 0) {
          setBrands(data.brands);
          const queryBrandId = searchParams.get('brandId');
          if (queryBrandId && data.brands.some((b: any) => b.id === queryBrandId)) {
            setSelectedBrandId(queryBrandId);
          } else {
            const defaultId = data.brands[0].id;
            setSelectedBrandId(defaultId);
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.set('brandId', defaultId);
            router.replace(`${pathname}?${newParams.toString()}`);
          }
        }
      } catch (err) {
        console.error('Failed to load brands for Site Studio', err);
      } finally {
        setIsLoadingBrands(false);
      }
    }
    loadBrands();
  }, [tenantSlug, pathname, router, searchParams]);

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('brandId', brandId);
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const currentBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];

  const tabs = [
    { label: 'Overview', href: `/client/${tenantSlug}/website`, icon: Layout, exact: true },
    { label: 'Pages', href: `/client/${tenantSlug}/website/pages`, icon: Globe },
    { label: 'Design & Theme', href: `/client/${tenantSlug}/website/design`, icon: Palette },
    { label: 'Navigation', href: `/client/${tenantSlug}/website/navigation`, icon: Compass },
    { label: 'Stores', href: `/client/${tenantSlug}/website/stores`, icon: Store },
    { label: 'Products', href: `/client/${tenantSlug}/website/products`, icon: Package },
    { label: 'SEO Settings', href: `/client/${tenantSlug}/website/seo`, icon: Search, exact: true },
    { label: 'SEO Intelligence', href: `/client/${tenantSlug}/website/seo/intelligence`, icon: Sparkles },
    { label: 'Domains', href: `/client/${tenantSlug}/website/domains`, icon: Server },
    { label: 'Analytics', href: `/client/${tenantSlug}/website/analytics`, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* ── Studio Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-xs">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    LocalBi Site Studio
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Subdomain CMS Active
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Manage SEO landing pages, brand styling, store locators, and live domains without code.
                </p>
              </div>
            </div>
          </div>

          {/* Brand Switcher & Global Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {brands.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Brand:</span>
                <select
                  value={selectedBrandId}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Link
              href={`/client/${tenantSlug}/website/preview?brandId=${selectedBrandId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Preview Site</span>
            </Link>

            {currentBrand && (
              <a
                href={`/site/${currentBrand.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>View Live Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* ── Studio Tab Navigation ── */}
        <div className="flex items-center gap-1 border-t border-slate-100 mt-6 pt-2 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;

            const hrefWithBrand = selectedBrandId
              ? `${tab.href}?brandId=${selectedBrandId}`
              : tab.href;

            return (
              <Link
                key={tab.label}
                href={hrefWithBrand}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50/80 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div>{children}</div>
    </div>
  );
}
