'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExecutiveReportDto } from '@/modules/reporting/reporting-types';
import { ExecutiveMetricCard } from './executive-metric-card';
import { StorePerformanceTable } from './store-performance-table';
import {
  Download,
  Printer,
  Camera,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { notify } from '@/lib/notify';

interface ExecutiveDashboardViewProps {
  initialReport: ExecutiveReportDto;
  tenantSlug: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  webSurfaces: Array<{ id: string; name: string; type: string }>;
  locations?: Array<{ id: string; name: string; city: string }>;
}

export function ExecutiveDashboardView({
  initialReport,
  tenantSlug,
  brands,
  webSurfaces,
  locations: _locations,
}: ExecutiveDashboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [_isPending, startTransition] = useTransition();

  const [report] = useState<ExecutiveReportDto>(initialReport);
  const [isExporting, setIsExporting] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  // Filter state
  const selectedBrandId = searchParams.get('brandId') || initialReport.brandId;
  const selectedPreset = searchParams.get('datePreset') || initialReport.dateRange.preset;
  const compareEnabled = searchParams.get('compare') !== 'false';
  const selectedSurfaceId = searchParams.get('webSurfaceId') || initialReport.website.webSurfaceId;

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null) params.delete(key);
      else params.set(key, val);
    });

    startTransition(() => {
      router.push(`/client/${tenantSlug}/reports/executive?${params.toString()}`);
    });
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await fetch(`/api/tenants/${tenantSlug}/reports/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          webSurfaceId: selectedSurfaceId,
          datePreset: selectedPreset,
          format: 'csv',
          type: 'stores',
        }),
      });

      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `executive-stores-${tenantSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      notify.success('Store performance CSV exported successfully');
    } catch (err) {
      notify.error('Failed to export CSV: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/reports/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          webSurfaceId: selectedSurfaceId,
          datePreset: selectedPreset,
          format: 'pdf',
        }),
      });

      if (!res.ok) throw new Error('Print generation failed');
      const html = await res.text();
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
      }
    } catch (err) {
      notify.error('Failed to generate print layout: ' + (err as Error).message);
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      setIsSnapshotting(true);
      const res = await fetch(`/api/tenants/${tenantSlug}/reports/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          webSurfaceId: selectedSurfaceId,
          datePreset: selectedPreset,
        }),
      });

      if (!res.ok) throw new Error('Failed to create snapshot');
      const data = await res.json();
      notify.success(`Snapshot created successfully (ID: ${data.data.id.slice(0, 8)})`);
    } catch (err) {
      notify.error('Snapshot failed: ' + (err as Error).message);
    } finally {
      setIsSnapshotting(false);
    }
  };

  const { website, localActions, telephony, gbp, rank, merchant: _merchant, content: _content, listings, opportunities, stores } = report;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header & Global Filter Bar ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Executive Performance</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Cross-Module
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Factual multi-location performance rollup across Search, Actions, Telephony, GBP, and Catalog
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Print / PDF
          </button>
          <button
            onClick={handleSaveSnapshot}
            disabled={isSnapshotting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
            {isSnapshotting ? 'Saving...' : 'Save Snapshot'}
          </button>
        </div>
      </div>

      {/* ── Global Control Filters ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Brand Selector */}
          {brands.length > 1 && (
            <select
              value={selectedBrandId}
              onChange={(e) => updateFilters({ brandId: e.target.value })}
              className="rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* WebSurface Selector (LocalBi vs Original) */}
          <select
            value={selectedSurfaceId}
            onChange={(e) => updateFilters({ webSurfaceId: e.target.value })}
            className="rounded-lg border border-slate-200 py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500"
          >
            {webSurfaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name} ({ws.type === 'LOCALBI' ? 'LocalBi Surface' : 'Original Domain'})
              </option>
            ))}
          </select>

          {/* Date Range Preset Pills */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {(['7d', '28d', '30d', '90d'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => updateFilters({ datePreset: preset })}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  selectedPreset === preset
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Compare Toggle */}
          <button
            onClick={() => updateFilters({ compare: compareEnabled ? 'false' : 'true' })}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
              compareEnabled
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Compare {compareEnabled ? 'Active' : 'Off'}
          </button>
        </div>

        {/* Date Interval Text */}
        <div className="text-xs text-slate-400 font-medium">
          Window: {report.dateRange.startDate} &rarr; {report.dateRange.endDate}
          {report.comparisonRange?.enabled && (
            <span className="ml-1 text-slate-500">({report.comparisonRange.label})</span>
          )}
        </div>
      </div>

      {/* ── Partial Module Warning Notice ── */}
      {report.partial && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Partial Report:</strong> Data for ({report.unavailableModules.join(', ')}) was temporarily
            unavailable during generation and rendered with fallback values.
          </span>
        </div>
      )}

      {/* ── Section 1: Executive KPI Summary Strip ── */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Executive Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ExecutiveMetricCard
            label="Active Users"
            metric={website.metrics.users}
            source="GA4"
            tooltip="Distinct individuals visiting LocalBi storefront microsites"
          />
          <ExecutiveMetricCard
            label="Search Clicks"
            metric={website.metrics.gscClicks}
            source="GSC"
            tooltip="Direct organic search clicks from Google Search Console"
          />
          <ExecutiveMetricCard
            label="Total Customer Actions"
            metric={localActions.metrics.totalActions}
            source="LOCALBI"
            tooltip="Combined verified customer actions (Calls, WhatsApp, Directions, Forms, Bookings)"
          />
          <ExecutiveMetricCard
            label="Inbound Calls"
            metric={telephony.metrics.inboundCalls}
            source="TELEPHONY"
            tooltip="Real inbound customer calls routed via dynamic virtual numbers"
          />
        </div>
      </div>

      {/* ── Section 2: Website Performance & Local Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LocalBi Website Traffic */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">LocalBi Website Traffic</h3>
                <p className="text-xs text-slate-500">GA4 engagement and organic Google Search visibility</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                LocalBi Isolated
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Sessions</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {website.metrics.sessions.currentValue.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-emerald-600">{website.metrics.sessions.displayFormatted}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Impressions</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {website.metrics.gscImpressions.currentValue.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-emerald-600">{website.metrics.gscImpressions.displayFormatted}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Avg Position</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  #{website.metrics.averagePosition.currentValue.toFixed(1)}
                </div>
                <div className="text-xs font-medium text-indigo-600">{website.metrics.averagePosition.displayFormatted}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Click-Through Rate: <strong>{website.metrics.ctr.currentValue.toFixed(1)}%</strong></span>
            <span>Total Page Views: <strong>{website.metrics.pageViews.currentValue.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Local Actions & Attribution */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Direct Actions & Leads</h3>
                <p className="text-xs text-slate-500">Customer intent clicks captured on storefront microsites</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                High Intent
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Call Clicks</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {localActions.metrics.calls.currentValue.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-emerald-600">{localActions.metrics.calls.displayFormatted}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">WhatsApp</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {localActions.metrics.whatsapp.currentValue.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-emerald-600">{localActions.metrics.whatsapp.displayFormatted}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Directions</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {localActions.metrics.directions.currentValue.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-emerald-600">{localActions.metrics.directions.displayFormatted}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Form Inquiries: <strong>{localActions.metrics.formLeads.currentValue}</strong></span>
            <span>Bookings / Appointments: <strong>{localActions.metrics.bookings.currentValue}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Reputation, Rank, Merchant & Listings ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Google Business Profile */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GBP Reputation</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">GBP</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {gbp.metrics.averageRating.currentValue > 0 ? `${gbp.metrics.averageRating.currentValue.toFixed(1)} ★` : 'N/A'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {gbp.metrics.totalReviews.currentValue.toLocaleString()} reviews across {gbp.metrics.mappedLocations} stores
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-xs">
            {gbp.metrics.unansweredReviews.currentValue > 0 ? (
              <span className="text-rose-600 font-semibold">{gbp.metrics.unansweredReviews.currentValue} unanswered reviews</span>
            ) : (
              <span className="text-emerald-600 font-semibold">All reviews answered</span>
            )}
          </div>
        </div>

        {/* Hyper Rank Intelligence */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Local Rank</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">Rank</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {rank.metrics.top3Coverage.currentValue}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Top-3 rank coverage ({rank.metrics.trackedKeywords} keywords)
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
            Top-10: <strong>{rank.metrics.top10Coverage.currentValue}%</strong> &bull; Avg Rank: <strong>#{rank.metrics.averageFoundRank.currentValue.toFixed(1)}</strong>
          </div>
        </div>

        {/* Directory Listings & NAP */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Directory Presence</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">NAP</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {listings.metrics.healthyCount.currentValue}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Verified healthy listings ({listings.metrics.providersChecked} directories)
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
            Needs Review: <strong>{listings.metrics.needsReviewCount.currentValue}</strong> &bull; Duplicates: <strong>{listings.metrics.duplicatesCount.currentValue}</strong>
          </div>
        </div>

        {/* SEO Opportunities */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SEO Opportunities</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Action</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              {opportunities.metrics.highPriorityCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              High-priority algorithmic recommendations open
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
            Open: <strong>{opportunities.metrics.openCount}</strong> &bull; Completed: <strong>{opportunities.metrics.completedCount}</strong>
          </div>
        </div>
      </div>

      {/* ── Section 4: Cross-Module Store Location Intelligence Table ── */}
      <StorePerformanceTable stores={stores} tenantSlug={tenantSlug} />

      {/* ── Section 5: Technical Health & Freshness Footer ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>
            LocalBi Unified Reporting Engine &bull; Strictly Multi-Tenant RLS &bull; Zero Mock Data
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-slate-400">
          <span>GA4: {report.dataFreshness['GA4'] ? new Date(report.dataFreshness['GA4']).toLocaleTimeString() : 'N/A'}</span>
          <span>GSC: {report.dataFreshness['GSC'] ? new Date(report.dataFreshness['GSC']).toLocaleTimeString() : 'N/A'}</span>
          <span>GBP: {report.dataFreshness['GBP'] ? new Date(report.dataFreshness['GBP']).toLocaleTimeString() : 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}
