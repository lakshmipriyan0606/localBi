'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Package,
  Plus,
  Edit,
  ExternalLink,
  Tag,
  CheckCircle2,
  XCircle,
  ShoppingBag,
} from 'lucide-react';
import { useProducts } from '@/features/catalog/hooks/use-catalog';
import { DataTable, ColumnDef } from '@/components/analytics/data-table';
import { ProductDto } from '@/features/catalog/types/catalog-dto';

export default function SiteStudioProductsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId') || undefined;

  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useProducts(tenantSlug, {
    brandId,
    search: search || undefined,
    limit: 50,
  });

  const products = data?.products || [];

  const columns: ColumnDef<ProductDto>[] = [
    {
      key: 'name',
      header: 'Product Offering',
      accessor: (p) => (
        <div>
          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-indigo-600" />
            <span>{p.name}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">SKU: {p.sku}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (p) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          <Tag className="w-3 h-3 text-slate-400" />
          <span>{p.category?.name || 'General'}</span>
        </span>
      ),
    },
    {
      key: 'basePrice',
      header: 'Base Price',
      accessor: (p) => (
        <span className="font-semibold text-xs text-slate-900">
          {p.basePrice !== null && p.basePrice !== undefined
            ? `₹${p.basePrice.toLocaleString('en-IN')}`
            : 'Unpriced'}
        </span>
      ),
    },
    {
      key: 'availability',
      header: 'Catalog Status',
      accessor: (p) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            p.isAvailable !== false
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {p.isAvailable !== false ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          ) : (
            <XCircle className="w-3 h-3 text-rose-500" />
          )}
          <span>{p.isAvailable !== false ? 'In Stock' : 'Unavailable'}</span>
        </span>
      ),
    },
    {
      key: 'websiteRoute',
      header: 'Website Product URL',
      accessor: (p) => {
        const prodPath = `/products/${p.slug || p.id}`;
        return (
          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">
            {prodPath}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (p) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/client/${tenantSlug}/catalog?productId=${p.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Edit className="w-3 h-3 text-slate-400" />
            <span>Pricing & Overrides</span>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            <span>Catalog Offerings & Dynamic Products</span>
          </h2>
          <p className="text-xs text-slate-500">
            Products are automatically showcased on your website grids with store-specific price overrides.
          </p>
        </div>

        <Link
          href={`/client/${tenantSlug}/catalog`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Manage Full Catalog</span>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={products}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search catalog by name, category, or SKU..."
      />
    </div>
  );
}
