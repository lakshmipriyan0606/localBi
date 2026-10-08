'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tag, Search, Check, ChevronsUpDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandCreateDialog } from '@/features/brands/components/brand-create-dialog';
import { useBrandsQuery } from '@/features/brands/hooks/use-brands';

import { useActiveBrand } from '@/providers/active-brand-context';

export interface BrandOption {
  id: string;
  name: string;
  slug: string;
}

export function TopNavBrandSelector({
  brands: initialBrands = [],
  canCreateBrand = false,
}: {
  brands: BrandOption[];
  canCreateBrand?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandCtx = useActiveBrand();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract tenantSlug from pathname (assumes /client/[tenantSlug]/...)
  const segments = pathname.split('/');
  const tenantSlug = segments[1] === 'client' ? segments[2] : (brandCtx?.tenantSlug || '');

  // React Query live brands sync
  const { data: brandData } = useBrandsQuery(tenantSlug, { includeArchived: false });

  // Merge live fetched brands with SSR initialBrands or context brands
  const brands = useMemo(() => {
    if (brandData?.items && Array.isArray(brandData.items) && brandData.items.length > 0) {
      return brandData.items.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
      }));
    }
    if (brandCtx?.brands && brandCtx.brands.length > 0) {
      return brandCtx.brands;
    }
    return initialBrands;
  }, [brandData?.items, brandCtx?.brands, initialBrands]);

  // Persist selected brand across page navigations in localStorage
  const [persistedBrandId, setPersistedBrandId] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined' && tenantSlug) {
      const saved = localStorage.getItem(`localbi_active_brand_${tenantSlug}`);
      if (saved) {
        setPersistedBrandId(saved);
      }
    }
  }, [tenantSlug]);

  const queryBrandId = searchParams.get('brandId');
  const activeBrandId = useMemo(() => {
    if (brandCtx?.activeBrandId) {
      return brandCtx.activeBrandId;
    }
    if (queryBrandId && brands.some((b) => b.id === queryBrandId)) {
      return queryBrandId;
    }
    if (persistedBrandId && brands.some((b) => b.id === persistedBrandId)) {
      return persistedBrandId;
    }
    return brands[0]?.id || '';
  }, [brandCtx?.activeBrandId, queryBrandId, persistedBrandId, brands]);

  const activeBrand = useMemo(() => {
    return brands.find((b) => b.id === activeBrandId) || brands[0];
  }, [brands, activeBrandId]);

  useEffect(() => {
    setSwitching(false);
  }, [searchParams, activeBrandId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  const selectBrand = (id: string) => {
    setOpen(false);
    if (brandCtx) {
      brandCtx.setActiveBrandId(id);
      return;
    }

    if (typeof window !== 'undefined' && tenantSlug) {
      localStorage.setItem(`localbi_active_brand_${tenantSlug}`, id);
      document.cookie = `localbi_active_brand_${tenantSlug}=${id}; path=/; max-age=31536000; SameSite=Lax`;
      setPersistedBrandId(id);
      window.dispatchEvent(new CustomEvent('localbi-brand-changed', { detail: { brandId: id } }));
    }
    setSwitching(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('brandId', id);
    router.push(`${pathname}?${params.toString()}`);
  };

  if ((!brands || brands.length === 0) && (!tenantSlug || !canCreateBrand)) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        id="top-nav-brand-button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs',
          open
            ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
        )}
      >
        {switching ? (
          <RefreshCw className="h-3.5 w-3.5 text-indigo-600 animate-spin flex-shrink-0" />
        ) : (
          <Tag className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Brand:</span>
        <span className="max-w-[130px] truncate sm:max-w-[160px] font-bold text-slate-900">
          {activeBrand?.name || 'Select Brand'}
        </span>
        <ChevronsUpDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-2 py-1 mb-1 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Select Brand
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {brands.length} {brands.length === 1 ? 'brand' : 'brands'}
            </span>
          </div>

          {brands.length > 4 && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brands..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-2.5 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                autoFocus
              />
            </div>
          )}

          {brands.length > 0 && (
            <div className="max-h-56 overflow-y-auto space-y-0.5 mb-1 pb-1">
              {filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => selectBrand(b.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer',
                    b.id === activeBrandId
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span className="truncate">{b.name}</span>
                  {b.id === activeBrandId && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-2.5 py-2 text-xs text-slate-500 italic text-center">
                  No brands match your search
                </div>
              )}
            </div>
          )}

          {tenantSlug && (
            <div className="pt-1 border-t border-slate-100">
              <BrandCreateDialog
                tenantSlug={tenantSlug}
                onSuccess={() => {
                  setOpen(false);
                  router.refresh();
                }}
                triggerTitle="Add New Brand"
                triggerVariant="ghost"
                triggerClassName="flex w-full items-center justify-start rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer text-indigo-700 hover:bg-indigo-50 font-bold border-none shadow-none h-auto gap-2"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
