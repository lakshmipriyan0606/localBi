'use client';

import { useState, useEffect, use } from 'react';
import {
  Users,
  Navigation,
  Search,
  Download,
  CheckCircle2,
  RefreshCw,
  Store,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { browserClient } from '@/lib/http/browser-client';
import { notify } from '@/lib/notify';

interface LeadItem {
  id: string;
  type: 'FORM' | 'CALL' | 'WHATSAPP' | 'BOOKING';
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'CLOSED' | 'SPAM';
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
  firstTouchSource?: string | null;
  firstTouchMedium?: string | null;
  firstTouchLandingPage?: string | null;
  lastTouchSource?: string | null;
  lastTouchPage?: string | null;
  createdAt: string;
  brand?: { id: string; name: string } | null;
  webSurface?: { id: string; type: string } | null;
  store?: { id: string; name: string; city?: string | null } | null;
  product?: { id: string; name: string; sku?: string | null } | null;
}

interface LeadStats {
  totalLeads: number;
  formLeads: number;
  callLeads: number;
  whatsappLeads: number;
  bookingLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  spamLeads: number;
}

interface ConversionSummary {
  pageViews: number;
  callClicks: number;
  whatsappClicks: number;
  directionsClicks: number;
  formSubmits: number;
  bookingStarts: number;
  bookingCompletes: number;
  totalConversions: number;
  totalLeads: number;
  conversionRate: number;
  formulaLabel: string;
}

interface StoreConversion {
  storeId: string;
  storeName: string;
  storeCode?: string | null;
  city?: string | null;
  pageViews: number;
  callClicks: number;
  whatsappClicks: number;
  directionsClicks: number;
  formSubmits: number;
  bookingCompletes: number;
  totalConversions: number;
  conversionRate: number;
}

interface PageConversion {
  path: string;
  pageType?: string | null;
  views: number;
  conversions: number;
  conversionRate: number;
}

interface ProductConversion {
  productId: string;
  productName: string;
  sku?: string | null;
  basePrice?: number | null;
  views: number;
  callClicks: number;
  whatsappClicks: number;
  formSubmits: number;
  totalConversions: number;
}

export default function TenantLeadsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const resolvedParams = use(params);
  const tenantSlug = resolvedParams.tenantSlug;

  const [activeTab, setActiveTab] = useState<'inbox' | 'attribution'>('inbox');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [leadTypeFilter, setLeadTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [summary, setSummary] = useState<ConversionSummary | null>(null);
  const [stores, setStores] = useState<StoreConversion[]>([]);
  const [pages, setPages] = useState<PageConversion[]>([]);
  const [products, setProducts] = useState<ProductConversion[]>([]);

  const fetchLeadsAndReports = async () => {
    try {
      setLoading(true);

      let startDate: string | undefined;
      const now = new Date();
      if (dateRange === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === '90d') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      }

      const queryParams = new URLSearchParams();
      if (startDate) queryParams.set('startDate', startDate);
      if (leadTypeFilter !== 'ALL') queryParams.set('type', leadTypeFilter);
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());

      const [leadsRes, reportsRes] = await Promise.all([
        browserClient.get<{
          leads: LeadItem[];
          stats: LeadStats;
        }>(`/tenants/${tenantSlug}/leads?${queryParams.toString()}`),
        browserClient.get<{
          summary: ConversionSummary;
          stores: StoreConversion[];
          products: ProductConversion[];
          pages: PageConversion[];
        }>(`/tenants/${tenantSlug}/reports/conversions?${startDate ? `startDate=${startDate}` : ''}`),
      ]);

      if (leadsRes.data) {
        setLeads(leadsRes.data.leads || []);
        setStats(leadsRes.data.stats || null);
      }

      if (reportsRes.data) {
        setSummary(reportsRes.data.summary || null);
        setStores(reportsRes.data.stores || []);
        setProducts(reportsRes.data.products || []);
        setPages(reportsRes.data.pages || []);
      }
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      notify.error(err?.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeadsAndReports();
  }, [tenantSlug, dateRange, leadTypeFilter, statusFilter]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await browserClient.patch(`/tenants/${tenantSlug}/leads/${leadId}`, {
        status: newStatus,
      });

      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus as any } : lead))
      );

      notify.success(`Lead status updated to ${newStatus}`);
    } catch (err: any) {
      notify.error(err?.message || 'Failed to update lead status');
    }
  };

  // Safe CSV export with formula injection prevention
  const handleExportCsv = () => {
    if (leads.length === 0) return;

    const sanitizeCell = (val: string | null | undefined): string => {
      if (!val) return '""';
      let str = String(val).replace(/"/g, '""');
      // Escape potential spreadsheet formula injection characters
      if (['=', '+', '-', '@'].includes(str.charAt(0))) {
        str = "'" + str;
      }
      return `"${str}"`;
    };

    const headers = [
      'ID',
      'Date',
      'Type',
      'Status',
      'Name',
      'Phone',
      'Email',
      'Store',
      'Product',
      'First Touch Source',
      'Last Touch Page',
      'Message',
    ];

    const rows = leads.map((lead) => [
      sanitizeCell(lead.id),
      sanitizeCell(new Date(lead.createdAt).toLocaleString()),
      sanitizeCell(lead.type),
      sanitizeCell(lead.status),
      sanitizeCell(lead.name),
      sanitizeCell(lead.phone),
      sanitizeCell(lead.email),
      sanitizeCell(lead.store?.name),
      sanitizeCell(lead.product?.name),
      sanitizeCell(lead.firstTouchSource),
      sanitizeCell(lead.lastTouchPage),
      sanitizeCell(lead.message),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_${tenantSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 5 Active
            </span>
            <span className="text-xs text-slate-400 font-medium">Attribution Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Leads & Conversion Attribution
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real commercial inquiries, phone calls, WhatsApp messages, and directions generated by LocalBi pages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchLeadsAndReports();
            }}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={leads.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {stats?.totalLeads ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-100">
            <span>{stats?.formLeads ?? 0} forms</span>
            <span>•</span>
            <span>{stats?.whatsappLeads ?? 0} WhatsApp</span>
            <span>•</span>
            <span>{stats?.callLeads ?? 0} calls</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Direction Clicks</span>
            <Navigation className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {summary?.directionsClicks ?? 0}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium pt-1 border-t border-slate-100">
            High-intent in-person navigation
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Conversions</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {summary?.totalConversions ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            Calls + WhatsApp + Directions + Forms
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Conversion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900">
            {summary ? `${summary.conversionRate}%` : '0.00%'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono truncate pt-1 border-t border-slate-100">
            {summary?.formulaLabel || 'Conversions / Page Views'}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'inbox'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Leads Inbox ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab('attribution')}
            className={`pb-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'attribution'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Conversion Attribution Breakdown
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 pb-2">
          {(['7d', '30d', '90d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                dateRange === r
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Leads Inbox */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search leads by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchLeadsAndReports();
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={leadTypeFilter}
                onChange={(e) => setLeadTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="FORM">Forms</option>
                <option value="CALL">Calls</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="BOOKING">Bookings</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="CONVERTED">Converted</option>
                <option value="SPAM">Spam</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Leads Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                <span>Loading leads from database...</span>
              </div>
            ) : leads.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">No leads recorded yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When visitors submit inquiries on your LocalBi microsite pages or click WhatsApp and Call buttons, they will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold">
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Customer Contact</th>
                      <th className="py-3 px-4">Store / Product</th>
                      <th className="py-3 px-4">Attribution Source</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                          {new Date(lead.createdAt).toLocaleDateString()}{' '}
                          <span className="text-[10px] text-slate-400">
                            {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              lead.type === 'FORM'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : lead.type === 'WHATSAPP'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : lead.type === 'CALL'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {lead.type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{lead.name || 'Anonymous Customer'}</div>
                          <div className="text-[11px] text-slate-500">{lead.phone || 'No phone provided'}</div>
                          {lead.email && <div className="text-[10px] text-slate-400">{lead.email}</div>}
                          {lead.message && (
                            <div className="text-[11px] text-slate-600 mt-1 max-w-xs truncate italic">
                              "{lead.message}"
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">
                            {lead.store?.name || 'All Stores'}
                          </div>
                          {lead.product && (
                            <div className="text-[11px] text-indigo-600 flex items-center gap-1 mt-0.5">
                              <Package className="w-3 h-3" />
                              <span>{lead.product.name}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-700">
                            {lead.firstTouchSource || 'direct'} / {lead.firstTouchMedium || 'none'}
                          </div>
                          {lead.lastTouchPage && (
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                              {lead.lastTouchPage}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              lead.status === 'NEW'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : lead.status === 'QUALIFIED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : lead.status === 'CONVERTED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : lead.status === 'SPAM'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {lead.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className="px-2 py-1 text-[11px] font-medium border border-slate-200 rounded-md bg-white text-slate-700 hover:border-slate-300 focus:outline-none"
                          >
                            <option value="NEW">Mark New</option>
                            <option value="CONTACTED">Mark Contacted</option>
                            <option value="QUALIFIED">Mark Qualified</option>
                            <option value="CONVERTED">Mark Converted</option>
                            <option value="CLOSED">Mark Closed</option>
                            <option value="SPAM">Mark Spam</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Conversion Attribution Breakdown */}
      {activeTab === 'attribution' && (
        <div className="space-y-8">
          {/* Store Breakdown */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-600" />
              <span>Store Conversion Attribution</span>
            </h3>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              {stores.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No store attribution data found for the selected period.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold">
                      <th className="py-3 px-4">Store Name</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4 text-right">Page Views</th>
                      <th className="py-3 px-4 text-right">Call Clicks</th>
                      <th className="py-3 px-4 text-right">WhatsApp</th>
                      <th className="py-3 px-4 text-right">Directions</th>
                      <th className="py-3 px-4 text-right">Forms</th>
                      <th className="py-3 px-4 text-right">Total Conversions</th>
                      <th className="py-3 px-4 text-right">Conv. Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {stores.map((s) => (
                      <tr key={s.storeId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{s.storeName}</td>
                        <td className="py-3.5 px-4 text-slate-500">{s.city || '—'}</td>
                        <td className="py-3.5 px-4 text-right font-medium">{s.pageViews.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-sky-700">{s.callClicks}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-emerald-700">{s.whatsappClicks}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-800">{s.directionsClicks}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-indigo-700">{s.formSubmits}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {s.totalConversions}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-indigo-600">
                          {s.conversionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Top Converting Pages */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Top Converting Pages</span>
            </h3>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              {pages.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No page conversion data recorded yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold">
                      <th className="py-3 px-4">Page Path</th>
                      <th className="py-3 px-4">Page Type</th>
                      <th className="py-3 px-4 text-right">Page Views</th>
                      <th className="py-3 px-4 text-right">Conversions</th>
                      <th className="py-3 px-4 text-right">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pages.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-900">{p.path}</td>
                        <td className="py-3.5 px-4 text-slate-500">{p.pageType || 'GENERAL'}</td>
                        <td className="py-3.5 px-4 text-right font-medium">{p.views.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-indigo-600">{p.conversions}</td>
                        <td className="py-3.5 px-4 text-right font-semibold">{p.conversionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          {/* Product Conversions */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>Product Conversion Attribution</span>
            </h3>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              {products.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No product-level conversion data recorded yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 font-semibold">
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4 text-right">Views</th>
                      <th className="py-3 px-4 text-right">Call Clicks</th>
                      <th className="py-3 px-4 text-right">WhatsApp</th>
                      <th className="py-3 px-4 text-right">Form Inquiries</th>
                      <th className="py-3 px-4 text-right">Total Conversions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {products.map((p) => (
                      <tr key={p.productId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{p.productName}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{p.sku || '—'}</td>
                        <td className="py-3.5 px-4 text-right font-medium">{p.views.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-sky-700">{p.callClicks}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-emerald-700">{p.whatsappClicks}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-indigo-700">{p.formSubmits}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-indigo-600">
                          {p.totalConversions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
