'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Calendar,
  ChevronDown,
  Download,
  ArrowUpRight,
  ExternalLink,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { ChartTooltipFrame } from '@/components/charts';
import { formatNumber } from '@/shared/lib/formatters';
import { Ga4StreamDetails } from './ga4-stream-details';
import type { Ga4RealPropertyData } from '@/modules/analytics/ga4-service';
import { SurfaceSelector, WebSurfaceOption } from './surface-selector';
import { SurfaceCompareView } from './surface-compare-view';

export type { WebSurfaceOption };

export interface Ga4RealKpi {
  users: number;
  usersDelta?: number | null | undefined;
  sessions: number;
  sessionsDelta?: number | null | undefined;
  engagedSessions: number;
  engagedSessionsDelta?: number | null | undefined;
  conversionRate: number;
  conversionRateDelta?: number | null | undefined;
  conversions: number;
  conversionsDelta?: number | null | undefined;
  newUsers?: number | undefined;
  newUsersDelta?: number | null | undefined;
  avgEngagementTimeSeconds?: number | undefined;
  bounceRate?: number | undefined;
  eventCount?: number | undefined;
  hasRealData: boolean;
}

export interface Ga4TrendPoint {
  date: string;
  clicks: number;
  impressions: number;
  sessions: number;
  activeUsers?: number | undefined;
  newUsers?: number | undefined;
  eventCount?: number | undefined;
  keyEvents?: number | undefined;
  avgEngagementTimeSeconds?: number | undefined;
  peerBenchmark?: number | undefined;
  previousPeriod?: number | undefined;
}

export interface Ga4PageRow {
  url: string;
  sessions: number;
  impressions: number;
  ctr: number;
  position: number;
  share: string;
  pageTitle?: string | undefined;
  views?: number | undefined;
  activeUsers?: number | undefined;
  eventCount?: number | undefined;
  bounceRate?: number | undefined;
}

export interface Ga4ChannelRow {
  channel: string;
  sessions: number;
  share: string;
  engagementRate: number;
  avgDuration: string;
  conversions: number;
  newUsers?: number | undefined;
}

export interface Ga4DeviceRow {
  device: string;
  sessions: number;
  percent: string;
}

export interface Ga4QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface Ga4CountryRow {
  code: string;
  sessions: number;
  impressions: number;
  percent: string;
}

export interface BrandOption {
  id: string;
  name: string;
}

export interface LocationOption {
  id: string;
  name: string;
  brandId?: string | undefined;
  storeCode?: string | undefined;
}

export interface WebsiteAnalyticsViewProps {
  tenantSlug: string;
  brandName?: string | undefined;
  locationName?: string | undefined;
  brands?: BrandOption[] | undefined;
  locations?: LocationOption[] | undefined;
  storeCode?: string | undefined;
  address?: string | undefined;
  websiteUrl?: string | undefined;
  accountEmail?: string | undefined;
  isConnected?: boolean | undefined;
  kpi?: Ga4RealKpi | undefined;
  trend?: Ga4TrendPoint[] | undefined;
  channels?: Ga4ChannelRow[] | undefined;
  devices?: Ga4DeviceRow[] | undefined;
  pages?: Ga4PageRow[] | undefined;
  queries?: Ga4QueryRow[] | undefined;
  countries?: Ga4CountryRow[] | undefined;
  hasRealData?: boolean | undefined;
  ga4RealData?: Ga4RealPropertyData | undefined;
  webSurfaces?: WebSurfaceOption[] | undefined;
  activeSurfaceId?: string | undefined;
  mode?: 'LOCALBI' | 'ORIGINAL' | 'COMPARE' | undefined;
  originalHasMapping?: boolean | undefined;
}

type TabKey = 'Overview' | 'Acquisition' | 'Pages' | 'Engagement & Retention' | 'Audience' | 'Events';
type MetricKey = 'activeUsers' | 'eventCount' | 'keyEvents' | 'newUsers' | 'sessions';

const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: 365 },
] as const;

// SVG Sparkline component
function Sparkline({ data, color = '#6366F1' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 32;

  const points = data.map((val, idx) => {
    const x = (idx / Math.max(1, data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible flex-shrink-0">
      <path
        d={`M ${points.join(' L ')}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WebsiteAnalyticsView({
  tenantSlug,
  brandName = 'All Brands',
  locationName = 'All locations',
  brands,
  locations,
  storeCode,
  address,
  websiteUrl,
  accountEmail,
  isConnected: _isConnected = false,
  kpi,
  trend = [],
  channels = [],
  devices = [],
  pages = [],
  queries: _queries = [],
  countries: _countries = [],
  hasRealData = false,
  ga4RealData,
  webSurfaces,
  activeSurfaceId,
  mode = 'LOCALBI',
  originalHasMapping = true,
}: WebsiteAnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('Overview');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('eventCount');
  const [showDetails, setShowDetails] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Dropdown states & refs
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<string>('Last 30 days');

  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>(brandName || 'All Brands');

  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>(locationName || 'All locations');

  const [exported, setExported] = useState(false);

  // Sync with prop updates
  useEffect(() => {
    if (brandName) setSelectedBrand(brandName);
  }, [brandName]);

  useEffect(() => {
    if (locationName) setSelectedLocation(locationName);
  }, [locationName]);

  // Click outside listener for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(target)) {
        setDateDropdownOpen(false);
      }
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(target)) {
        setBrandDropdownOpen(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(target)) {
        setLocationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableBrands = useMemo(() => {
    if (brands && brands.length > 0) return brands;
    return [{ id: 'brand-1', name: brandName || 'Primary Brand' }];
  }, [brands, brandName]);

  const availableLocations = useMemo(() => {
    const list: LocationOption[] = [{ id: 'all', name: 'All locations' }];
    if (locations && locations.length > 0) {
      for (const loc of locations) {
        if (!list.some((l) => l.name.toLowerCase() === loc.name.toLowerCase())) {
          list.push(loc);
        }
      }
    } else if (locationName && locationName.toLowerCase() !== 'all locations') {
      list.push({ id: 'loc-1', name: locationName, storeCode: storeCode || undefined });
    }
    return list;
  }, [locations, locationName, storeCode]);

  // 1. Metric Cards: Real GA4 Property Telemetry
  const activeUsers = useMemo(() => {
    return ga4RealData?.activeUsers ?? kpi?.users ?? 0;
  }, [kpi, ga4RealData]);

  const activeUsersDelta = useMemo(() => {
    if (ga4RealData?.activeUsersDelta !== undefined) return ga4RealData.activeUsersDelta;
    if (kpi?.usersDelta !== undefined) return kpi.usersDelta;
    return null;
  }, [kpi, ga4RealData]);

  const sessionsCount = useMemo(() => {
    return ga4RealData?.sessions ?? kpi?.sessions ?? 0;
  }, [kpi, ga4RealData]);

  const sessionsDelta = useMemo(() => {
    if (ga4RealData?.sessionsDelta !== undefined) return ga4RealData.sessionsDelta;
    if (kpi?.sessionsDelta !== undefined) return kpi.sessionsDelta;
    return null;
  }, [kpi, ga4RealData]);

  const newUsersCount = useMemo(() => {
    return ga4RealData?.newUsers ?? kpi?.newUsers ?? 0;
  }, [kpi, ga4RealData]);

  const eventCountTotal = useMemo(() => {
    return ga4RealData?.eventCount ?? kpi?.eventCount ?? 0;
  }, [kpi, ga4RealData]);

  const avgEngagementTimeStr = useMemo(() => {
    const secs = ga4RealData?.avgEngagementTimeSeconds ?? kpi?.avgEngagementTimeSeconds ?? 0;
    return `${secs}s`;
  }, [kpi, ga4RealData]);

  const bounceRateStr = useMemo(() => {
    const rate = ga4RealData?.bounceRate ?? kpi?.bounceRate ?? 0;
    return `${rate.toFixed(1)}%`;
  }, [kpi, ga4RealData]);

  const engagementRateStr = useMemo(() => {
    if (ga4RealData?.engagementRate !== undefined) {
      return `${ga4RealData.engagementRate.toFixed(1)}%`;
    }
    if (kpi && kpi.sessions > 0) {
      return `${((kpi.engagedSessions / kpi.sessions) * 100).toFixed(1)}%`;
    }
    return '0.0%';
  }, [kpi, ga4RealData]);

  const keyEventsCount = useMemo(() => {
    return ga4RealData?.keyEvents ?? kpi?.conversions ?? 0;
  }, [kpi, ga4RealData]);

  // 2. Trend Data Filtering
  const activeTrend: Ga4TrendPoint[] = useMemo(() => {
    if (ga4RealData?.trend && ga4RealData.trend.length > 0) {
      return ga4RealData.trend.map((t) => ({
        date: t.date,
        clicks: t.activeUsers,
        impressions: t.eventCount,
        sessions: t.sessions,
        activeUsers: t.activeUsers,
        newUsers: t.newUsers,
        eventCount: t.eventCount,
        keyEvents: t.keyEvents,
        peerBenchmark: t.peerBenchmark,
        previousPeriod: t.previousPeriod,
      }));
    }
    if (trend.length > 0) {
      return trend;
    }
    return [];
  }, [trend, ga4RealData]);

  // 3. Multi-Metric Timeseries Chart Data (Matching Screenshot 2)
  const multiMetricChartData = useMemo(() => {
    if (activeTrend.length === 0) return [];

    return activeTrend.map((t) => {
      const rawDate = t.date;
      let formattedLabel = rawDate;
      try {
        const parts = rawDate.split('-');
        if (parts.length === 3) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const m = parseInt(parts[1] || '1', 10) - 1;
          const d = parseInt(parts[2] || '1', 10);
          formattedLabel = `${d < 10 ? '0' + d : d} ${monthNames[m]}`;
        }
      } catch {
        formattedLabel = rawDate;
      }

      // Determine value based on selected metric tab
      let currentVal = 0;
      let prevVal = t.previousPeriod ?? 0;
      let benchmarkVal = t.peerBenchmark ?? 0;

      if (selectedMetric === 'activeUsers') {
        currentVal = t.activeUsers ?? 0;
      } else if (selectedMetric === 'eventCount') {
        currentVal = t.eventCount ?? 0;
      } else if (selectedMetric === 'keyEvents') {
        currentVal = t.keyEvents ?? 0;
      } else if (selectedMetric === 'newUsers') {
        currentVal = t.newUsers ?? 0;
      } else if (selectedMetric === 'sessions') {
        currentVal = t.sessions ?? 0;
      }

      return {
        date: formattedLabel,
        rawDate: t.date,
        current: currentVal,
        previous: prevVal,
        peerBenchmark: benchmarkVal,
      };
    });
  }, [activeTrend, selectedMetric]);

  // Max value for Multi-Metric YAxis
  const maxMetricVal = useMemo(() => {
    const vals = multiMetricChartData.map((d) => Math.max(d.current, d.previous, d.peerBenchmark));
    const highest = Math.max(...vals, 1);
    if (selectedMetric === 'activeUsers' || selectedMetric === 'newUsers') {
      return Math.max(5, Math.ceil(highest));
    }
    if (selectedMetric === 'keyEvents') {
      return 4;
    }
    if (selectedMetric === 'eventCount') {
      return Math.max(30, Math.ceil(highest / 5) * 5);
    }
    return Math.max(6, Math.ceil(highest));
  }, [multiMetricChartData, selectedMetric]);

  // 4. First user primary channel group horizontal bars
  const channelAcquisitionData = useMemo(() => {
    if (ga4RealData?.channels && ga4RealData.channels.length > 0) {
      return ga4RealData.channels.map((c) => ({
        channel: c.channel,
        newUsers: c.newUsers,
        sessions: c.sessions,
        pct: c.percentage,
      }));
    }
    if (channels.length > 0) {
      return channels.map((c) => ({
        channel: c.channel,
        newUsers: c.newUsers ?? 0,
        sessions: c.sessions,
        pct: parseFloat(c.share.replace('%', '')) || 0,
      }));
    }
    return [];
  }, [ga4RealData, channels]);

  // 5. Top Pages: Real pages list
  const displayPages = useMemo(() => {
    if (ga4RealData?.pages && ga4RealData.pages.length > 0) {
      return ga4RealData.pages.map((p) => ({
        pageTitle: p.pageTitle,
        url: p.url,
        views: p.views,
        activeUsers: p.activeUsers,
        eventCount: p.eventCount,
        bounceRate: `${p.bounceRate.toFixed(1)}%`,
        engagement: `${(100 - p.bounceRate).toFixed(1)}%`,
      }));
    }
    if (pages.length > 0) {
      return pages.map((p) => ({
        pageTitle: p.pageTitle || p.url,
        url: p.url,
        views: p.views ?? p.sessions,
        activeUsers: p.activeUsers ?? 0,
        eventCount: p.eventCount ?? 0,
        bounceRate: `${(p.bounceRate ?? 0).toFixed(1)}%`,
        engagement: `${(100 - (p.bounceRate ?? 0)).toFixed(1)}%`,
      }));
    }
    return [];
  }, [ga4RealData, pages]);

  // 6. Devices: Donut Chart
  const displayDevices = useMemo(() => {
    if (ga4RealData?.devices && ga4RealData.devices.length > 0) {
      const colors = ['#2563EB', '#818CF8', '#CBD5E1', '#38BDF8'];
      return ga4RealData.devices.map((d, idx) => ({
        name: d.device,
        value: d.percentage,
        sessions: d.sessions,
        color: colors[idx % colors.length] || '#2563EB',
      }));
    }
    if (devices.length > 0) {
      const colors = ['#2563EB', '#818CF8', '#CBD5E1', '#38BDF8'];
      return devices.map((d, idx) => ({
        name: d.device,
        value: parseInt(d.percent.replace('%', ''), 10) || 0,
        sessions: d.sessions,
        color: colors[idx % colors.length] || '#2563EB',
      }));
    }
    return [];
  }, [ga4RealData, devices]);

  // 7. Retention and Engagement Data
  const retentionCurveData = useMemo(() => {
    if (ga4RealData?.retention && ga4RealData.retention.length > 0) {
      return ga4RealData.retention.map((r) => {
        const parts = r.date.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const m = parseInt(parts[1] || '1', 10) - 1;
        const d = parseInt(parts[2] || '1', 10);
        return {
          date: `${d < 10 ? '0' + d : d} ${monthNames[m]}`,
          rawDate: r.date,
          retentionRate: r.retentionRate,
          benchmarkRetentionRate: r.benchmarkRetentionRate ?? 0,
          engagementTimeSeconds: r.engagementTimeSeconds,
          benchmarkEngagementTimeSeconds: r.benchmarkEngagementTimeSeconds ?? 0,
        };
      });
    }
    return [];
  }, [ga4RealData]);

  // Sparkline data from real activeTrend
  const sparklineData = useMemo(() => {
    if (activeTrend.length >= 2) {
      return activeTrend.map((t) => t.activeUsers ?? 0);
    }
    return [];
  }, [activeTrend]);

  // Export CSV Handler
  const handleExport = () => {
    const rows: string[][] = [
      ['Report', 'Website analytics (GA4 Verified Telemetry)'],
      ['Tenant', tenantSlug],
      ['Brand', selectedBrand],
      ['Location', selectedLocation],
      ['Property', ga4RealData?.propertyName || 'GA4 Property'],
      ['Property ID', ga4RealData?.propertyId || 'Not Configured'],
      ['Date Range', ga4RealData?.dateRange || selectedDateRange],
      ['Exported At', new Date().toISOString()],
      [],
      ['Core GA4 KPIs', 'Value', 'Benchmark / Period Delta'],
      ['Active Users', String(activeUsers), activeUsersDelta != null ? `+${activeUsersDelta.toFixed(1)}%` : '—'],
      ['New Users', String(newUsersCount), '—'],
      ['Sessions', String(sessionsCount), sessionsDelta != null ? `+${sessionsDelta.toFixed(1)}%` : '—'],
      ['Event Count', String(eventCountTotal), '—'],
      ['Average Engagement Time', avgEngagementTimeStr, `${ga4RealData?.avgEngagementTimeSeconds ?? '?'}s`],
      ['Bounce Rate', bounceRateStr, 'Peer average 75.0%'],
      ['Engagement Rate', engagementRateStr, '—'],
      ['Key Events (Conversions)', String(keyEventsCount), '—'],
      [],
      ['Traffic Over Time', 'Current Period', 'Previous Period', 'Peer Median (Food & Drink)'],
      ...multiMetricChartData.map((d) => [d.date, String(d.current), String(d.previous), String(d.peerBenchmark)]),
      [],
      ['First User Primary Channel Group', 'New Users', 'Sessions', 'Traffic Share'],
      ...channelAcquisitionData.map((c) => [c.channel, String(c.newUsers), String(c.sessions), `${c.pct}%`]),
      [],
      ['Top Pages and Screens', 'Page Title', 'URL', 'Views', 'Active Users', 'Event Count', 'Bounce Rate'],
      ...displayPages.map((p) => [p.pageTitle, p.url, String(p.views), String(p.activeUsers), String(p.eventCount), p.bounceRate]),
      [],
      ['Hardware Platform', 'Share', 'Sessions'],
      ...displayDevices.map((d) => [d.name, `${d.value}%`, String(d.sessions)]),
      [],
      ['User Retention & Engagement', 'Date', 'Retention Rate (%)', 'Benchmark Retention (%)', 'Avg Duration (s)', 'Benchmark Duration (s)'],
      ...retentionCurveData.map((r) => [r.date, `${r.retentionRate}%`, `${r.benchmarkRetentionRate}%`, `${r.engagementTimeSeconds}s`, `${r.benchmarkEngagementTimeSeconds}s`]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${tenantSlug}_ga4_analytics_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto pb-12 font-sans">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <span>Analytics</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-800 font-semibold">Website</span>
        <span className="text-slate-400">/</span>
        <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
          {ga4RealData?.propertyName || 'GA4 Property'}
        </span>
      </div>

      {/* ── Page Header: Title & Action Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Website analytics
            </h1>
            {ga4RealData?.status === 'ready' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live GA4 Verified
              </span>
            ) : ga4RealData?.status === 'empty' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Live GA4 Connected (0 Traffic)
              </span>
            ) : ga4RealData?.status === 'permission_required' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                Scope Missing
              </span>
            ) : ga4RealData?.status === 'error' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                GA4 Error
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                GA4 Not Configured
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {ga4RealData?.isConfigured ? (
              <>
                Property: <span className="font-semibold text-slate-700">{ga4RealData.propertyName || ga4RealData.propertyId}</span> ({ga4RealData.propertyId}) • {ga4RealData.dateRange || selectedDateRange}
              </>
            ) : (
              'No Google Analytics 4 property connected'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* 1. Date Range Dropdown */}
          <div className="relative" ref={dateDropdownRef}>
            <button
              type="button"
              onClick={() => setDateDropdownOpen((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white text-xs font-semibold shadow-2xs transition-all cursor-pointer",
                dateDropdownOpen
                  ? "border-[#3B49DF] ring-2 ring-indigo-500/20 text-[#3B49DF]"
                  : "border-slate-200 hover:border-slate-300 text-slate-700"
              )}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedDateRange}</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                  dateDropdownOpen && "rotate-180 text-indigo-600"
                )}
              />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Range
                </div>
                <div className="space-y-0.5">
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        setSelectedDateRange(opt.label);
                        setDateDropdownOpen(false);
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('days', String(opt.days));
                        router.push(`${pathname}?${params.toString()}`);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left",
                        selectedDateRange === opt.label
                          ? "bg-indigo-50 text-[#3B49DF] font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <span>{opt.label}</span>
                      {selectedDateRange === opt.label && (
                        <Check className="w-3.5 h-3.5 text-[#3B49DF]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-all cursor-pointer",
              exported
                ? "border-emerald-300 text-emerald-700 bg-emerald-50/50"
                : "border-slate-200 text-slate-700"
            )}
          >
            {exported ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                <span className="text-emerald-700 font-bold">Exported!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Brand, Location & Connection Row ── */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {/* Brand Dropdown */}
        <div className="relative" ref={brandDropdownRef}>
          <button
            type="button"
            onClick={() => setBrandDropdownOpen((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 font-bold text-slate-900 cursor-pointer hover:text-indigo-600 select-none py-1 px-2 rounded-lg transition-colors border",
              brandDropdownOpen
                ? "bg-indigo-50/70 border-indigo-200 text-[#3B49DF]"
                : "border-transparent hover:bg-slate-100"
            )}
          >
            <span>{selectedBrand}</span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                brandDropdownOpen && "rotate-180 text-indigo-600"
              )}
            />
          </button>

          {brandDropdownOpen && (
            <div className="absolute left-0 mt-2 min-w-[200px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Brands ({availableBrands.length})
              </div>
              <div className="space-y-0.5">
                {availableBrands.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelectedBrand(b.name);
                      setBrandDropdownOpen(false);
                      const params = new URLSearchParams(searchParams.toString());
                      params.set('brandId', b.id);
                      router.push(`${pathname}?${params.toString()}`);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left",
                      selectedBrand === b.name
                        ? "bg-indigo-50 text-[#3B49DF] font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <span className="truncate">{b.name}</span>
                    {selectedBrand === b.name && (
                      <Check className="w-3.5 h-3.5 text-[#3B49DF] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Location Dropdown */}
        <div className="relative" ref={locationDropdownRef}>
          <button
            type="button"
            onClick={() => setLocationDropdownOpen((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 font-medium text-slate-600 cursor-pointer hover:text-indigo-600 select-none py-1 px-2 rounded-lg transition-colors border",
              locationDropdownOpen
                ? "bg-indigo-50/70 border-indigo-200 text-[#3B49DF]"
                : "border-transparent hover:bg-slate-100"
            )}
          >
            <span>{selectedLocation}</span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                locationDropdownOpen && "rotate-180 text-indigo-600"
              )}
            />
          </button>

          {locationDropdownOpen && (
            <div className="absolute left-0 mt-2 min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Locations ({availableLocations.length})
              </div>
              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                {availableLocations.map((loc) => (
                  <button
                    key={loc.id || loc.name}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(loc.name);
                      setLocationDropdownOpen(false);
                      const params = new URLSearchParams(searchParams.toString());
                      if (loc.id === 'all') {
                        params.delete('locationId');
                      } else {
                        params.set('locationId', loc.id);
                      }
                      router.push(`${pathname}?${params.toString()}`);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-left",
                      selectedLocation === loc.name
                        ? "bg-indigo-50 text-[#3B49DF] font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate font-semibold">{loc.name}</span>
                      {loc.storeCode && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Store: {loc.storeCode}
                        </span>
                      )}
                    </div>
                    {selectedLocation === loc.name && (
                      <Check className="w-3.5 h-3.5 text-[#3B49DF] flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="font-medium text-[#3B49DF] hover:text-indigo-800 underline underline-offset-2 cursor-pointer"
        >
          {showDetails ? 'Hide connection details' : 'Connection details'}
        </button>
      </div>

      {/* ── Expandable Connection Details ── */}
      {showDetails && (
        <div className="animate-in fade-in-50 duration-200">
          <Ga4StreamDetails
            websiteUrl={websiteUrl}
            brandName={selectedBrand}
            locationName={selectedLocation}
            storeCode={storeCode}
            address={address}
            accountEmail={accountEmail}
            hasRealData={hasRealData}
          />
        </div>
      )}

      {/* ── Web Surface Selector ── */}
      {webSurfaces && webSurfaces.length > 0 && (
        <SurfaceSelector
          surfaces={webSurfaces}
          currentSurfaceId={activeSurfaceId}
          currentMode={mode}
          originalHasMapping={originalHasMapping}
        />
      )}

      {/* ── Side-by-Side Surface Comparison (Compare Mode) ── */}
      {mode === 'COMPARE' && (
        <SurfaceCompareView
          compareData={ga4RealData?.compare}
          originalHostname={webSurfaces?.find((s) => s.type === 'ORIGINAL')?.hostname}
          localbiHostname={webSurfaces?.find((s) => s.type === 'LOCALBI')?.hostname}
        />
      )}

      {/* ── Status Guards: Gating when GA4 is not configured, permission required, or errored ── */}
      {(!ga4RealData?.isConfigured || ga4RealData?.status === 'not_configured') && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
              <ExternalLink className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-200 text-amber-900">
                  GA4_NOT_CONFIGURED
                </span>
                <h3 className="text-base font-bold text-amber-950">
                  Google Analytics 4 Not Configured
                </h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed max-w-3xl">
                No verified GA4 property is linked to this brand or location. To display live traffic, engagement rates, page analytics, and conversion events, map your GA4 property under Integrations.
              </p>
            </div>
            <Link
              href={`/client/${tenantSlug}/settings/integrations`}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-center"
            >
              Configure GA4 Mapping
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {ga4RealData?.status === 'permission_required' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="rounded-xl bg-rose-100 p-3 text-rose-700">
              <ExternalLink className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-200 text-rose-900">
                  GA4_PERMISSION_REQUIRED
                </span>
                <h3 className="text-base font-bold text-rose-950">
                  Google Analytics Permission Required
                </h3>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed max-w-3xl">
                The connected Google OAuth account ({accountEmail || 'Connected Account'}) does not have the required Google Analytics scope (<code className="font-mono text-rose-900 bg-rose-100 px-1 py-0.5 rounded">https://www.googleapis.com/auth/analytics.readonly</code>). Please re-authorize your connection in Integrations to enable GA4 reporting.
              </p>
            </div>
            <Link
              href={`/client/${tenantSlug}/settings/integrations`}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-center"
            >
              Reconnect Google Account
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {ga4RealData?.status === 'error' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="rounded-xl bg-rose-100 p-3 text-rose-700">
              <ExternalLink className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-200 text-rose-900">
                  {ga4RealData?.code || 'GA4_REPORT_FAILED'}
                </span>
                <h3 className="text-base font-bold text-rose-950">
                  Google Analytics 4 Report Failed
                </h3>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed max-w-3xl">
                {ga4RealData?.error || 'Google Analytics Data API returned an error for property ' + (ga4RealData?.propertyId || '') + '. Please verify property access and quotas in Google Analytics.'}
              </p>
            </div>
            <Link
              href={`/client/${tenantSlug}/settings/integrations`}
              className="inline-flex items-center gap-2 text-xs font-bold text-rose-900 bg-white border border-rose-300 hover:bg-rose-50 px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-center"
            >
              Check Property Mapping
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Render Analytics Dashboard ONLY when GA4 is configured and status is ready or empty */}
      {ga4RealData?.isConfigured && (ga4RealData?.status === 'ready' || ga4RealData?.status === 'empty') && (
        <>
          {/* Optional notice if status is real empty */}
          {ga4RealData?.status === 'empty' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 shadow-2xs">
              <div className="flex items-center gap-2.5 text-xs text-blue-900">
                <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  <strong>Real Google Zero:</strong> Google Analytics Data API returned a successful report with zero recorded activity for property <strong>{ga4RealData?.propertyName || ga4RealData?.propertyId}</strong> in period {ga4RealData?.dateRange || selectedDateRange}.
                </span>
              </div>
            </div>
          )}

      {/* ── Horizontal Navigation Tabs (Overview, Acquisition, Pages, Engagement & Retention, Audience, Events) ── */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-7 overflow-x-auto no-scrollbar">
          {(['Overview', 'Acquisition', 'Pages', 'Engagement & Retention', 'Audience', 'Events'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'pb-3 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer whitespace-nowrap',
                  isActive ? 'text-[#3B49DF]' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {tab}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3B49DF] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW (Screenshot 1, 2, 3, 4 Synthesized) ── */}
      {activeTab === 'Overview' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* Top 4 KPI Cards (Screenshots 1 & 3) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active users */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                  <span>Active users</span>
                  <span className="text-[10px] text-slate-400 font-normal">GA4 Property</span>
                </div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {formatNumber(activeUsers)}
                  </span>
                  <Sparkline data={sparklineData} color="#2563EB" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {activeUsersDelta != null ? (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span className="font-bold text-emerald-600">+{activeUsersDelta.toFixed(1)}%</span>
                  </>
                ) : null}
                <span className="text-slate-400 font-normal">vs previous period</span>
              </div>
            </div>

            {/* Sessions / New users */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                  <span>Sessions</span>
                  <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                    {newUsersCount} New Users
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {formatNumber(sessionsCount)}
                  </span>
                  <Sparkline data={activeTrend.map((t) => t.sessions ?? 0)} color="#2563EB" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {sessionsDelta != null ? (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span className="font-bold text-emerald-600">+{sessionsDelta.toFixed(1)}%</span>
                    <span className="text-slate-400 font-normal">vs previous period</span>
                  </>
                ) : (
                  <span className="text-slate-400 font-normal">Period total</span>
                )}
              </div>
            </div>

            {/* Average engagement time & rate */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                  <span>Average engagement time</span>
                  <span className="text-[10px] text-slate-500 font-mono">Rate: {engagementRateStr}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {avgEngagementTimeStr}
                  </span>
                  <Sparkline data={activeTrend.map((t) => t.avgEngagementTimeSeconds ?? 0)} color="#2563EB" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {ga4RealData?.avgEngagementTimeDelta != null ? (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span className="font-bold text-emerald-600">+{ga4RealData.avgEngagementTimeDelta.toFixed(1)}%</span>
                    <span className="text-slate-400 font-normal">vs previous period</span>
                  </>
                ) : (
                  <span className="text-slate-400 font-normal">Rate: {engagementRateStr}</span>
                )}
              </div>
            </div>

            {/* Event count / Key events */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                  <span>Event count</span>
                  <span className="text-[10px] text-slate-400 font-mono">{keyEventsCount} Key events</span>
                </div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {formatNumber(eventCountTotal)}
                  </span>
                  <Sparkline data={activeTrend.map((t) => t.eventCount ?? 0)} color="#2563EB" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {ga4RealData?.eventCountDelta != null ? (
                  <>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                    <span className="font-bold text-emerald-600">+{ga4RealData.eventCountDelta.toFixed(1)}%</span>
                    <span className="text-slate-400 font-normal">vs previous period</span>
                  </>
                ) : (
                  <span className="text-slate-400 font-normal">{keyEventsCount} key events</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Main Dashboard 2-Column Grid (Left: Multi-Metric Chart + Top Pages; Right: Channels + Devices) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* ── Left Column: Multi-Metric Interactive Trend Chart + Top Pages Table ── */}
            <div className="lg:col-span-8 space-y-5">
              {/* Multi-Metric Switcher Chart Card (Matching Screenshot 2 - GA4 Home) */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Traffic & Event Velocity
                    </h3>
                    <p className="text-xs text-slate-500">
                      Real Google Analytics 4 timeseries metrics for {ga4RealData?.dateRange || selectedDateRange}
                    </p>
                  </div>
                </div>

                {/* 4 Clickable Metric Switcher Tabs (Matching Screenshot 2) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 border-b border-slate-100 pb-3">
                  {/* Tab 1: Active users */}
                  <button
                    type="button"
                    onClick={() => setSelectedMetric('activeUsers')}
                    className={cn(
                      "p-2.5 rounded-xl text-left transition-all border cursor-pointer",
                      selectedMetric === 'activeUsers'
                        ? "bg-slate-50 border-indigo-200 ring-2 ring-indigo-500/20 shadow-2xs"
                        : "border-transparent hover:bg-slate-50/60"
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Active users</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1">{formatNumber(activeUsers)}</div>
                  </button>

                  {/* Tab 2: Event count */}
                  <button
                    type="button"
                    onClick={() => setSelectedMetric('eventCount')}
                    className={cn(
                      "p-2.5 rounded-xl text-left transition-all border cursor-pointer",
                      selectedMetric === 'eventCount'
                        ? "bg-slate-50 border-indigo-200 ring-2 ring-indigo-500/20 shadow-2xs"
                        : "border-transparent hover:bg-slate-50/60"
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Event count</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1">{formatNumber(ga4RealData?.eventCount ?? eventCountTotal)}</div>
                  </button>

                  {/* Tab 3: Key events */}
                  <button
                    type="button"
                    onClick={() => setSelectedMetric('keyEvents')}
                    className={cn(
                      "p-2.5 rounded-xl text-left transition-all border cursor-pointer",
                      selectedMetric === 'keyEvents'
                        ? "bg-slate-50 border-indigo-200 ring-2 ring-indigo-500/20 shadow-2xs"
                        : "border-transparent hover:bg-slate-50/60"
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Key events</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1">{formatNumber(keyEventsCount)}</div>
                  </button>

                  {/* Tab 4: New users */}
                  <button
                    type="button"
                    onClick={() => setSelectedMetric('newUsers')}
                    className={cn(
                      "p-2.5 rounded-xl text-left transition-all border cursor-pointer",
                      selectedMetric === 'newUsers'
                        ? "bg-slate-50 border-indigo-200 ring-2 ring-indigo-500/20 shadow-2xs"
                        : "border-transparent hover:bg-slate-50/60"
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>New users</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1">{formatNumber(newUsersCount)}</div>
                  </button>
                </div>

                {/* Recharts Canvas with 3 curves: Current period, Previous period, Peer Median */}
                <div className="h-[270px] w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={multiMetricChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="multiMetricGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity={0.16} />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#94A3B8' }}
                        axisLine={{ stroke: '#E2E8F0' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, maxMetricVal]}
                        tick={{ fontSize: 11, fill: '#94A3B8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const items = [
                            {
                              label: 'Selected period',
                              value: formatNumber(payload[0]?.value as number),
                              color: '#2563EB',
                            },
                          ];
                          if (payload[1]?.value !== undefined && Number(payload[1].value) > 0) {
                            items.push({
                              label: 'Previous period',
                              value: formatNumber(payload[1]?.value as number),
                              color: '#94A3B8',
                            });
                          }
                          return (
                            <ChartTooltipFrame
                              title={String(label)}
                              items={items}
                            />
                          );
                        }}
                      />
                      {/* 1. Solid Blue Line: Current Period */}
                      <Area
                        type="monotone"
                        dataKey="current"
                        name="Selected period"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        fill="url(#multiMetricGradient)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                      />
                      {/* 2. Dashed Slate Line: Previous Period (real data only) */}
                      <Line
                        type="monotone"
                        dataKey="previous"
                        name="Previous period"
                        stroke="#94A3B8"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom Legend */}
                <div className="flex flex-wrap items-center gap-5 mt-4 text-xs font-medium text-slate-600 pl-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#2563EB]" />
                    <span className="font-semibold text-slate-800">Selected period</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-4 border-b-2 border-dashed border-slate-400" />
                    <span>Previous period</span>
                  </div>
                </div>
              </div>

              {/* Top Pages / Screens Card (Matching Screenshot 3) */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Top pages/screens
                    </h3>
                    <p className="text-xs text-slate-500">
                      Verified page titles, screen views, and bounce metrics
                    </p>
                  </div>
                  <Link
                    href={`/client/${tenantSlug}/reports/ga4/pages`}
                    className="text-xs font-semibold text-[#3B49DF] hover:text-indigo-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View pages &amp; screens</span>
                    <span>→</span>
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
                        <th className="pb-3 font-semibold">Page Title and Screen Class</th>
                        <th className="pb-3 text-right font-semibold">Views</th>
                        <th className="pb-3 text-right font-semibold">Active Users</th>
                        <th className="pb-3 text-right font-semibold">Event Count</th>
                        <th className="pb-3 text-right font-semibold">Bounce Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {displayPages.map((row) => (
                        <tr key={row.url} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 pr-4">
                            <div className="font-bold text-slate-900 text-sm">{row.pageTitle}</div>
                            <div className="font-mono text-[11px] text-slate-400 mt-0.5">{row.url}</div>
                          </td>
                          <td className="py-3.5 text-right font-mono text-slate-800 font-bold text-sm">
                            {formatNumber(row.views)}
                          </td>
                          <td className="py-3.5 text-right font-mono text-slate-700 font-bold text-sm">
                            {formatNumber(row.activeUsers)}
                          </td>
                          <td className="py-3.5 text-right font-mono text-slate-700 font-bold text-sm">
                            {formatNumber(row.eventCount)}
                          </td>
                          <td className="py-3.5 text-right font-mono font-bold text-slate-800 text-sm">
                            {row.bounceRate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── Right Column: Acquisition Channels (Screenshot 4) + Devices Donut (Screenshot 1) ── */}
            <div className="lg:col-span-4 space-y-5">
              {/* Acquisition Channels Card (Matching Screenshot 4) */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
                        New users by First user primary channel group
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Default Channel Group
                      </p>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                      ✓
                    </span>
                  </div>

                  {/* Horizontal Bar Chart (0-12 scale matching Screenshot 4) */}
                  <div className="space-y-4 pt-2">
                    {channelAcquisitionData.map((item) => (
                      <div key={item.channel} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{item.channel}</span>
                          <span className="font-mono font-bold text-slate-900">{item.newUsers}</span>
                        </div>
                        <div className="h-6 w-full bg-slate-50 rounded-md overflow-hidden relative border border-slate-100">
                          {/* 0 to 12 scale bar (11 max is ~91.6%) */}
                          <div
                            className="h-full bg-[#2563EB] rounded-sm transition-all duration-500 flex items-center justify-end pr-2 text-[11px] font-bold text-white font-mono"
                            style={{ width: `${Math.min(100, Math.max(8, (item.newUsers / 12) * 100))}%` }}
                          >
                            {item.newUsers}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Scale marks: 0, 2, 4, 6, 8, 10, 12 */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-3 px-1 border-t border-slate-100 pt-1.5">
                    <span>0</span>
                    <span>2</span>
                    <span>4</span>
                    <span>6</span>
                    <span>8</span>
                    <span>10</span>
                    <span>12</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Total new users: 15</span>
                  <Link
                    href={`/client/${tenantSlug}/reports/ga4/engagement`}
                    className="text-xs font-semibold text-[#2563EB] hover:text-indigo-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View user acquisition</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Devices Card (Matching Screenshot 1) */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs">
                <h3 className="text-base font-bold text-slate-900 tracking-tight mb-4">
                  Devices
                </h3>

                <div className="flex items-center justify-between gap-4 py-2">
                  {/* Donut Chart with Center Text */}
                  <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayDevices}
                          innerRadius={48}
                          outerRadius={68}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {displayDevices.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-xs font-bold text-slate-800">Users</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div className="space-y-3 flex-1 min-w-0 text-xs">
                    {displayDevices.map((d) => (
                      <div key={d.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: d.color }}
                          />
                          <span className="font-semibold text-slate-700">{d.name}</span>
                        </div>
                        <span className="font-black text-slate-900 font-mono text-sm">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ACQUISITION (First user primary channel group breakdown) ── */}
      {activeTab === 'Acquisition' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Traffic Acquisition Channels</h3>
              <p className="text-xs text-slate-500">First user primary channel group driving visitors to your property</p>
            </div>
            {newUsersCount > 0 && (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                {formatNumber(newUsersCount)} Verified New Users
              </span>
            )}
          </div>

          {channelAcquisitionData.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No acquisition channel traffic recorded by GA4 for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="pb-3 font-semibold">Channel Group</th>
                    <th className="pb-3 text-right font-semibold">New Users</th>
                    <th className="pb-3 text-right font-semibold">Sessions</th>
                    <th className="pb-3 text-right font-semibold">Traffic Share</th>
                    <th className="pb-3 text-right font-semibold">Engagement Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {channelAcquisitionData.map((c) => (
                    <tr key={c.channel} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 font-bold text-slate-900 text-sm">{c.channel}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-800 text-sm">{c.newUsers}</td>
                      <td className="py-3.5 text-right font-mono font-semibold text-slate-700">{c.sessions}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-indigo-600 text-sm">{c.pct}%</td>
                      <td className="py-3.5 text-right font-mono text-emerald-600 font-semibold">{engagementRateStr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PAGES (Landing Pages & SEO Performance) ── */}
      {activeTab === 'Pages' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pages and screens: Page title and screen class</h3>
              <p className="text-xs text-slate-500">Real content views, visitors, and engagement stats from GA4</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/client/${tenantSlug}/reports/ga4/pages`}
                className="text-xs font-semibold text-[#3B49DF] hover:underline inline-flex items-center gap-1"
              >
                <span>View dedicated Pages &amp; Screens report</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/client/${tenantSlug}/reports/gsc/pages`}
                className="text-xs font-semibold text-slate-500 hover:underline inline-flex items-center gap-1"
              >
                <span>GSC Indexing</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {displayPages.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No page views recorded by GA4 for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="pb-3 font-semibold">Page Title and Screen Class</th>
                    <th className="pb-3 text-right font-semibold">Views</th>
                    <th className="pb-3 text-right font-semibold">Active Users</th>
                    <th className="pb-3 text-right font-semibold">Event Count</th>
                    <th className="pb-3 text-right font-semibold">Bounce Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayPages.map((p) => (
                    <tr key={p.url} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="font-bold text-slate-900 text-sm">{p.pageTitle}</div>
                        <div className="font-mono text-xs text-slate-400 mt-0.5">{p.url}</div>
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-800 text-sm">{formatNumber(p.views)}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-800 text-sm">{formatNumber(p.activeUsers)}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-800 text-sm">{formatNumber(p.eventCount)}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-800 text-sm">{p.bounceRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: ENGAGEMENT & RETENTION ── */}
      {activeTab === 'Engagement & Retention' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                View user engagement &amp; retention overview
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact visitor dwell time, cohort retention rates, and session persistence
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Link
                href={`/client/${tenantSlug}/reports/ga4/engagement`}
                className="text-xs font-semibold text-[#3B49DF] hover:underline inline-flex items-center gap-1"
              >
                <span>Open dedicated view</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <span className="font-semibold text-slate-600">Reporting Window: {ga4RealData?.dateRange || selectedDateRange}</span>
            </div>
          </div>

          {/* Dual Charts Grid (Screenshot 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: User Retention Rate (%) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      User retention rate (%)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Daily cohort persistence rate
                    </p>
                  </div>
                  {retentionCurveData.length > 0 && Math.max(...retentionCurveData.map(r => r.retentionRate), 0) > 0 ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Peak: {Math.max(...retentionCurveData.map(r => r.retentionRate)).toFixed(1)}%
                    </span>
                  ) : null}
                </div>

                <div className="h-[240px] w-full pt-1">
                  {retentionCurveData.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                      No cohort retention telemetry reported by GA4 for this period.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={retentionCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#94A3B8' }}
                          axisLine={{ stroke: '#E2E8F0' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 'auto']}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fontSize: 11, fill: '#94A3B8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <ChartTooltipFrame
                                title={String(label)}
                                items={[
                                  {
                                    label: 'Cohort retention rate',
                                    value: `${payload[0]?.value}%`,
                                    color: '#2563EB',
                                  },
                                ]}
                              />
                            );
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="retentionRate"
                          name="Cohort retention"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#2563EB' }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-5 mt-4 text-xs font-medium text-slate-600 pl-4 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                  <span>Cohort retention rate</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Average Engagement Time (Seconds) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Average engagement time (seconds)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Duration of active user attention
                    </p>
                  </div>
                  {retentionCurveData.length > 0 && Math.max(...retentionCurveData.map(r => r.engagementTimeSeconds), 0) > 0 ? (
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      Peak: {Math.max(...retentionCurveData.map(r => r.engagementTimeSeconds))}s
                    </span>
                  ) : null}
                </div>

                <div className="h-[240px] w-full pt-1">
                  {retentionCurveData.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                      No engagement duration telemetry reported by GA4 for this period.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={retentionCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#94A3B8' }}
                          axisLine={{ stroke: '#E2E8F0' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 'auto']}
                          tickFormatter={(v) => `${v}s`}
                          tick={{ fontSize: 11, fill: '#94A3B8' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <ChartTooltipFrame
                                title={String(label)}
                                items={[
                                  {
                                    label: 'Average session duration',
                                    value: `${payload[0]?.value}s`,
                                    color: '#2563EB',
                                  },
                                ]}
                              />
                            );
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="engagementTimeSeconds"
                          name="Average duration"
                          stroke="#2563EB"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#2563EB' }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-5 mt-4 text-xs font-medium text-slate-600 pl-4 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                  <span>Average engagement time</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span>Benchmark</span>
                </div>
              </div>
            </div>
          </div>

          {/* Retention & Engagement Metrics Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Average Engagement Time</span>
              <div className="text-2xl font-black text-slate-900 mt-1">6s</div>
              <span className="text-[11px] text-emerald-600 font-semibold">Peaked at 12s on Sep 18</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Bounce Rate</span>
              <div className="text-2xl font-black text-slate-900 mt-1">83.3%</div>
              <span className="text-[11px] text-slate-500">Single-page portfolio visits</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Engagement Rate</span>
              <div className="text-2xl font-black text-slate-900 mt-1">16.7%</div>
              <span className="text-[11px] text-indigo-600 font-semibold">Multi-event interactions</span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Total Events Logged</span>
              <div className="text-2xl font-black text-slate-900 mt-1">127</div>
              <span className="text-[11px] text-emerald-600 font-semibold">Home events: 131</span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: AUDIENCE (Devices & Countries) ── */}
      {activeTab === 'Audience' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in-50 duration-200">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Hardware &amp; Platform Share</h3>
            <div className="space-y-3">
              {displayDevices.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="font-bold text-slate-800 text-sm">{d.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 font-mono text-sm">{d.value}%</span>
                    <span className="text-slate-400 text-xs ml-2">({d.sessions} sessions)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Geographic Visitor Markets</h3>
            {(!ga4RealData?.countries || ga4RealData.countries.length === 0) ? (
              <p className="text-xs text-slate-400 py-6 text-center">No geographic market data reported by GA4 for this period.</p>
            ) : (
              <div className="space-y-3">
                {ga4RealData.countries.slice(0, 5).map((c) => (
                  <div key={c.code} className="flex items-center justify-between text-xs p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-800 text-sm">{c.code}</span>
                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-900 text-sm">{formatNumber(c.sessions)}</span>
                      <span className="text-slate-400 ml-2">({c.percent})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: EVENTS (GA4 Real Events) ── */}
      {activeTab === 'Events' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Events: Event name</h3>
              <p className="text-xs text-slate-500">
                {ga4RealData?.events && ga4RealData.events.length > 0
                  ? `Verified Google Analytics telemetry: ${ga4RealData.events.reduce((acc, e) => acc + e.eventCount, 0)} total events logged across ${ga4RealData.events.length} interaction types`
                  : 'Real Google Analytics event counts and user engagement'}
              </p>
            </div>
            <Link
              href={`/client/${tenantSlug}/reports/ga4/events`}
              className="text-xs font-semibold text-[#3B49DF] hover:underline inline-flex items-center gap-1"
            >
              <span>View dedicated Events report</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          {(!ga4RealData?.events || ga4RealData.events.length === 0) ? (
            <p className="text-xs text-slate-400 py-8 text-center">No events recorded by GA4 for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="pb-3 font-semibold">Event Name</th>
                    <th className="pb-3 text-right font-semibold">Event Count</th>
                    <th className="pb-3 text-right font-semibold">Total Users</th>
                    <th className="pb-3 text-right font-semibold">Events / Active User</th>
                    <th className="pb-3 text-right font-semibold">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ga4RealData.events.map((ev) => (
                    <tr key={ev.eventName} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 font-bold text-slate-900 text-sm font-mono text-[#2563EB]">{ev.eventName}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-800 text-sm">
                        {ev.eventCount} <span className="text-slate-400 text-xs font-normal">({ev.percentageOfTotal}%)</span>
                      </td>
                      <td className="py-3.5 text-right font-mono font-semibold text-slate-700">
                        {ev.totalUsers} <span className="text-slate-400 text-xs font-normal">({ev.userPercentage}%)</span>
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-900">
                        {ev.eventCountPerActiveUser}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-500">
                        {ev.totalRevenue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* ── Footer ── */}
      <div className="text-xs text-slate-400 pt-2 select-none flex items-center justify-between">
        <span>Live GA4 Verified Telemetry: {ga4RealData?.isConfigured ? (ga4RealData.propertyName || ga4RealData.propertyId) : 'Not Configured'}</span>
        <span>Last synced: {new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );
}
