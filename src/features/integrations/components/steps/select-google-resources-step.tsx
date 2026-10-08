'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Info,
  Search,
  Building2,
  Globe,
  BarChart3,
  Store,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  Sparkles,
} from 'lucide-react';
import { GoogleProductIcon, GoogleProduct } from '../google-product-icon';
import { BrandResourceSetupModal } from '../brand-resource-setup-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export interface DiscoveredResource {
  id: string;
  provider: string; // GOOGLE_SEARCH_CONSOLE | GOOGLE_ANALYTICS_4 | GOOGLE_BUSINESS_PROFILE
  product: GoogleProduct;
  resourceType: 'PROPERTY' | 'LOCATION';
  resourceName: string;
  externalResourceId: string;
  accountName?: string;
  locationAddress?: string;
  propertyId?: string;
}

export interface BrandOption {
  id: string;
  name: string;
  slug: string;
  domain?: string;
}

export interface SelectGoogleResourcesStepProps {
  email: string;
  brands: BrandOption[];
  resources: DiscoveredResource[];
  // Mapping state: map from resource.id to brandId (or undefined if unmapped)
  mappings: Record<string, string>;
  onUpdateMapping: (resourceId: string, brandId: string | null) => void;
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
  onBack: () => void;
  onContinue: () => void;
  onChangeAccount: () => void;
  onOpenManualGscModal?: () => void;
  newResourceIds?: Set<string>;
}

const BRAND_AVATAR_COLORS = [
  'bg-purple-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-teal-600',
];

const BRANDS_PER_PAGE = 8;

export function SelectGoogleResourcesStep({
  email,
  brands,
  resources,
  mappings,
  onUpdateMapping,
  onRefresh,
  isRefreshing = false,
  onBack,
  onContinue,
  onChangeAccount,
  onOpenManualGscModal,
  newResourceIds,
}: SelectGoogleResourcesStepProps) {
  // Tabs: 'all-brands' | 'mapped-brands' | 'unmapped-brands' | 'unmapped-resources'
  const [activeTab, setActiveTab] = useState<
    'all-brands' | 'mapped-brands' | 'unmapped-brands' | 'unmapped-resources'
  >('all-brands');

  // Search input
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state for brands
  const [currentPage, setCurrentPage] = useState(1);

  // Active brand being edited in BrandResourceSetupModal
  const [editingBrand, setEditingBrand] = useState<BrandOption | null>(null);

  // Map each brand to its mapped resources
  const brandResourcesMap = useMemo(() => {
    const map = new Map<string, DiscoveredResource[]>();
    brands.forEach((b) => map.set(b.id, []));

    resources.forEach((r) => {
      const targetBrandId = mappings[r.id];
      if (targetBrandId && map.has(targetBrandId)) {
        map.get(targetBrandId)!.push(r);
      }
    });

    return map;
  }, [brands, resources, mappings]);

  // Unmapped resources pool
  const unmappedResources = useMemo(() => {
    return resources.filter((r) => !mappings[r.id]);
  }, [resources, mappings]);

  // Brand statistics
  const { readyBrandsCount, pendingBrandsCount, totalMappedResourcesCount } = useMemo(() => {
    let ready = 0;
    let pending = 0;
    let mappedTotal = 0;

    brands.forEach((b) => {
      const items = brandResourcesMap.get(b.id) || [];
      if (items.length > 0) {
        ready++;
        mappedTotal += items.length;
      } else {
        pending++;
      }
    });

    return {
      readyBrandsCount: ready,
      pendingBrandsCount: pending,
      totalMappedResourcesCount: mappedTotal,
    };
  }, [brands, brandResourcesMap]);

  // Filtered brands based on search and active tab
  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => {
      const brandItems = brandResourcesMap.get(brand.id) || [];
      const isMapped = brandItems.length > 0;

      // Tab filter
      if (activeTab === 'mapped-brands' && !isMapped) return false;
      if (activeTab === 'unmapped-brands' && isMapped) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = brand.name.toLowerCase().includes(q);
        const matchDomain = (brand.domain || '').toLowerCase().includes(q);
        const matchSlug = brand.slug.toLowerCase().includes(q);
        const matchRes = brandItems.some(
          (r) =>
            r.resourceName.toLowerCase().includes(q) ||
            r.externalResourceId.toLowerCase().includes(q) ||
            (r.propertyId || '').toLowerCase().includes(q)
        );

        if (!matchName && !matchDomain && !matchSlug && !matchRes) return false;
      }

      return true;
    });
  }, [brands, brandResourcesMap, activeTab, searchQuery]);

  // Paginated brands for rendering
  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / BRANDS_PER_PAGE));
  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * BRANDS_PER_PAGE;
    return filteredBrands.slice(start, start + BRANDS_PER_PAGE);
  }, [filteredBrands, currentPage]);

  // Handle pagination navigation
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Next brand navigation inside the modal
  const handleNextBrandInModal = () => {
    if (!editingBrand) return;
    const currentIndex = brands.findIndex((b) => b.id === editingBrand.id);
    if (currentIndex >= 0 && currentIndex < brands.length - 1) {
      setEditingBrand(brands[currentIndex + 1]);
    }
  };

  const hasNextBrand = Boolean(
    editingBrand &&
      brands.findIndex((b) => b.id === editingBrand.id) < brands.length - 1
  );

  return (
    <div className="max-w-5xl mx-auto w-full pt-2 pb-16 space-y-6 animate-in fade-in-50 duration-200">
      {/* Header and Top Summary */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Select &amp; Map Google Resources
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Easily assign Google Analytics 4, Search Console, and Store profiles brand by brand. Supports large-scale accounts with 30+ brands.
          </p>
        </div>

        {/* Global Scalability Stats Bar */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-[11px] font-semibold text-slate-600 shrink-0 self-start sm:self-auto shadow-2xs">
          <span className="font-bold text-slate-900">{brands.length} Brands</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 font-bold">{readyBrandsCount} Configured</span>
          <span className="text-slate-300">•</span>
          <span className={cn(pendingBrandsCount > 0 ? 'text-amber-700 font-bold' : 'text-slate-500')}>
            {pendingBrandsCount} Needs Setup
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-indigo-700 font-bold">{resources.length} Google Items</span>
        </div>
      </div>

      {/* Filter Row: Tabs + Search + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Navigation Tabs */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1 self-start sm:self-auto shadow-2xs overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => {
              setActiveTab('all-brands');
              setCurrentPage(1);
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'all-brands'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            All Brands ({brands.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('mapped-brands');
              setCurrentPage(1);
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              activeTab === 'mapped-brands'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Configured ({readyBrandsCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('unmapped-brands');
              setCurrentPage(1);
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              activeTab === 'unmapped-brands'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Needs Setup ({pendingBrandsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unmapped-resources')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5',
              activeTab === 'unmapped-resources'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Unmapped Pool ({unmappedResources.length})
          </button>
        </div>

        {/* Right Controls: Search + Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
          {activeTab !== 'unmapped-resources' && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder={`Search across ${brands.length} brands...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-44 sm:w-56 shadow-2xs text-slate-800"
              />
            </div>
          )}

          {/* Check for new resources button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Query Google APIs to discover any newly added GBP Stores, GSC sites, or GA4 properties without logging into Google again"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-indigo-600', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{isRefreshing ? 'Checking...' : 'Check for new resources'}</span>
          </button>
        </div>
      </div>

      {/* Newly Discovered Notification Banner */}
      {newResourceIds && newResourceIds.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-blue-50/90 border border-blue-200 shadow-2xs text-xs text-blue-900 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Discovered {newResourceIds.size} new resource(s) from your Google account!</strong> Click &quot;Setup Resources&quot; on any brand to link them.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('unmapped-resources')}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer self-start sm:self-auto shrink-0"
          >
            View Unmapped Pool ({unmappedResources.length})
          </button>
        </div>
      )}

      {/* ── VIEW 1: BRAND DIRECTORY LIST (Optimized for 1 to 50+ Brands) ── */}
      {activeTab !== 'unmapped-resources' && (
        <div className="space-y-4">
          {paginatedBrands.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {paginatedBrands.map((brand, idx) => {
                const brandGlobalIndex = brands.findIndex((b) => b.id === brand.id);
                const avatarBg =
                  BRAND_AVATAR_COLORS[Math.max(0, brandGlobalIndex) % BRAND_AVATAR_COLORS.length];
                const brandInitial = (brand.name || 'B').charAt(0).toUpperCase();
                const domainDisplay = brand.domain || `${brand.slug}.localbi.app`;

                const brandItems = brandResourcesMap.get(brand.id) || [];
                const gscItem = brandItems.find((r) => r.product === 'GSC');
                const ga4Item = brandItems.find((r) => r.product === 'GA4');
                const gbpItem = brandItems.find((r) => r.product === 'GBP');

                const isConfigured = brandItems.length > 0;

                return (
                  <div
                    key={brand.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Brand Identity */}
                    <div className="flex items-center gap-3.5 min-w-0 md:w-1/3">
                      <div
                        className={cn(
                          'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-2xs shrink-0',
                          avatarBg
                        )}
                      >
                        {brandInitial}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          {brand.name}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
                          {domainDisplay}
                        </p>
                      </div>
                    </div>

                    {/* Product Chips Overview */}
                    <div className="flex items-center gap-2 flex-wrap md:flex-1 min-w-0">
                      {/* GA4 Chip */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border shadow-2xs max-w-[200px] truncate',
                          ga4Item
                            ? 'bg-amber-50/80 text-amber-900 border-amber-200/80'
                            : 'bg-slate-50 text-slate-400 border-slate-200/60'
                        )}
                        title={ga4Item ? `GA4: ${ga4Item.resourceName}` : 'No GA4 property linked'}
                      >
                        <GoogleProductIcon product="GA4" size="sm" />
                        <span className="truncate">
                          {ga4Item ? ga4Item.propertyId || ga4Item.resourceName : 'GA4: None'}
                        </span>
                      </span>

                      {/* GSC Chip */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border shadow-2xs max-w-[220px] truncate',
                          gscItem
                            ? 'bg-blue-50/80 text-blue-900 border-blue-200/80'
                            : 'bg-slate-50 text-slate-400 border-slate-200/60'
                        )}
                        title={gscItem ? `GSC: ${gscItem.resourceName}` : 'No GSC property linked'}
                      >
                        <GoogleProductIcon product="GSC" size="sm" />
                        <span className="truncate">
                          {gscItem ? gscItem.resourceName : 'GSC: None'}
                        </span>
                      </span>

                      {/* GBP Chip */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border shadow-2xs max-w-[180px] truncate',
                          gbpItem
                            ? 'bg-emerald-50/80 text-emerald-900 border-emerald-200/80'
                            : 'bg-slate-50 text-slate-400 border-slate-200/60'
                        )}
                        title={gbpItem ? `GBP: ${gbpItem.resourceName}` : 'No GBP store linked'}
                      >
                        <GoogleProductIcon product="GBP" size="sm" />
                        <span className="truncate">
                          {gbpItem ? gbpItem.resourceName : 'GBP: None'}
                        </span>
                      </span>
                    </div>

                    {/* Status Badge & Action Button */}
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      {isConfigured ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          {brandItems.length} {brandItems.length === 1 ? 'item' : 'items'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                          <AlertCircle className="w-3 h-3 stroke-[2]" />
                          Needs Setup
                        </span>
                      )}

                      <Button
                        type="button"
                        onClick={() => setEditingBrand(brand)}
                        className={cn(
                          'text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer',
                          isConfigured
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-[#3B49DF] hover:bg-indigo-700 text-white'
                        )}
                      >
                        {isConfigured ? 'Edit Mapping' : 'Setup Resources →'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">No brands match your filter</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try clearing your search query or switching to &quot;All Brands&quot;.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all-brands');
                }}
                className="text-xs font-semibold rounded-xl"
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Pagination Controls for Large Brand Portfolios */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs text-slate-600">
              <span className="font-medium">
                Showing{' '}
                <strong className="text-slate-900 font-bold">
                  {(currentPage - 1) * BRANDS_PER_PAGE + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-900 font-bold">
                  {Math.min(currentPage * BRANDS_PER_PAGE, filteredBrands.length)}
                </strong>{' '}
                of <strong className="text-slate-900 font-bold">{filteredBrands.length}</strong> brands
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="text-xs rounded-xl h-8 px-2.5 cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Prev
                </Button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => handlePageChange(pg)}
                      className={cn(
                        'w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                        currentPage === pg
                          ? 'bg-[#3B49DF] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {pg}
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="text-xs rounded-xl h-8 px-2.5 cursor-pointer disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 2: UNMAPPED RESOURCES POOL ── */}
      {activeTab === 'unmapped-resources' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Unassigned Google Resources
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {unmappedResources.length} available to claim
            </span>
          </div>

          {unmappedResources.length > 0 ? (
            <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {unmappedResources.map((res) => (
                <div
                  key={res.id}
                  className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <GoogleProductIcon product={res.product} size="md" />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800">
                          {res.product === 'GSC'
                            ? 'Google Search Console'
                            : res.product === 'GA4'
                            ? 'Google Analytics 4'
                            : 'Google Business Profile'}
                        </p>
                        {newResourceIds?.has(res.id) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs animate-pulse">
                            ✨ NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {res.resourceName || res.externalResourceId}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {res.product === 'GA4' && res.propertyId
                          ? `Property: ${res.propertyId}`
                          : res.product === 'GSC'
                          ? res.externalResourceId
                          : res.locationAddress || res.externalResourceId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span className="text-[11px] text-slate-500 font-medium">Map to:</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          onUpdateMapping(res.id, e.target.value);
                        }
                      }}
                      className="text-xs bg-white border border-indigo-200 font-bold text-indigo-700 rounded-xl px-2.5 py-1.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer hover:bg-indigo-50/40 transition-colors"
                    >
                      <option value="" disabled>
                        Select brand ▼
                      </option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">All Google resources are mapped</h4>
              <p className="text-xs text-slate-500">
                Every discovered property has been assigned to a LocalBi brand.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info Tip Banner */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900 leading-relaxed shadow-2xs">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <span>
          Click <strong>&quot;Setup Resources&quot;</strong> or <strong>&quot;Edit Mapping&quot;</strong> on any brand to easily assign its Search Console site, Analytics property, or Store. You can edit mappings at any time before or after connecting.
        </span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="text-xs font-semibold text-slate-700 border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Button>

        <Button
          type="button"
          onClick={onContinue}
          className="bg-[#3B49DF] hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
        >
          <span>Next: Review &amp; Connect ({readyBrandsCount} ready)</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Brand Resource Setup Modal */}
      <BrandResourceSetupModal
        open={Boolean(editingBrand)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingBrand(null);
        }}
        brand={editingBrand}
        allBrands={brands}
        resources={resources}
        mappings={mappings}
        onUpdateMapping={onUpdateMapping}
        onOpenManualGscModal={onOpenManualGscModal}
        onNextBrand={handleNextBrandInModal}
        hasNextBrand={hasNextBrand}
      />
    </div>
  );
}
