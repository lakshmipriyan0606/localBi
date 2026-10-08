'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { GoogleProductIcon } from '../google-product-icon';
import { DiscoveredResource, BrandOption } from './select-google-resources-step';
import { BrandResourceSetupModal } from '../brand-resource-setup-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export interface ReviewGoogleResourcesStepProps {
  email: string;
  brands: BrandOption[];
  resources: DiscoveredResource[];
  mappings: Record<string, string>;
  onEditSelection: () => void;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onBack: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  onUpdateMapping?: (resourceId: string, brandId: string | null) => void;
  onOpenManualGscModal?: () => void;
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

export function ReviewGoogleResourcesStep({
  email,
  brands,
  resources,
  mappings,
  onEditSelection,
  onSync,
  isSyncing,
  onBack,
  onRefresh,
  isRefreshing = false,
  onUpdateMapping,
  onOpenManualGscModal,
}: ReviewGoogleResourcesStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'configured' | 'all' | 'unmapped'>('configured');
  const [expandedBrandIds, setExpandedBrandIds] = useState<Set<string>>(new Set());
  const [editingBrand, setEditingBrand] = useState<BrandOption | null>(null);

  // Group resources per brand
  const { brandResourcesMap, mappedBrands, unmappedBrands, totalMappedResources } = useMemo(() => {
    let mappedTotal = 0;
    const map = new Map<string, DiscoveredResource[]>();
    brands.forEach((b) => map.set(b.id, []));

    resources.forEach((r) => {
      const brandId = mappings[r.id];
      if (brandId && map.has(brandId)) {
        map.get(brandId)!.push(r);
        mappedTotal++;
      }
    });

    const mapped: BrandOption[] = [];
    const unmapped: BrandOption[] = [];

    brands.forEach((b) => {
      const items = map.get(b.id) || [];
      if (items.length > 0) {
        mapped.push(b);
      } else {
        unmapped.push(b);
      }
    });

    return {
      brandResourcesMap: map,
      mappedBrands: mapped,
      unmappedBrands: unmapped,
      totalMappedResources: mappedTotal,
    };
  }, [brands, resources, mappings]);

  // Toggle expanded details for a brand
  const toggleExpanded = (brandId: string) => {
    setExpandedBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else {
        next.add(brandId);
      }
      return next;
    });
  };

  // Filtered brands based on search & active tab
  const filteredBrands = useMemo(() => {
    let list = brands;
    if (activeTab === 'configured') {
      list = mappedBrands;
    } else if (activeTab === 'unmapped') {
      list = unmappedBrands;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((brand) => {
      const matchName = brand.name.toLowerCase().includes(q);
      const matchDomain = (brand.domain || '').toLowerCase().includes(q);
      const matchSlug = brand.slug.toLowerCase().includes(q);
      const brandItems = brandResourcesMap.get(brand.id) || [];
      const matchItems = brandItems.some(
        (r) =>
          r.resourceName.toLowerCase().includes(q) ||
          r.externalResourceId.toLowerCase().includes(q) ||
          (r.propertyId || '').toLowerCase().includes(q)
      );
      return matchName || matchDomain || matchSlug || matchItems;
    });
  }, [brands, mappedBrands, unmappedBrands, activeTab, searchQuery, brandResourcesMap]);

  // Paginated brands for rendering
  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / BRANDS_PER_PAGE));
  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * BRANDS_PER_PAGE;
    return filteredBrands.slice(start, start + BRANDS_PER_PAGE);
  }, [filteredBrands, currentPage]);

  const isReadyToConnect = totalMappedResources > 0;

  // Next brand navigation inside the modal
  const handleNextBrandInModal = () => {
    if (!editingBrand) return;
    const currentIdx = brands.findIndex((b) => b.id === editingBrand.id);
    if (currentIdx >= 0 && currentIdx < brands.length - 1) {
      setEditingBrand(brands[currentIdx + 1]);
    }
  };

  const hasNextBrand = Boolean(
    editingBrand &&
      brands.findIndex((b) => b.id === editingBrand.id) < brands.length - 1
  );

  return (
    <div className="max-w-6xl mx-auto w-full pt-2 pb-16 space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Review your Google connections
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Confirm your brand &rarr; resource mappings before connecting. Nothing will sync until you click Connect &amp; Start Syncing.
          </p>
        </div>

      </div>

      {/* Responsive Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: High-Density Scalable Brand Directory List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Controls Bar: Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
            {/* Filter Tabs */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1 self-start sm:self-auto shadow-2xs overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('configured');
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'configured'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Configured Brands ({mappedBrands.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                All Brands ({brands.length})
              </button>
              {unmappedBrands.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('unmapped');
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap',
                    activeTab === 'unmapped'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Needs Setup ({unmappedBrands.length})
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative self-stretch sm:self-auto">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={`Search ${brands.length} brands or resources...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-60 pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs text-slate-800"
              />
            </div>
          </div>

          {/* Unified Compact List Container */}
          {paginatedBrands.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {paginatedBrands.map((brand) => {
                const brandGlobalIndex = brands.findIndex((b) => b.id === brand.id);
                const avatarBg =
                  BRAND_AVATAR_COLORS[Math.max(0, brandGlobalIndex) % BRAND_AVATAR_COLORS.length];
                const brandInitial = (brand.name || 'B').charAt(0).toUpperCase();
                const domainDisplay = brand.domain || `${brand.slug}.localbi.app`;

                const items = brandResourcesMap.get(brand.id) || [];
                const isConfigured = items.length > 0;
                const isExpanded = expandedBrandIds.has(brand.id);

                return (
                  <div key={brand.id} className="transition-colors">
                    {/* Main Brand Row */}
                    <div className="p-4 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 hover:bg-slate-50/50">
                      {/* Left: Brand Identity */}
                      <div className="flex items-center gap-3.5 min-w-0 md:w-4/12">
                        <div
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-2xs shrink-0',
                            avatarBg
                          )}
                        >
                          {brandInitial}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {brand.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium truncate">
                            {domainDisplay}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Connected Resource Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap md:flex-1 min-w-0">
                        {isConfigured ? (
                          items.map((item) => (
                            <span
                              key={item.id}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border shadow-2xs max-w-[210px] truncate',
                                item.product === 'GA4' && 'bg-amber-50/80 text-amber-900 border-amber-200/80',
                                item.product === 'GSC' && 'bg-blue-50/80 text-blue-900 border-blue-200/80',
                                item.product === 'GBP' && 'bg-emerald-50/80 text-emerald-900 border-emerald-200/80'
                              )}
                              title={`${item.product}: ${item.resourceName} (${item.propertyId || item.externalResourceId})`}
                            >
                              <GoogleProductIcon product={item.product} size="sm" />
                              <span className="truncate">
                                {item.resourceName || item.externalResourceId}
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 italic">
                            No resources linked yet
                          </span>
                        )}
                      </div>

                      {/* Right: Status Pill & Actions */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                        {isConfigured ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                            <AlertCircle className="w-3 h-3 stroke-[2]" />
                            Needs Setup
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (onUpdateMapping) {
                              setEditingBrand(brand);
                            } else {
                              onEditSelection();
                            }
                          }}
                          className={cn(
                            'text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs',
                            isConfigured
                              ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80'
                              : 'text-white bg-[#3B49DF] hover:bg-indigo-700'
                          )}
                        >
                          {isConfigured ? 'Edit Mapping' : 'Setup →'}
                        </button>

                        {/* Expand/Collapse details chevron button */}
                        {isConfigured && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(brand.id)}
                            aria-label={isExpanded ? 'Collapse resource details' : 'Expand resource details'}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Granular Resource Details Panel */}
                    {isExpanded && isConfigured && (
                      <div className="bg-slate-50/70 border-t border-slate-100 px-4 py-3 sm:px-6 space-y-2.5 animate-in fade-in-50 duration-150">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Mapped Resources Details ({items.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {items.map((res) => (
                            <div
                              key={res.id}
                              className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-2.5"
                            >
                              <GoogleProductIcon product={res.product} size="sm" />
                              <div className="min-w-0 space-y-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  {res.product === 'GSC'
                                    ? 'Google Search Console'
                                    : res.product === 'GA4'
                                    ? 'Google Analytics 4'
                                    : 'Google Business Profile'}
                                </span>
                                <p className="text-xs font-bold text-slate-900 truncate">
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
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">
                {searchQuery ? 'No matching brands found' : 'No Brand Mappings Configured'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? `No brands matched your search "${searchQuery}". Clear your search query to see all.`
                  : 'Please go back and map at least one Google resource to a brand before connecting.'}
              </p>
              {searchQuery ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold"
                >
                  Clear Search
                </Button>
              ) : (
                <Button type="button" onClick={onEditSelection} className="text-xs font-bold">
                  Map Resources Now
                </Button>
              )}
            </div>
          )}

          {/* Pagination Controls for 30+ Brands */}
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
                of{' '}
                <strong className="text-slate-900 font-bold">
                  {filteredBrands.length}
                </strong>{' '}
                brands
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                      onClick={() => setCurrentPage(pg)}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs rounded-xl h-8 px-2.5 cursor-pointer disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Connection Ready Banner */}
          {isReadyToConnect && (
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Connection ready!</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-emerald-200/50">
                <div>
                  <span className="text-lg font-extrabold text-slate-900">
                    {mappedBrands.length}
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">Brands</p>
                </div>
                <div>
                  <span className="text-lg font-extrabold text-slate-900">
                    {totalMappedResources}
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">Resources</p>
                </div>
                <div>
                  <span className="text-lg font-extrabold text-slate-900">
                    {totalMappedResources}
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">Mappings</p>
                </div>
                <div className="flex items-center">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    Ready to connect
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isSyncing}
              className="text-xs font-semibold text-slate-700 border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>

            <Button
              type="button"
              onClick={onSync}
              disabled={isSyncing || !isReadyToConnect}
              className="bg-[#3B49DF] hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting &amp; Starting Sync...</span>
                </>
              ) : (
                <>
                  <span>Connect &amp; Start Syncing</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Clean Connection Summary Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
            {/* Summary Title */}
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Connection Summary</h3>
            </div>

            {/* Google Account */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Google account
              </span>
              <div className="flex items-center gap-2.5 pt-0.5">
                <GoogleProductIcon product="GOOGLE" size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{email}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                    Connected
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics Rows */}
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Brands</span>
                <span className="font-bold text-slate-900">{mappedBrands.length}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Resources</span>
                <span className="font-bold text-slate-900">{totalMappedResources}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Mappings</span>
                <span className="font-bold text-slate-900">{totalMappedResources}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Status</span>
                <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  {isReadyToConnect ? 'Ready to connect' : 'Pending mappings'}
                </span>
              </div>
            </div>

            {/* Why It's Secure */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Why it&apos;s secure
              </h4>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>Secure OAuth connection</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>Automatic background sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>Data available in LocalBi dashboards</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Resource Setup Modal in Step 3 for instant on-the-fly editing */}
      {onUpdateMapping && (
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
      )}
    </div>
  );
}
