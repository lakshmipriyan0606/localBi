'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Store,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BrandOption {
  id: string;
  name: string;
  slug: string;
}

interface StoreOption {
  id: string;
  name: string;
  storeCode?: string | null;
}

interface MerchantExplorerProps {
  tenantSlug: string;
  brands: BrandOption[];
  stores: StoreOption[];
  initialBrandId?: string;
}

export function MerchantExplorer({
  tenantSlug,
  brands,
  stores,
  initialBrandId,
}: MerchantExplorerProps) {
  const [selectedBrandId, setSelectedBrandId] = useState<string>(
    initialBrandId || brands[0]?.id || ''
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    stores[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<
    'products' | 'inventory' | 'diagnostics' | 'settings'
  >('products');

  const [dashboard, setDashboard] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [storeInventory, setStoreInventory] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load Dashboard Data
  useEffect(() => {
    if (!selectedBrandId) return;

    let mounted = true;
    async function loadData() {
      try {
        const [dashRes, prodRes, issueRes] = await Promise.all([
          fetch(`/api/tenants/${tenantSlug}/merchant/brands/${selectedBrandId}/dashboard`),
          fetch(
            `/api/tenants/${tenantSlug}/merchant/brands/${selectedBrandId}/products?status=${statusFilter}&search=${encodeURIComponent(
              searchTerm
            )}`
          ),
          fetch(`/api/tenants/${tenantSlug}/merchant/brands/${selectedBrandId}/issues`),
        ]);

        if (mounted) {
          if (dashRes.ok) {
            const d = await dashRes.json();
            setDashboard(d.dashboard);
          }
          if (prodRes.ok) {
            const p = await prodRes.json();
            setProducts(p.items || []);
          }
          if (issueRes.ok) {
            const iss = await issueRes.json();
            setIssues(iss.items || []);
          }
        }
      } catch (err) {
        console.error('Failed to load merchant data', err);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [tenantSlug, selectedBrandId, statusFilter, searchTerm]);

  // Load Store Local Inventory Data
  useEffect(() => {
    if (!selectedStoreId || activeTab !== 'inventory') return;

    let mounted = true;
    async function loadStoreInv() {
      try {
        const res = await fetch(
          `/api/tenants/${tenantSlug}/merchant/stores/${selectedStoreId}/inventory`
        );
        if (res.ok && mounted) {
          const data = await res.json();
          setStoreInventory(data);
        }
      } catch (err) {
        console.error('Failed to load store inventory', err);
      }
    }

    loadStoreInv();
    return () => {
      mounted = false;
    };
  }, [tenantSlug, selectedStoreId, activeTab]);

  // Quick Sync Single Product
  const handleSyncProduct = async (productId: string) => {
    setSyncing(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/merchant/brands/${selectedBrandId}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'single', productId, force: true }),
        }
      );
      if (res.ok) {
        // Refresh products and dashboard
        const pRes = await fetch(
          `/api/tenants/${tenantSlug}/merchant/brands/${selectedBrandId}/products?status=${statusFilter}`
        );
        if (pRes.ok) {
          const p = await pRes.json();
          setProducts(p.items || []);
        }
      }
    } catch (err) {
      console.error('Sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  // Bulk Sync All Products
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/merchant/brands/${selectedBrandId}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'batch', force: true }),
        }
      );
      if (res.ok) {
        // Refresh
        const dashRes = await fetch(
          `/api/tenants/${tenantSlug}/merchant/brands/${selectedBrandId}/dashboard`
        );
        if (dashRes.ok) {
          const d = await dashRes.json();
          setDashboard(d.dashboard);
        }
      }
    } catch (err) {
      console.error('Batch sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  // Sync Store Local Inventory
  const handleSyncStoreInventory = async () => {
    if (!selectedStoreId) return;
    setSyncing(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/merchant/stores/${selectedStoreId}/inventory`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true }),
        }
      );
      if (res.ok) {
        const invRes = await fetch(
          `/api/tenants/${tenantSlug}/merchant/stores/${selectedStoreId}/inventory`
        );
        if (invRes.ok) {
          const data = await invRes.json();
          setStoreInventory(data);
        }
      }
    } catch (err) {
      console.error('Store inventory sync failed', err);
    } finally {
      setSyncing(false);
    }
  };

  const summary = dashboard?.summary || {
    totalCatalogProducts: 0,
    submittedProducts: 0,
    approvedProducts: 0,
    pendingProducts: 0,
    disapprovedProducts: 0,
    errorProducts: 0,
    notSubmittedProducts: 0,
    approvalRate: 0,
  };

  const inventorySummary = dashboard?.inventory || {
    participatingStores: 0,
    totalInventoryRecords: 0,
    syncedRecords: 0,
    errorRecords: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Brand Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md shadow-amber-500/20">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Google Merchant Center
              </h1>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold px-2 py-0.5">
                Local Inventory Feed
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Synchronize catalog products, multi-store pricing, availability, and diagnostic issues with Google Shopping.
            </p>
          </div>
        </div>

        {/* Brand Selector & Action Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {brands.length > 1 && (
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={handleSyncAll}
            disabled={syncing || !dashboard?.merchantAccountId}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync All Products
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border border-slate-100 shadow-sm bg-gradient-to-b from-white to-slate-50/50">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Catalog Total
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {summary.totalCatalogProducts}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Active & Published</span>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 shadow-sm bg-gradient-to-b from-emerald-50/30 to-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider block">
              Approved
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {summary.approvedProducts}
            </div>
            <span className="text-[10px] text-emerald-600/80 mt-1 block">
              {summary.approvalRate}% of submitted
            </span>
          </CardContent>
        </Card>

        <Card className="border border-blue-100 shadow-sm bg-gradient-to-b from-blue-50/30 to-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider block">
              Pending Sync
            </span>
            <div className="text-2xl font-black text-blue-600 mt-1">
              {summary.pendingProducts}
            </div>
            <span className="text-[10px] text-blue-500 mt-1 block">Google processing</span>
          </CardContent>
        </Card>

        <Card className="border border-rose-100 shadow-sm bg-gradient-to-b from-rose-50/30 to-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-rose-700 uppercase tracking-wider block">
              Disapproved
            </span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {summary.disapprovedProducts}
            </div>
            <span className="text-[10px] text-rose-500 mt-1 block">Policy or data errors</span>
          </CardContent>
        </Card>

        <Card className="border border-amber-100 shadow-sm bg-gradient-to-b from-amber-50/30 to-white">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wider block">
              Stores Linked
            </span>
            <div className="text-2xl font-black text-amber-700 mt-1">
              {inventorySummary.participatingStores}
            </div>
            <span className="text-[10px] text-amber-600/80 mt-1 block">
              {inventorySummary.syncedRecords} items synced
            </span>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-sm bg-gradient-to-b from-white to-slate-50/50">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Active Issues
            </span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {dashboard?.topIssues?.length || 0}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Actionable diagnostics</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Interface */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-3 gap-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 text-xs font-semibold tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'products'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Product Feed ({summary.submittedProducts})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 text-xs font-semibold tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4" />
            Store Local Inventory
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`pb-3 text-xs font-semibold tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'diagnostics'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Diagnostics & Issues ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-xs font-semibold tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Merchant Account Settings
          </button>
        </div>

        {/* Tab 1: Products Feed */}
        {activeTab === 'products' && (
          <div className="p-6 space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by product name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Products</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DISAPPROVED">Disapproved</option>
                  <option value="ERROR">Sync Error</option>
                  <option value="NOT_SUBMITTED">Not Submitted</option>
                </select>
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Product / SKU</th>
                    <th className="py-3 px-4">Eligibility</th>
                    <th className="py-3 px-4">Base Price</th>
                    <th className="py-3 px-4">Merchant Status</th>
                    <th className="py-3 px-4">Store Coverage</th>
                    <th className="py-3 px-4">Last Sync</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        No products found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isApproved =
                        p.merchantStatus === 'APPROVED' || p.providerStatus === 'approved';
                      const isDisapproved =
                        p.merchantStatus === 'DISAPPROVED' || p.providerStatus === 'disapproved';
                      const isError = p.merchantStatus === 'ERROR';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{p.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              SKU: {p.sku}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {p.eligibility.isEligible ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0.5 font-medium">
                                Ready
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] px-2 py-0.5 font-medium">
                                Incomplete ({p.eligibility.issuesCount})
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            ₹{p.basePrice?.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            {isApproved && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Approved
                              </Badge>
                            )}
                            {isDisapproved && (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] flex items-center gap-1 w-fit">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Disapproved
                              </Badge>
                            )}
                            {isError && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Error
                              </Badge>
                            )}
                            {!isApproved && !isDisapproved && !isError && (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                                {p.merchantStatus}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">
                              {p.storeCoverageCount}
                            </span>{' '}
                            <span className="text-slate-400">stores</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {p.lastSubmittedAt
                              ? new Date(p.lastSubmittedAt).toLocaleDateString()
                              : 'Never'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncProduct(p.id)}
                              disabled={syncing}
                              className="text-[11px] h-7 px-2.5 text-slate-700 hover:text-amber-700 hover:border-amber-300"
                            >
                              Sync Now
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Store Local Inventory */}
        {activeTab === 'inventory' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-amber-600" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    Select Retail Location:
                  </span>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-800 mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.storeCode || 'No storeCode'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right text-xs text-slate-500 mr-2">
                  Store Code: <span className="font-mono font-bold text-slate-800">{storeInventory?.storeCode || 'N/A'}</span>
                </div>
                <Button
                  onClick={handleSyncStoreInventory}
                  disabled={syncing || !storeInventory?.storeCode}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                  Sync Store Inventory
                </Button>
              </div>
            </div>

            {/* Store Products Local Inventory Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Base Price</th>
                    <th className="py-3 px-4">Store Override</th>
                    <th className="py-3 px-4">Effective Price</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4">Local Feed Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {!storeInventory?.items || storeInventory.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No catalog items mapped to this store location.
                      </td>
                    </tr>
                  ) : (
                    storeInventory.items.map((it: any) => (
                      <tr key={it.productId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{it.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            SKU: {it.sku}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          ₹{it.basePrice?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {it.priceOverride ? (
                            <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                              ₹{it.priceOverride.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          ₹{it.effectivePrice?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {it.isAvailable ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              In Stock
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                              Out of Stock
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {it.syncStatus === 'SYNCED' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Synced
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                              {it.syncStatus}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Diagnostics & Issues */}
        {activeTab === 'diagnostics' && (
          <div className="p-6 space-y-4">
            <div className="text-xs text-slate-500">
              Real-time Google Merchant Center item-level diagnostics and disapproval reasons.
            </div>

            <div className="space-y-3">
              {issues.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <div className="font-semibold text-slate-700 text-sm">
                    No active diagnostics issues
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    All submitted products comply with Google Merchant Center feed specifications.
                  </div>
                </div>
              ) : (
                issues.map((iss: any) => (
                  <div
                    key={iss.id}
                    className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-rose-900 font-mono">
                          {iss.code}
                        </span>
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[9px] uppercase px-1.5 py-0">
                          {iss.severity}
                        </Badge>
                        {iss.product && (
                          <span className="text-xs text-slate-600 font-medium">
                            • {iss.product.name} ({iss.product.sku})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 mt-1">{iss.message}</p>
                      {iss.detail && (
                        <p className="text-[11px] text-slate-400 mt-1">{iss.detail}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Settings & Accounts */}
        {activeTab === 'settings' && (
          <div className="p-6 max-w-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Google Merchant Center Configuration</h2>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Mapped Merchant Center ID
                </span>
                <span className="font-mono text-slate-900 font-bold text-sm">
                  {dashboard?.merchantAccountId || 'Not Configured'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Target Country
                  </span>
                  <span className="font-semibold text-slate-900">
                    {dashboard?.targetCountry || 'IN'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Default Currency
                  </span>
                  <span className="font-semibold text-slate-900">
                    {dashboard?.defaultCurrency || 'INR'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
