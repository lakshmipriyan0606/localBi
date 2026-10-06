'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Users,
  Eye,
  Clock,
  Target,
  PhoneCall,
  MessageCircle,
  Navigation,
  Globe,
  Smartphone,
  Laptop,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Info,
  Calendar,
  Zap,
  Activity,
  ArrowUpRight,
  X,
} from 'lucide-react';
import {
  AnalyticsPageShell,
  MetricCard,
  DateRangeSelector,
  SourceBadge,
  FreshnessIndicator,
  DataTable,
  AnalyticsEmptyState,
} from '@/components/analytics';
import {
  ChartContainer,
  AreaTrendChart,
  HorizontalBarChart,
  FunnelChart,
} from '@/components/charts';
import type { DateRangePreset } from '@/shared/analytics/date-range';
import type {
  WebAnalyticsOverviewDto,
  AudienceDto,
  AcquisitionDto,
  PageAnalyticsDto,
  StoreAnalyticsDto,
  ProductAnalyticsDto,
  ConversionAnalyticsDto,
  VisitorListItemDto,
  SessionListItemDto,
  JourneyEventDto,
} from '@/modules/analytics/web-analytics-service';

export default function WebAnalyticsPage() {
  const routeParams = useParams();
  const tenantSlug = (routeParams?.tenantSlug as string) || '';

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'audience' | 'acquisition' | 'pages' | 'stores' | 'products' | 'conversions' | 'visitors' | 'sessions'
  >('overview');

  // Date Range State
  const [preset, setPreset] = useState<DateRangePreset>('LAST_30_DAYS');
  const [selectedMetric, setSelectedMetric] = useState<'visitors' | 'sessions' | 'pageViews' | 'conversions'>('visitors');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<WebAnalyticsOverviewDto | null>(null);
  const [audience, setAudience] = useState<AudienceDto | null>(null);
  const [acquisition, setAcquisition] = useState<AcquisitionDto | null>(null);
  const [pagesData, setPagesData] = useState<PageAnalyticsDto | null>(null);
  const [storesData, setStoresData] = useState<StoreAnalyticsDto | null>(null);
  const [productsData, setProductsData] = useState<ProductAnalyticsDto | null>(null);
  const [conversionsData, setConversionsData] = useState<ConversionAnalyticsDto | null>(null);
  const [visitorsList, setVisitorsList] = useState<VisitorListItemDto[]>([]);
  const [sessionsList, setSessionsList] = useState<SessionListItemDto[]>([]);

  // Realtime Polling
  const [realtimeVisitors, setRealtimeVisitors] = useState<number>(0);

  // Modals / Drawers
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorListItemDto | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [journeyEvents, setJourneyEvents] = useState<JourneyEventDto[]>([]);
  const [loadingJourney, setLoadingJourney] = useState(false);

  // 1. Fetch Overview & Tab-Specific Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = `?preset=${preset}`;
      if (activeTab === 'overview') {
        const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web${qs}`);
        if (res.ok) setOverview(await res.json());
      } else if (activeTab === 'audience') {
        const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web/audience${qs}`);
        if (res.ok) setAudience(await res.json());
      } else if (activeTab === 'acquisition') {
        const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web/acquisition${qs}`);
        if (res.ok) setAcquisition(await res.json());
      } else if (activeTab === 'pages') {
        const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web/pages${qs}`);
        if (res.ok) setPagesData(await res.json());
      } else if (activeTab === 'stores') {
        const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web/stores${qs}`);
        if (res.ok) setStoresData(await res.json());
      } else if (activeTab === 'products') {
        const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web/products${qs}`);
        if (res.ok) setProductsData(await res.json());
      } else if (activeTab === 'conversions') {
        const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web/conversions${qs}`);
        if (res.ok) setConversionsData(await res.json());
      } else if (activeTab === 'visitors') {
        const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web/visitors${qs}`);
        if (res.ok) {
          const data = await res.json();
          setVisitorsList(data.visitors || []);
        }
      } else if (activeTab === 'sessions') {
        const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web/sessions${qs}`);
        if (res.ok) {
          const data = await res.json();
          setSessionsList(data.sessions || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch web analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantSlug, preset, activeTab]);

  // 2. Realtime Activity Polling (every 30s)
  useEffect(() => {
    const fetchRealtime = async () => {
      try {
        const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web/realtime`);
        if (res.ok) {
          const data = await res.json();
          setRealtimeVisitors(data.activeVisitorsNow || 0);
        }
      } catch {}
    };
    fetchRealtime();
    const interval = setInterval(fetchRealtime, 30000);
    return () => clearInterval(interval);
  }, [tenantSlug]);

  // 3. Fetch Journey on Session click
  const handleOpenJourney = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setLoadingJourney(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/analytics/web/sessions/${sessionId}/journey`);
      if (res.ok) {
        const data = await res.json();
        setJourneyEvents(data.journey || []);
      }
    } catch (err) {
      console.error('Failed to load session journey:', err);
    } finally {
      setLoadingJourney(false);
    }
  };

  const navTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'audience', label: 'Audience' },
    { id: 'acquisition', label: 'Acquisition' },
    { id: 'pages', label: 'Pages' },
    { id: 'stores', label: 'Stores' },
    { id: 'products', label: 'Products' },
    { id: 'conversions', label: 'Conversions & Funnel' },
    { id: 'visitors', label: 'Visitors' },
    { id: 'sessions', label: 'Sessions' },
  ] as const;

  return (
    <AnalyticsPageShell
      title="First-Party Web Analytics"
      description="Accurate visitor journeys, active engagement time, store & product conversion attribution"
      secondaryActions={
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Visitors Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span><strong>{realtimeVisitors}</strong> active now</span>
          </div>

          <SourceBadge source="LOCALBI" />
          <DateRangeSelector
            preset={preset}
            onPresetChange={(p) => setPreset(p)}
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      }
    >
      {/* ── Provenance & Measurement Transparency Banner ── */}
      <div className="bg-gradient-to-r from-indigo-50/70 to-slate-50 border border-indigo-100/80 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">
            LocalBi First-Party Measurement Engine
          </p>
          <p className="text-slate-600 leading-relaxed">
            Active engagement timing accumulates <strong>only while the page is visible and active</strong>.
            Background tabs and periods of idle inactivity (&gt;60s) are automatically excluded.
            First-party metrics are strictly separated from Google Analytics (GA4) and Google Search Console (GSC) models.
          </p>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-2xs font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {overview && (
            <>
              {/* Primary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Unique Visitors"
                  value={overview.metrics.visitors}
                  icon={Users}
                  tooltip="Distinct anonymous first-party visitor IDs (lb_vid) recorded"
                  source="LOCALBI"
                />
                <MetricCard
                  title="Total Sessions"
                  value={overview.metrics.sessions}
                  icon={Activity}
                  tooltip="30-minute inactivity boundary sessions"
                  source="LOCALBI"
                />
                <MetricCard
                  title="Pageviews"
                  value={overview.metrics.pageViews}
                  icon={Eye}
                  tooltip="Total verified logical page views across all surfaces"
                  source="LOCALBI"
                />
                <MetricCard
                  title="Lead Conversions"
                  value={overview.metrics.conversions}
                  icon={Target}
                  tooltip="Confirmed form submissions and completed bookings"
                  source="LOCALBI"
                />
              </div>

              {/* Secondary Metric Badges Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs text-center">
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">New Visitors</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{overview.metrics.newVisitors}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Returning</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{overview.metrics.returningVisitors}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Engaged Sessions</div>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5">{overview.metrics.engagedSessions}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Avg Active Engagement</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {Math.floor(overview.metrics.avgActiveEngagementSeconds / 60)}m {overview.metrics.avgActiveEngagementSeconds % 60}s
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Conversion Rate</div>
                  <div className="text-lg font-bold text-indigo-600 mt-0.5">{overview.metrics.conversionRate}%</div>
                </div>
              </div>

              {/* Trend Chart with Metric Switcher */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Engagement & Traffic Trend</h3>
                    <p className="text-xs text-slate-500">Daily timeseries distribution for the selected date range</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                    {(['visitors', 'sessions', 'pageViews', 'conversions'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedMetric(m)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${
                          selectedMetric === m
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m === 'pageViews' ? 'Pageviews' : m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[280px]">
                  <AreaTrendChart
                    data={overview.trend.map((t) => ({
                      date: t.date,
                      value: t[selectedMetric],
                    }))}
                    series={[{ key: 'value', name: selectedMetric.toUpperCase(), color: '#4F46E5' }]}
                    xAxisKey="date"
                  />
                </div>
              </div>

              {/* Conversion Funnel & Top Sources Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversion Funnel */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Conversion Funnel</h3>
                  <p className="text-xs text-slate-500">Step-by-step visitor journey progression to lead conversion</p>
                  <FunnelChart
                    stages={overview.funnel.map((f) => ({
                      name: f.stage,
                      count: f.count,
                    }))}
                  />
                </div>

                {/* Top Sources */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Top Acquisition Sources</h3>
                  <p className="text-xs text-slate-500">First-touch traffic sources bringing visitors to the site</p>
                  <div className="space-y-3">
                    {overview.topSources.map((src, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 capitalize">{src.source}</span>
                          <span className="text-slate-500">{src.sessions} sessions ({src.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, src.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Landing Pages & Top Stores Quick Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Top Landing Pages</h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {overview.topLandingPages.map((lp, i) => (
                      <div key={i} className="py-2.5 flex items-center justify-between">
                        <span className="font-mono text-slate-800 truncate max-w-[280px]">{lp.path}</span>
                        <div className="flex items-center gap-3 text-slate-600">
                          <span>{lp.sessions} visits</span>
                          <span className="font-semibold text-emerald-600">{lp.conversions} leads</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Top Performing Stores</h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {overview.topStores.map((s, i) => (
                      <div key={i} className="py-2.5 flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{s.storeName}</span>
                        <div className="flex items-center gap-3 text-slate-600">
                          <span>{s.views} views</span>
                          <span className="font-semibold text-emerald-600">{s.conversions} leads</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {!overview && !loading && (
            <AnalyticsEmptyState
              title="No Web Traffic Recorded Yet"
              description="No visitor events have been ingested for this date range. Verify your published Site Studio website is receiving visits."
            />
          )}
        </div>
      )}

      {/* ── TAB 2: AUDIENCE ── */}
      {activeTab === 'audience' && audience && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* New vs Returning */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Visitor Loyalty & Frequency</h3>
              <p className="text-xs text-slate-500">Anonymous new visitors vs recognized returning cookie tokens</p>
              <div className="flex items-center gap-6 py-6 justify-center">
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-indigo-600">{audience.newVsReturning.newPercent}%</div>
                  <div className="text-xs text-slate-500 mt-1">New ({audience.newVsReturning.newVisitors})</div>
                </div>
                <div className="w-px h-12 bg-slate-200" />
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-emerald-600">{audience.newVsReturning.returningPercent}%</div>
                  <div className="text-xs text-slate-500 mt-1">Returning ({audience.newVsReturning.returningVisitors})</div>
                </div>
              </div>
            </div>

            {/* Devices */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Device Category Distribution</h3>
              <p className="text-xs text-slate-500">Coarse hardware category without invasive browser entropy</p>
              <div className="space-y-3 pt-2">
                {audience.devices.map((d, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span>{d.category}</span>
                      <span>{d.sessions} sessions ({d.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${d.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Browsers & Geography */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Browsers</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {audience.browsers.map((b, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{b.browser}</span>
                    <span className="text-slate-500">{b.sessions} sessions ({b.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Geographic Distribution</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {audience.geography.map((g, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{g.city}, {g.region}</span>
                    <span className="text-slate-500">{g.sessions} sessions</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ACQUISITION ── */}
      {activeTab === 'acquisition' && acquisition && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Traffic Acquisition Channels</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Visitors</th>
                    <th className="py-3 px-4">Sessions</th>
                    <th className="py-3 px-4">Conversions</th>
                    <th className="py-3 px-4">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {acquisition.channels.map((ch, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold">{ch.channel}</td>
                      <td className="py-3 px-4">{ch.visitors}</td>
                      <td className="py-3 px-4">{ch.sessions}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">{ch.conversions}</td>
                      <td className="py-3 px-4 font-semibold">{ch.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Source / Medium</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {acquisition.sources.map((s, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{s.source} / {s.medium}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{s.sessions} visits</span>
                      <span className="font-bold text-emerald-600">{s.conversions} leads</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-bold text-slate-900">Campaigns (UTM)</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {acquisition.campaigns.map((c, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{c.campaign}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{c.sessions} visits</span>
                      <span className="font-bold text-emerald-600">{c.conversions} leads</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: PAGES ── */}
      {activeTab === 'pages' && pagesData && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Pages Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Page Path</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Views</th>
                    <th className="py-3 px-4">Visitors</th>
                    <th className="py-3 px-4">Avg Active Time</th>
                    <th className="py-3 px-4">CTA Actions</th>
                    <th className="py-3 px-4">Conversions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {pagesData.pages.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{p.path}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {p.pageType}
                        </span>
                      </td>
                      <td className="py-3 px-4">{p.views}</td>
                      <td className="py-3 px-4">{p.visitors}</td>
                      <td className="py-3 px-4">{p.avgActiveSeconds}s</td>
                      <td className="py-3 px-4 text-indigo-600 font-semibold">{p.ctaActions}</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">{p.conversions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: STORES ── */}
      {activeTab === 'stores' && storesData && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Store-by-Store Analytics</h3>
                <p className="text-xs text-slate-500">Website store locator views, call clicks, WhatsApp messages, and directions</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Store Name</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Views</th>
                    <th className="py-3 px-4">Active Time</th>
                    <th className="py-3 px-4">Calls</th>
                    <th className="py-3 px-4">WhatsApp</th>
                    <th className="py-3 px-4">Directions</th>
                    <th className="py-3 px-4">Form Leads</th>
                    <th className="py-3 px-4">Conv Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {storesData.stores.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.storeName}</td>
                      <td className="py-3 px-4 text-slate-500">{s.city || '—'}</td>
                      <td className="py-3 px-4">{s.pageViews}</td>
                      <td className="py-3 px-4">{s.avgActiveSeconds}s</td>
                      <td className="py-3 px-4 text-blue-600 font-medium">{s.callClicks}</td>
                      <td className="py-3 px-4 text-emerald-600 font-medium">{s.whatsappClicks}</td>
                      <td className="py-3 px-4 text-purple-600 font-medium">{s.directionsClicks}</td>
                      <td className="py-3 px-4 text-indigo-600 font-bold">{s.formSubmits}</td>
                      <td className="py-3 px-4 font-semibold">{s.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: PRODUCTS ── */}
      {activeTab === 'products' && productsData && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Product Engagement & Demand</h3>
            <p className="text-xs text-slate-500">Catalog items viewed, inquiries started, and lead conversions</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Views</th>
                    <th className="py-3 px-4">Active Time</th>
                    <th className="py-3 px-4">CTA Clicks</th>
                    <th className="py-3 px-4">Leads</th>
                    <th className="py-3 px-4">Conv Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {productsData.products.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.productName}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{p.sku || '—'}</td>
                      <td className="py-3 px-4">{p.views}</td>
                      <td className="py-3 px-4">{p.avgActiveSeconds}s</td>
                      <td className="py-3 px-4 text-indigo-600 font-semibold">{p.ctaActions}</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">{p.leads}</td>
                      <td className="py-3 px-4 font-semibold">{p.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 7: CONVERSIONS & FUNNEL ── */}
      {activeTab === 'conversions' && conversionsData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Call Clicks</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{conversionsData.websiteActions.callClicks}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">WhatsApp Clicks</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{conversionsData.websiteActions.whatsappClicks}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Directions Clicks</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">{conversionsData.websiteActions.directionsClicks}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Form Submissions</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">{conversionsData.confirmedConversions.formSubmits}</div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Website Conversion Funnel</h3>
            <div className="space-y-3">
              {conversionsData.funnel.map((step, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{step.step}</div>
                      <div className="text-[11px] text-slate-500">{step.sessions} sessions ({step.conversionRate}%)</div>
                    </div>
                  </div>
                  {step.dropoffRate > 0 && (
                    <span className="text-xs font-semibold text-rose-600">
                      -{step.dropoffRate}% dropoff
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Top User Journey Paths */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Top Multi-Touch Navigation Paths</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {conversionsData.topPaths.map((p, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-slate-800">
                    {p.path.map((segment, idx) => (
                      <React.Fragment key={idx}>
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">{segment}</span>
                        {idx < p.path.length - 1 && <span className="text-slate-400">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-slate-500">{p.sessions} sessions</span>
                    <span className="font-bold text-emerald-600">{p.conversions} converted</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 8: VISITORS ── */}
      {activeTab === 'visitors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Anonymous & Identified Visitors</h3>
            <p className="text-xs text-slate-500">Every anonymous visitor is identified by a secure first-party cookie token (lb_vid)</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Visitor Identifier</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Sessions</th>
                    <th className="py-3 px-4">Pageviews</th>
                    <th className="py-3 px-4">Active Engagement</th>
                    <th className="py-3 px-4">First Source</th>
                    <th className="py-3 px-4">Conversions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {visitorsList.map((v, i) => (
                    <tr
                      key={i}
                      onClick={() => setSelectedVisitor(v)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {v.visitorId.substring(0, 18)}...
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.identityStatus === 'Identified via Lead'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : v.identityStatus === 'Returning Visitor'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {v.identityStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">{v.sessionCount}</td>
                      <td className="py-3 px-4">{v.pageViewCount}</td>
                      <td className="py-3 px-4">{v.activeSeconds}s</td>
                      <td className="py-3 px-4 capitalize">{v.firstSource}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">{v.conversionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 9: SESSIONS ── */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Session Activity Log</h3>
            <p className="text-xs text-slate-500">Click any session row to inspect the complete chronological journey timeline</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Session Started</th>
                    <th className="py-3 px-4">Landing Page</th>
                    <th className="py-3 px-4">Exit Page</th>
                    <th className="py-3 px-4">Source / Medium</th>
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">Session Span</th>
                    <th className="py-3 px-4">Active Engagement</th>
                    <th className="py-3 px-4">Converted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {sessionsList.map((s, i) => (
                    <tr
                      key={i}
                      onClick={() => handleOpenJourney(s.sessionId)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono">
                        {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 truncate max-w-[160px]">
                        {s.landingPath}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 truncate max-w-[160px]">
                        {s.exitPath || '—'}
                      </td>
                      <td className="py-3 px-4 capitalize">{s.source} / {s.medium}</td>
                      <td className="py-3 px-4">{s.device}</td>
                      <td className="py-3 px-4">{Math.round(s.sessionSpanSeconds / 60)}m</td>
                      <td className="py-3 px-4 font-bold text-indigo-600">{s.activeEngagementSeconds}s</td>
                      <td className="py-3 px-4">
                        {s.hasConversion ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Converted
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SESSION JOURNEY TIMELINE ── */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Session Journey Timeline</h3>
                <p className="text-xs font-mono text-slate-500">{selectedSessionId}</p>
              </div>
              <button
                onClick={() => setSelectedSessionId(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingJourney ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                Loading timeline events...
              </div>
            ) : journeyEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No distinct timeline events recorded for this session.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 border-l-2 border-indigo-100 ml-2">
                {journeyEvents.map((evt, idx) => (
                  <div key={idx} className="relative group">
                    <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-xs" />
                    <div className="text-xs font-mono text-slate-400">{evt.time}</div>
                    <div className="text-sm font-semibold text-slate-900 mt-0.5">{evt.label}</div>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">{evt.path}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DRAWER / MODAL: VISITOR DETAIL ── */}
      {selectedVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedVisitor.identityStatus}</h3>
                <p className="text-xs font-mono text-slate-500">{selectedVisitor.visitorId}</p>
              </div>
              <button
                onClick={() => setSelectedVisitor(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">First Seen</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {new Date(selectedVisitor.firstSeenAt).toLocaleDateString()}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">Last Seen</div>
                <div className="font-semibold text-slate-900 mt-1">
                  {new Date(selectedVisitor.lastSeenAt).toLocaleDateString()}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">Total Visits (Sessions)</div>
                <div className="font-bold text-slate-900 mt-1">{selectedVisitor.sessionCount}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">Total Pageviews</div>
                <div className="font-bold text-slate-900 mt-1">{selectedVisitor.pageViewCount}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">Total Active Engagement</div>
                <div className="font-bold text-indigo-600 mt-1">{selectedVisitor.activeSeconds}s</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500">First Acquisition Source</div>
                <div className="font-semibold text-slate-900 mt-1 capitalize">{selectedVisitor.firstSource}</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedVisitor(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AnalyticsPageShell>
  );
}
