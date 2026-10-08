'use client';

import { useState, useEffect } from 'react';
import {
  Link2,
  Globe2,
  Building2,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AuthorityOverviewTab } from '@/modules/seo-authority/components/authority-overview-tab';
import { BacklinksTable } from '@/modules/seo-authority/components/backlinks-table';
import { ReferringDomainsTable } from '@/modules/seo-authority/components/referring-domains-table';
import { CompetitorGapsView } from '@/modules/seo-authority/components/competitor-gaps-view';
import { CitationsIntelligenceTab } from '@/modules/seo-authority/components/citations-intelligence-tab';
import { AuthorityOpportunitiesView } from '@/modules/seo-authority/components/authority-opportunities-view';
import {
  SeoAuthorityOverviewDto,
  BacklinkRecord,
  ReferringDomainRecord,
  CompetitorBacklinkGapCandidate,
  StoreCitationOverview,
  FollowState,
  BacklinkStatus,
} from '@/modules/seo-authority/authority-types';

interface SeoAuthorityClientViewProps {
  tenantSlug: string;
  brands: { id: string; name: string }[];
  locations: { id: string; name: string; city: string; brandId: string }[];
  surfaces: {
    id: string;
    brandId: string;
    surfaceType: string;
    subdomain?: string | null;
    customDomain?: string | null;
    originalUrl?: string | null;
  }[];
  initialBrandId?: string;
  initialStoreId?: string;
  initialSurfaceId?: string;
}

import { useActiveBrand } from '@/providers/active-brand-context';

export function SeoAuthorityClientView({
  tenantSlug,
  brands,
  locations,
  surfaces,
  initialBrandId,
  initialStoreId,
  initialSurfaceId,
}: SeoAuthorityClientViewProps) {
  const brandCtx = useActiveBrand();
  const effectiveBrandId = brandCtx?.activeBrandId || initialBrandId || brands[0]?.id || '';
  const [selectedBrandId, setSelectedBrandId] = useState<string>(effectiveBrandId);

  useEffect(() => {
    if (brandCtx?.activeBrandId && brandCtx.activeBrandId !== selectedBrandId) {
      setSelectedBrandId(brandCtx.activeBrandId);
    }
  }, [brandCtx?.activeBrandId, selectedBrandId]);

  const brandSurfaces = surfaces.filter((s) => s.brandId === selectedBrandId);
  const [selectedSurfaceId, setSelectedSurfaceId] = useState<string>(
    initialSurfaceId || brandSurfaces[0]?.id || ''
  );

  const brandStores = locations.filter((l) => l.brandId === selectedBrandId);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    initialStoreId || brandStores[0]?.id || locations[0]?.id || ''
  );

  const [activeTab, setActiveTab] = useState<
    'overview' | 'backlinks' | 'domains' | 'gaps' | 'citations' | 'opportunities'
  >('overview');

  // Data states
  const [overview, setOverview] = useState<SeoAuthorityOverviewDto | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [backlinks, setBacklinks] = useState<BacklinkRecord[]>([]);
  const [backlinksTotal, setBacklinksTotal] = useState(0);
  const [backlinksPage, setBacklinksPage] = useState(1);
  const [backlinksSearch, setBacklinksSearch] = useState('');
  const [backlinksFollow, setBacklinksFollow] = useState<FollowState | undefined>();
  const [backlinksStatus, setBacklinksStatus] = useState<BacklinkStatus | undefined>();
  const [backlinksLoading, setBacklinksLoading] = useState(false);

  const [domains, setDomains] = useState<ReferringDomainRecord[]>([]);
  const [domainsTotal, setDomainsTotal] = useState(0);
  const [domainsPage, setDomainsPage] = useState(1);
  const [domainsSearch, setDomainsSearch] = useState('');
  const [domainsLoading, setDomainsLoading] = useState(false);

  const [gaps, setGaps] = useState<CompetitorBacklinkGapCandidate[]>([]);
  const [gapsLoading, setGapsLoading] = useState(false);

  const [citationData, setCitationData] = useState<StoreCitationOverview | null>(null);
  const [citationLoading, setCitationLoading] = useState(false);

  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  // Sync surfaces when brand changes
  useEffect(() => {
    const validSurfaces = surfaces.filter((s) => s.brandId === selectedBrandId);
    if (validSurfaces.length > 0 && !validSurfaces.some((s) => s.id === selectedSurfaceId)) {
      setSelectedSurfaceId(validSurfaces[0]!.id);
    }
    const validStores = locations.filter((s) => s.brandId === selectedBrandId);
    if (validStores.length > 0 && !validStores.some((s) => s.id === selectedStoreId)) {
      setSelectedStoreId(validStores[0]!.id);
    }
  }, [selectedBrandId, surfaces, locations, selectedSurfaceId, selectedStoreId]);

  // Fetch Overview
  const fetchOverview = async () => {
    if (!selectedBrandId) return;
    setOverviewLoading(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/authority/overview?brandId=${selectedBrandId}&webSurfaceId=${selectedSurfaceId}`
      );
      if (res.ok) {
        const json = await res.json();
        setOverview(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Fetch Backlinks
  const fetchBacklinks = async () => {
    if (!selectedBrandId) return;
    setBacklinksLoading(true);
    try {
      const params = new URLSearchParams({
        brandId: selectedBrandId,
        webSurfaceId: selectedSurfaceId,
        page: String(backlinksPage),
        limit: '25',
      });
      if (backlinksSearch) params.set('search', backlinksSearch);
      if (backlinksFollow) params.set('followState', backlinksFollow);
      if (backlinksStatus) params.set('status', backlinksStatus);

      const res = await fetch(`/api/tenants/${tenantSlug}/authority/backlinks?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setBacklinks(json.data || []);
        setBacklinksTotal(json.totalCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBacklinksLoading(false);
    }
  };

  // Fetch Referring Domains
  const fetchDomains = async () => {
    if (!selectedBrandId) return;
    setDomainsLoading(true);
    try {
      const params = new URLSearchParams({
        brandId: selectedBrandId,
        webSurfaceId: selectedSurfaceId,
        page: String(domainsPage),
        limit: '25',
      });
      if (domainsSearch) params.set('search', domainsSearch);

      const res = await fetch(
        `/api/tenants/${tenantSlug}/authority/referring-domains?${params.toString()}`
      );
      if (res.ok) {
        const json = await res.json();
        setDomains(json.data || []);
        setDomainsTotal(json.totalCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDomainsLoading(false);
    }
  };

  // Fetch Gaps
  const fetchGaps = async () => {
    if (!selectedBrandId) return;
    setGapsLoading(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/authority/competitor-gaps?brandId=${selectedBrandId}&webSurfaceId=${selectedSurfaceId}`
      );
      if (res.ok) {
        const json = await res.json();
        setGaps(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGapsLoading(false);
    }
  };

  // Fetch Citations
  const fetchCitations = async () => {
    if (!selectedStoreId) return;
    setCitationLoading(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/authority/citations?storeId=${selectedStoreId}`
      );
      if (res.ok) {
        const json = await res.json();
        setCitationData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCitationLoading(false);
    }
  };

  // Trigger sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch(`/api/tenants/${tenantSlug}/authority/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          webSurfaceId: selectedSurfaceId,
        }),
      });
      await fetchOverview();
      if (activeTab === 'backlinks') await fetchBacklinks();
      if (activeTab === 'domains') await fetchDomains();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedBrandId, selectedSurfaceId]);

  useEffect(() => {
    if (activeTab === 'backlinks') fetchBacklinks();
    if (activeTab === 'domains') fetchDomains();
    if (activeTab === 'gaps') fetchGaps();
    if (activeTab === 'citations') fetchCitations();
  }, [
    activeTab,
    selectedBrandId,
    selectedSurfaceId,
    selectedStoreId,
    backlinksPage,
    backlinksSearch,
    backlinksFollow,
    backlinksStatus,
    domainsPage,
    domainsSearch,
  ]);

  return (
    <div className="space-y-6">
      {/* ── Top Header and Context Controls ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            SEO Authority Intelligence
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Enterprise backlink intelligence, competitor referral gaps, and local business directory consistency
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Brand Selector - Commented out per client feedback: Brand selection is handled globally via the top header. Uncomment if local selection is needed.
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          */}

          {/* WebSurface Selector */}
          {brandSurfaces.length > 0 && (
            <select
              value={selectedSurfaceId}
              onChange={(e) => setSelectedSurfaceId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              {brandSurfaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.surfaceType === 'LOCALBI_SUBDOMAIN'
                    ? `LocalBi Subdomain (${s.subdomain})`
                    : `Original Site (${s.customDomain || s.originalUrl})`}
                </option>
              ))}
            </select>
          )}

          {/* Sync Trigger */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Provider'}
          </button>
        </div>
      </div>

      {/* ── Main Navigation Tabs ── */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-white px-2 rounded-t-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          Overview
        </button>

        <button
          onClick={() => setActiveTab('backlinks')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'backlinks'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Link2 className="h-4 w-4" />
          Backlinks ({overview?.backlinks.totalBacklinks || 0})
        </button>

        <button
          onClick={() => setActiveTab('domains')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'domains'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe2 className="h-4 w-4" />
          Referring Domains ({overview?.backlinks.referringDomains || 0})
        </button>

        <button
          onClick={() => setActiveTab('gaps')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'gaps'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="h-4 w-4 text-purple-600" />
          Competitor Gaps ({gaps.length})
        </button>

        <button
          onClick={() => setActiveTab('citations')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'citations'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4 text-emerald-600" />
          Citation Intelligence
        </button>

        <button
          onClick={() => setActiveTab('opportunities')}
          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'opportunities'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          Opportunities
        </button>
      </div>

      {/* ── Active Tab Content ── */}
      <div>
        {activeTab === 'overview' && (
          <AuthorityOverviewTab
            overview={overview}
            onTabChange={setActiveTab}
            onSync={handleSync}
            isSyncing={isSyncing}
          />
        )}

        {activeTab === 'backlinks' && (
          <BacklinksTable
            tenantSlug={tenantSlug}
            items={backlinks}
            totalCount={backlinksTotal}
            page={backlinksPage}
            limit={25}
            onPageChange={setBacklinksPage}
            onSearchChange={setBacklinksSearch}
            onFollowStateChange={setBacklinksFollow}
            onStatusChange={setBacklinksStatus}
            loading={backlinksLoading}
          />
        )}

        {activeTab === 'domains' && (
          <ReferringDomainsTable
            items={domains}
            totalCount={domainsTotal}
            page={domainsPage}
            limit={25}
            onPageChange={setDomainsPage}
            onSearchChange={setDomainsSearch}
            loading={domainsLoading}
          />
        )}

        {activeTab === 'gaps' && (
          <CompetitorGapsView
            tenantSlug={tenantSlug}
            brandId={selectedBrandId}
            webSurfaceId={selectedSurfaceId}
            gaps={gaps}
            loading={gapsLoading}
            onOpportunityCreated={() => {
              fetchOverview();
              fetchGaps();
            }}
          />
        )}

        {activeTab === 'citations' && (
          <CitationsIntelligenceTab
            tenantSlug={tenantSlug}
            stores={brandStores.length > 0 ? brandStores : locations}
            selectedStoreId={selectedStoreId}
            onStoreChange={setSelectedStoreId}
            citationData={citationData}
            loading={citationLoading}
          />
        )}

        {activeTab === 'opportunities' && (
          <AuthorityOpportunitiesView
            tenantSlug={tenantSlug}
            opportunities={opportunities}
            loading={opportunitiesLoading}
            onRefresh={fetchOverview}
          />
        )}
      </div>
    </div>
  );
}
