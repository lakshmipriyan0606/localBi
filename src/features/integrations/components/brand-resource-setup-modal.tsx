'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GoogleProductIcon } from './google-product-icon';
import { DiscoveredResource, BrandOption } from './steps/select-google-resources-step';
import {
  Check,
  Globe,
  BarChart3,
  Store,
  ArrowRight,
  AlertCircle,
  Plus,
  Unlink,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export interface BrandResourceSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: BrandOption | null;
  allBrands: BrandOption[];
  resources: DiscoveredResource[];
  mappings: Record<string, string>;
  onUpdateMapping: (resourceId: string, brandId: string | null) => void;
  onOpenManualGscModal?: () => void;
  onNextBrand?: () => void;
  hasNextBrand?: boolean;
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

export function BrandResourceSetupModal({
  open,
  onOpenChange,
  brand,
  allBrands,
  resources,
  mappings,
  onUpdateMapping,
  onOpenManualGscModal,
  onNextBrand,
  hasNextBrand = false,
}: BrandResourceSetupModalProps) {
  if (!brand) return null;

  const brandIndex = allBrands.findIndex((b) => b.id === brand.id);
  const avatarBg = BRAND_AVATAR_COLORS[Math.max(0, brandIndex) % BRAND_AVATAR_COLORS.length];
  const brandInitial = (brand.name || 'B').charAt(0).toUpperCase();
  const domainDisplay = brand.domain || `${brand.slug}.localbi.app`;

  // Currently mapped resources for this brand
  const mappedGsc = resources.find(
    (r) => r.product === 'GSC' && mappings[r.id] === brand.id
  );
  const mappedGa4 = resources.find(
    (r) => r.product === 'GA4' && mappings[r.id] === brand.id
  );
  const mappedGbp = resources.find(
    (r) => r.product === 'GBP' && mappings[r.id] === brand.id
  );

  const mappedCount = [mappedGsc, mappedGa4, mappedGbp].filter(Boolean).length;

  // Available resources per product type
  const gscOptions = resources.filter((r) => r.product === 'GSC');
  const ga4Options = resources.filter((r) => r.product === 'GA4');
  const gbpOptions = resources.filter((r) => r.product === 'GBP');

  // Handle slot change
  const handleSlotChange = (
    currentResource: DiscoveredResource | undefined,
    selectedId: string
  ) => {
    if (!selectedId || selectedId === 'unmap') {
      if (currentResource) {
        onUpdateMapping(currentResource.id, null);
      }
      return;
    }

    // If changing to a new resource, unmap old one first
    if (currentResource && currentResource.id !== selectedId) {
      onUpdateMapping(currentResource.id, null);
    }

    onUpdateMapping(selectedId, brand.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-base shadow-2xs shrink-0',
                  avatarBg
                )}
              >
                {brandInitial}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  Setup Google Resources for {brand.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-medium truncate">
                  {domainDisplay} • Brand {brandIndex + 1} of {allBrands.length}
                </DialogDescription>
              </div>
            </div>

            <div className="shrink-0">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-2xs',
                  mappedCount > 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                )}
              >
                {mappedCount > 0 && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                {mappedCount} of 3 connected
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* 3 Product Configuration Cards */}
        <div className="space-y-3.5 py-2">
          {/* 1. Google Analytics 4 (GA4) */}
          <ProductSlotCard
            title="Google Analytics 4"
            description="Website visitors, session metrics, conversions & engagement"
            product="GA4"
            icon={<BarChart3 className="w-4 h-4 text-amber-600" />}
            currentResource={mappedGa4}
            options={ga4Options}
            allBrands={allBrands}
            mappings={mappings}
            brandId={brand.id}
            onChange={(selectedId) => handleSlotChange(mappedGa4, selectedId)}
          />

          {/* 2. Google Search Console (GSC) */}
          <ProductSlotCard
            title="Google Search Console"
            description="Organic search queries, rankings, impressions, clicks & indexing"
            product="GSC"
            icon={<Globe className="w-4 h-4 text-blue-600" />}
            currentResource={mappedGsc}
            options={gscOptions}
            allBrands={allBrands}
            mappings={mappings}
            brandId={brand.id}
            onAddNew={onOpenManualGscModal}
            addNewLabel="+ Add GSC URL manually"
            onChange={(selectedId) => handleSlotChange(mappedGsc, selectedId)}
          />

          {/* 3. Google Business Profile (GBP) */}
          <ProductSlotCard
            title="Google Business Profile"
            description="Local storefront, Maps ranking, reviews & direction requests"
            product="GBP"
            icon={<Store className="w-4 h-4 text-emerald-600" />}
            currentResource={mappedGbp}
            options={gbpOptions}
            allBrands={allBrands}
            mappings={mappings}
            brandId={brand.id}
            onChange={(selectedId) => handleSlotChange(mappedGbp, selectedId)}
          />
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-400">
            Changes save automatically to this brand.
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold rounded-xl"
            >
              Done
            </Button>

            {hasNextBrand && onNextBrand && (
              <Button
                type="button"
                size="sm"
                onClick={onNextBrand}
                className="bg-[#3B49DF] hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <span>Save &amp; Next Brand</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Individual Product Slot (GA4, GSC, or GBP) */
function ProductSlotCard({
  title,
  description,
  product,
  currentResource,
  options,
  allBrands,
  mappings,
  brandId,
  onChange,
  onAddNew,
  addNewLabel,
}: {
  title: string;
  description: string;
  product: 'GSC' | 'GA4' | 'GBP';
  icon: React.ReactNode;
  currentResource?: DiscoveredResource;
  options: DiscoveredResource[];
  allBrands: BrandOption[];
  mappings: Record<string, string>;
  brandId: string;
  onChange: (selectedId: string) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
}) {
  const isConnected = Boolean(currentResource);

  return (
    <div
      className={cn(
        'p-3.5 sm:p-4 rounded-xl border transition-all',
        isConnected
          ? 'bg-slate-50/70 border-slate-200'
          : 'bg-white border-slate-200 hover:border-slate-300'
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Product Identity */}
        <div className="flex items-start gap-3 min-w-0">
          <GoogleProductIcon product={product} size="md" />
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">{title}</h4>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                  Not connected
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">{description}</p>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end">
          <select
            value={currentResource?.id || ''}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'text-xs font-semibold rounded-xl px-3 py-2 border shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer max-w-[260px] sm:max-w-[280px] truncate',
              isConnected
                ? 'bg-white border-slate-300 text-slate-800'
                : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50/30'
            )}
          >
            <option value="">-- Select {product} Property --</option>
            {options.map((opt) => {
              const mappedToBrandId = mappings[opt.id];
              const isMappedToAnother =
                mappedToBrandId && mappedToBrandId !== brandId;
              const otherBrandName = isMappedToAnother
                ? allBrands.find((b) => b.id === mappedToBrandId)?.name
                : undefined;

              const label = opt.resourceName || opt.externalResourceId;
              const cleanId = opt.propertyId ? ` (${opt.propertyId})` : '';

              return (
                <option key={opt.id} value={opt.id}>
                  {label}
                  {cleanId}
                  {otherBrandName ? ` [Mapped to: ${otherBrandName}]` : ''}
                </option>
              );
            })}
            {isConnected && <option value="unmap">Disconnect (Leave Unmapped)</option>}
          </select>

          {isConnected && (
            <button
              type="button"
              onClick={() => onChange('unmap')}
              title="Disconnect this property"
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Currently Connected Preview or Add-Manual link */}
      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
        {isConnected ? (
          <div className="text-slate-600 font-mono truncate max-w-md">
            <span className="text-slate-400 font-sans">Active resource: </span>
            {currentResource.product === 'GA4' && currentResource.propertyId
              ? currentResource.propertyId
              : currentResource.externalResourceId}
          </div>
        ) : (
          <span className="text-amber-700 font-medium">
            No {product} resource linked to this brand yet.
          </span>
        )}

        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer shrink-0 ml-auto"
          >
            <Plus className="w-3 h-3" />
            <span>{addNewLabel || 'Add manually'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
