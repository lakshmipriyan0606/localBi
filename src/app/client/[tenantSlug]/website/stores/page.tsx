'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Store,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  Edit,
  ShieldCheck,
  Package,
  Plus,
  Layers,
} from 'lucide-react';
import { DataTable, ColumnDef } from '@/components/analytics/data-table';
import { StatusBadge } from '@/components/ui/status-badge';

interface LocationItem {
  id: string;
  name: string;
  storeCode?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  phone?: string;
  googleRating?: number;
  reviewCount?: number;
  isArchived: boolean;
}

export default function SiteStudioStoresPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [stores, setStores] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadStores() {
      try {
        setLoading(true);
        const url = brandId
          ? `/api/tenants/${tenantSlug}/locations?brandId=${brandId}&limit=100`
          : `/api/tenants/${tenantSlug}/locations?limit=100`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.locations) {
          setStores(data.locations);
        }
      } catch (err) {
        console.error('Failed to load stores', err);
      } finally {
        setLoading(false);
      }
    }
    loadStores();
  }, [tenantSlug, brandId]);

  const filtered = stores.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.addressLine1 && s.addressLine1.toLowerCase().includes(q))
    );
  });

  const columns: ColumnDef<LocationItem>[] = [
    {
      key: 'name',
      header: 'Storefront',
      accessor: (s) => (
        <div>
          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-indigo-600" />
            <span>{s.name}</span>
          </div>
          {s.storeCode && (
            <span className="text-[11px] font-mono text-slate-400">Code: {s.storeCode}</span>
          )}
        </div>
      ),
    },
    {
      key: 'city',
      header: 'City & Region',
      accessor: (s) => (
        <span className="text-xs text-slate-600 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{s.city || 'Unassigned'}</span>
        </span>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      accessor: (s) => (
        <span className="text-xs text-slate-500 truncate max-w-xs block">
          {s.addressLine1 || 'No street address specified'}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Direct Phone',
      accessor: (s) => (
        <span className="text-xs font-mono text-slate-600">
          {s.phone || '—'}
        </span>
      ),
    },
    {
      key: 'websiteRoute',
      header: 'Website URL Route',
      accessor: (s) => {
        const citySlug = s.city ? s.city.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'store';
        const nameSlug = s.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const routePath = `/${citySlug}/${nameSlug}`;
        return (
          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">
            {routePath}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (s) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/client/${tenantSlug}/locations/${s.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Edit className="w-3 h-3 text-slate-400" />
            <span>Edit Store</span>
          </Link>

          <Link
            href={`/client/${tenantSlug}/catalog?storeId=${s.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Package className="w-3 h-3 text-slate-500" />
            <span>Products</span>
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
            <Store className="w-4 h-4 text-indigo-600" />
            <span>Storefront Locations on Website</span>
          </h2>
          <p className="text-xs text-slate-500">
            Stores in LocalBi are automatically published to your website locator, maps, and dynamic store pages.
          </p>
        </div>

        <Link
          href={`/client/${tenantSlug}/locations`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Store Location</span>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(s) => s.id}
        isLoading={loading}
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search stores by name, city, address..."
      />
    </div>
  );
}
