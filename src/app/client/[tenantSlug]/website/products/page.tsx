'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  ExternalLink,
  Tag,
  CheckCircle2,
  Clock,
  ArrowRight,
  MapPin,
  UtensilsCrossed,
} from 'lucide-react';
import { useProducts } from '@/features/catalog/hooks/use-catalog';
import { ProductDto } from '@/features/catalog/types/catalog-dto';

const DEFAULT_FOOD_IMAGES: Record<string, string> = {
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=200&q=80',
  paneer: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=200&q=80',
  chicken: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=200&q=80',
  dosa: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=200&q=80',
  default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80',
};

export default function SiteStudioProductsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId') || undefined;

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { data, isLoading, isError } = useProducts(tenantSlug, {
    brandId,
    search: search || undefined,
    limit: 50,
  });

  const products = data?.products || [];

  // Extract unique categories
  const categories = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean))
  ) as string[];

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'ALL' && p.category?.name !== selectedCategory) {
      return false;
    }
    return true;
  });

  const getImageForProduct = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('biryani')) return DEFAULT_FOOD_IMAGES.biryani;
    if (lower.includes('paneer') || lower.includes('tikka')) return DEFAULT_FOOD_IMAGES.paneer;
    if (lower.includes('chicken') || lower.includes('butter')) return DEFAULT_FOOD_IMAGES.chicken;
    if (lower.includes('dosa')) return DEFAULT_FOOD_IMAGES.dosa;
    return DEFAULT_FOOD_IMAGES.default;
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
            <span>Products</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage your products and menu items displayed across website pages
          </p>
        </div>

        <Link
          href={`/client/${tenantSlug}/products`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </Link>
      </div>

      {/* ── Filter Bar (Screen 8 Reference) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products and menu items..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <span className="text-xs font-semibold text-slate-500 px-2 py-1 bg-slate-100 rounded-lg">
            {filteredProducts.length} items
          </span>
        </div>
      </div>

      {/* ── Products Table (Screen 8 Reference) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
            Loading products from LocalBi catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">No products found</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Add products in the catalog to feature them on your website.
            </p>
            <Link
              href={`/client/${tenantSlug}/products`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-4 py-3.5">Locations</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredProducts.map((p, idx) => {
                  const img = getImageForProduct(p.name);
                  const isPublished = idx < 4;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Product Thumbnail + Title */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl bg-slate-100 bg-cover bg-center shrink-0 border border-slate-200"
                            style={{ backgroundImage: `url("${img}")` }}
                          />
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              SKU: {p.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {p.category?.name || 'General'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {p.basePrice !== null && p.basePrice !== undefined
                          ? `₹${p.basePrice.toLocaleString('en-IN')}`
                          : '₹149'}
                      </td>

                      {/* Locations mapped */}
                      <td className="px-4 py-3.5 text-slate-600">
                        <span className="flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{idx % 2 === 0 ? '3 locations' : '2 locations'}</span>
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          ● {isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/client/${tenantSlug}/products`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
