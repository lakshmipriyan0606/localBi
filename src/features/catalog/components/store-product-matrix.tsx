'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import {
  useProducts,
  useCategories,
  useStoreProducts,
  useSaveBulkMapping,
} from '../hooks/use-catalog';
import {
  CheckSquare,
  Square,
  Search,
  Save,
  CheckCircle2,
  Store,
  Package,
  Loader2,
} from 'lucide-react';

interface StoreProductMatrixProps {
  tenantSlug: string;
  brands: Array<{ id: string; name: string }>;
  stores: Array<{ id: string; name: string; brandId: string; city?: string | null }>;
}

export function StoreProductMatrix({
  tenantSlug,
  brands,
  stores,
}: StoreProductMatrixProps) {
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brands[0]?.id || '');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    stores.find((s) => s.brandId === (brands[0]?.id || ''))?.id || stores[0]?.id || ''
  );

  // Filters for products side
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  // Local draft state for selected products in the selected store
  // Map of productId -> { isAvailable: boolean, priceOverride: number | null, quantity: number }
  const [draftMappings, setDraftMappings] = useState<
    Record<string, { isAvailable: boolean; priceOverride?: number | null; quantity?: number }>
  >({});
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Data fetching
  const { data: categoriesData } = useCategories(tenantSlug, { brandId: selectedBrandId });
  const filters = {
    brandId: selectedBrandId,
    ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  };
  const { data: productsData, isLoading: isLoadingProducts } = useProducts(tenantSlug, filters);

  const { data: storeProductsData, isLoading: isLoadingMappings } = useStoreProducts(
    tenantSlug,
    selectedStoreId
  );

  const saveMutation = useSaveBulkMapping(tenantSlug);

  // Filter stores by selected brand
  const brandStores = useMemo(
    () => stores.filter((s) => !selectedBrandId || s.brandId === selectedBrandId),
    [stores, selectedBrandId]
  );

  // Sync draft state from loaded store mappings when storeId changes or mappings load
  useMemo(() => {
    if (!isDraftDirty && storeProductsData?.mappings) {
      const initialMap: Record<
        string,
        { isAvailable: boolean; priceOverride?: number | null; quantity?: number }
      > = {};
      for (const m of storeProductsData.mappings) {
        initialMap[m.productId] = {
          isAvailable: m.isAvailable,
          priceOverride: m.priceOverride,
          quantity: m.quantity || 0,
        };
      }
      setDraftMappings(initialMap);
    }
  }, [storeProductsData, isDraftDirty]);

  // Handle switching store
  const handleSelectStore = (storeId: string) => {
    if (isDraftDirty) {
      if (!confirm('You have unsaved mapping changes for this store. Discard changes?')) {
        return;
      }
    }
    setSelectedStoreId(storeId);
    setIsDraftDirty(false);
    setSaveSuccessMsg(null);
  };

  // Toggle single product availability in draft
  const handleToggleProduct = (productId: string) => {
    setSaveSuccessMsg(null);
    setDraftMappings((prev) => {
      const current = prev[productId];
      const nextIsAvailable = current ? !current.isAvailable : true;
      return {
        ...prev,
        [productId]: {
          isAvailable: nextIsAvailable,
          priceOverride: current?.priceOverride ?? null,
          quantity: current?.quantity ?? 0,
        },
      };
    });
    setIsDraftDirty(true);
  };

  // Select all visible products
  const handleSelectAllVisible = () => {
    if (!productsData?.products) return;
    setSaveSuccessMsg(null);
    setDraftMappings((prev) => {
      const next = { ...prev };
      for (const p of productsData.products) {
        next[p.id] = {
          isAvailable: true,
          priceOverride: prev[p.id]?.priceOverride ?? null,
          quantity: prev[p.id]?.quantity ?? 0,
        };
      }
      return next;
    });
    setIsDraftDirty(true);
  };

  // Clear all visible products
  const handleClearAllVisible = () => {
    if (!productsData?.products) return;
    setSaveSuccessMsg(null);
    setDraftMappings((prev) => {
      const next = { ...prev };
      for (const p of productsData.products) {
        next[p.id] = {
          isAvailable: false,
          priceOverride: prev[p.id]?.priceOverride ?? null,
          quantity: prev[p.id]?.quantity ?? 0,
        };
      }
      return next;
    });
    setIsDraftDirty(true);
  };

  // Save all draft changes in one batch
  const handleSave = async () => {
    if (!selectedBrandId || !selectedStoreId) return;

    const updates = Object.entries(draftMappings).map(([productId, cfg]) => ({
      productId,
      isAvailable: cfg.isAvailable,
      priceOverride: cfg.priceOverride ?? null,
      quantity: cfg.quantity ?? 0,
      status: 'ACTIVE' as const,
    }));

    try {
      await saveMutation.mutateAsync({
        brandId: selectedBrandId,
        storeId: selectedStoreId,
        updates,
      });
      setIsDraftDirty(false);
      setSaveSuccessMsg('Store catalog mappings successfully updated in database!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save store mappings');
    }
  };

  // Filter products by availableOnly if active
  const displayedProducts = useMemo(() => {
    if (!productsData?.products) return [];
    if (!availableOnly) return productsData.products;
    return productsData.products.filter((p) => draftMappings[p.id]?.isAvailable);
  }, [productsData, availableOnly, draftMappings]);

  return (
    <div className="space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Brand Catalog:
          </label>
          <select
            value={selectedBrandId}
            onChange={(e) => {
              setSelectedBrandId(e.target.value);
              const firstStore = stores.find((s) => s.brandId === e.target.value);
              if (firstStore) setSelectedStoreId(firstStore.id);
              setIsDraftDirty(false);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[200px]"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccessMsg && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={!isDraftDirty || saveMutation.isPending}
            className={`flex items-center gap-2 ${
              isDraftDirty ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''
            }`}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Store Mappings {isDraftDirty && '*'}</span>
          </Button>
        </div>
      </div>

      {/* Two-Column Mapping Matrix UX */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: STORES */}
        <div className="col-span-4 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Store className="h-4 w-4 text-indigo-600" />
              <span>STORES ({brandStores.length})</span>
            </div>
            <span className="text-xs text-gray-500">Select target store</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {brandStores.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No stores configured for this brand.
              </div>
            ) : (
              brandStores.map((store) => {
                const isSelected = store.id === selectedStoreId;
                return (
                  <button
                    key={store.id}
                    onClick={() => handleSelectStore(store.id)}
                    className={`w-full text-left p-3.5 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div
                        className={`text-sm font-medium ${
                          isSelected ? 'text-indigo-900 font-semibold' : 'text-gray-900'
                        }`}
                      >
                        {store.name}
                      </div>
                      {store.city && (
                        <div className="text-xs text-gray-500">{store.city}</div>
                      )}
                    </div>
                    {isSelected && (
                      <Badge className="bg-indigo-600 text-white text-[10px]">
                        Active
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: PRODUCTS */}
        <div className="col-span-8 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Package className="h-4 w-4 text-indigo-600" />
                <span>
                  AVAILABLE PRODUCTS AT{' '}
                  <span className="text-indigo-700">
                    {stores.find((s) => s.id === selectedStoreId)?.name || 'Selected Store'}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllVisible}
                  className="text-xs h-7"
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearAllVisible}
                  className="text-xs h-7"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:outline-none bg-white"
              >
                <option value="">All Categories</option>
                {categoriesData?.categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setAvailableOnly(!availableOnly)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                  availableOnly
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Available Only
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2">
            {isLoadingProducts || isLoadingMappings ? (
              <div className="p-12 flex justify-center">
                <AnalyticsLoader />
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">
                No products match the selected criteria.
              </div>
            ) : (
              displayedProducts.map((prod) => {
                const mapping = draftMappings[prod.id];
                const isChecked = Boolean(mapping?.isAvailable);

                return (
                  <div
                    key={prod.id}
                    className={`flex items-center justify-between p-3 rounded-md transition-colors ${
                      isChecked ? 'bg-indigo-50/40' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => handleToggleProduct(prod.id)}
                    >
                      <button type="button" className="text-indigo-600 focus:outline-none">
                        {isChecked ? (
                          <CheckSquare className="h-5 w-5 fill-indigo-600 text-white" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      <div>
                        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <span>{prod.name}</span>
                          <span className="font-mono text-[11px] font-normal text-gray-500">
                            ({prod.sku})
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {prod.category && (
                            <span className="text-gray-700 font-medium">
                              {prod.category.name}
                            </span>
                          )}
                          <span>•</span>
                          <span>Base: ₹{prod.basePrice ? Number(prod.basePrice) : '0'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price Override & Availability Controls */}
                    <div className="flex items-center gap-3">
                      {isChecked && (
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] font-medium text-gray-500">
                            Store Price:
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={prod.basePrice ? String(prod.basePrice) : '0'}
                            value={mapping?.priceOverride ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              setDraftMappings((prev) => ({
                                ...prev,
                                [prod.id]: {
                                  isAvailable: true,
                                  priceOverride: val,
                                  quantity: prev[prod.id]?.quantity ?? 0,
                                },
                              }));
                              setIsDraftDirty(true);
                            }}
                            className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      <Badge
                        variant={isChecked ? 'default' : 'outline'}
                        className={`text-xs ${
                          isChecked
                            ? 'bg-emerald-600 text-white border-transparent'
                            : 'text-gray-400'
                        }`}
                      >
                        {isChecked ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
