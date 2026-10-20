'use client';

import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Printer,
  Phone,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { notify } from '@/lib/notify';
import { useActiveBrand } from '@/providers/active-brand-context';
import type { OverviewDataDto } from '@/modules/overview/overview-service';

export interface ExportReportDialogProps {
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
  tenantName: string;
  selectedDays?: number;
  overviewData?: OverviewDataDto | null;
}

export function ExportReportDialog({
  open,
  onClose,
  tenantSlug,
  tenantName,
  selectedDays = 30,
  overviewData,
}: ExportReportDialogProps) {
  const brandCtx = useActiveBrand();
  const activeBrand = brandCtx?.activeBrand;
  const activeBrandId = activeBrand?.id;

  const [loadingType, setLoadingType] = useState<string | null>(null);

  if (!open) return null;

  // 1. Export Performance Summary (GSC + GBP + Web for the active brand)
  const handleExportPerformanceSummary = () => {
    setLoadingType('summary');
    try {
      const gsc = overviewData?.gsc;
      const gbp = overviewData?.gbp;
      const web = overviewData?.web;

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `localbi-performance-${tenantSlug}-${activeBrand?.slug || 'all'}-${selectedDays}d-${dateStr}.csv`;

      const headers = ['Category', 'Metric', 'Value', 'Period'];
      const rows: string[][] = [
        ['Search Console', 'Total Clicks', String(gsc?.clicks ?? 0), `Last ${selectedDays} Days`],
        ['Search Console', 'Total Impressions', String(gsc?.impressions ?? 0), `Last ${selectedDays} Days`],
        ['Search Console', 'Average CTR', `${gsc?.ctr ?? 0}%`, `Last ${selectedDays} Days`],
        ['Search Console', 'Average Position', String(gsc?.position ?? 0), `Last ${selectedDays} Days`],
        ['Business Profile', 'Profile Views', String(gbp?.profileViews ?? 0), `Last ${selectedDays} Days`],
        ['Business Profile', 'Calls', String(gbp?.calls ?? 0), `Last ${selectedDays} Days`],
        ['Business Profile', 'Direction Requests', String(gbp?.directions ?? 0), `Last ${selectedDays} Days`],
        ['Business Profile', 'Total Reviews', String(gbp?.reviews ?? 0), 'All Time'],
        ['Web Analytics', 'Total Users', String(web?.users ?? 0), `Last ${selectedDays} Days`],
        ['Web Analytics', 'Conversions', String(web?.conversions ?? 0), `Last ${selectedDays} Days`],
      ];

      // Append top search queries if available
      if (gsc?.queries && gsc.queries.length > 0) {
        rows.push([]);
        rows.push(['# Top Search Queries', '', '', '']);
        rows.push(['Query', 'Clicks', 'Impressions', 'CTR', 'Position']);
        for (const q of gsc.queries) {
          rows.push([`"${q.query.replace(/"/g, '""')}"`, String(q.clicks), String(q.impressions), q.ctr, String(q.position)]);
        }
      }

      const meta = [
        `# Organization: ${tenantName}`,
        `# Brand: ${activeBrand?.name || 'All Brands'}`,
        `# Timeframe: Last ${selectedDays} Days`,
        `# Generated At: ${new Date().toISOString()}`,
        '',
      ].join('\n');

      const csvContent = `${meta}${headers.join(',')}\n${rows.map((r) => r.join(',')).join('\n')}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify.success('Performance summary exported successfully.');
      onClose();
    } catch (err) {
      console.error('[ExportReportDialog] Failed to export summary:', err);
      notify.error('Failed to export performance summary.');
    } finally {
      setLoadingType(null);
    }
  };

  // 2. Export Executive Stores / Multi-Module CSV via server API
  const handleExportExecutiveReport = async () => {
    setLoadingType('executive');
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/reports/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'csv',
          type: 'stores',
          brandId: activeBrandId,
          days: selectedDays,
        }),
      });

      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `executive-report-${tenantSlug}-${selectedDays}d-${dateStr}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify.success('Executive report exported successfully.');
      onClose();
    } catch (err: unknown) {
      console.error('[ExportReportDialog] Server export error, falling back to client summary:', err);
      // Fallback gracefully
      handleExportPerformanceSummary();
    } finally {
      setLoadingType(null);
    }
  };

  // 3. Export Printable HTML / PDF View
  const handleExportPrintableHtml = async () => {
    setLoadingType('printable');
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/reports/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'pdf',
          brandId: activeBrandId,
          days: selectedDays,
        }),
      });

      if (!res.ok) {
        throw new Error(`Printable export failed with status ${res.status}`);
      }

      const html = await res.text();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        notify.success('Printable report opened in new tab.');
        onClose();
      } else {
        notify.warning('Pop-up blocked. Please allow pop-ups to view the printable report.');
      }
    } catch (err: unknown) {
      console.error('[ExportReportDialog] Printable report error:', err);
      notify.error('Failed to generate printable report.');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export Performance Report"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Export Report</h2>
              <p className="text-[11px] text-slate-500">
                {activeBrand?.name || tenantName} • Last {selectedDays} Days
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-5 space-y-3">
          {/* Option 1: Performance Summary CSV */}
          <button
            type="button"
            disabled={loadingType !== null}
            onClick={handleExportPerformanceSummary}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">
                  Performance Summary (CSV)
                </div>
                <div className="text-[11px] text-slate-500">
                  Search Console, Google Business Profile &amp; top queries
                </div>
              </div>
            </div>
            {loadingType === 'summary' ? (
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            )}
          </button>

          {/* Option 2: Executive Stores CSV */}
          <button
            type="button"
            disabled={loadingType !== null}
            onClick={handleExportExecutiveReport}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">
                  Executive Multi-Channel Report (CSV)
                </div>
                <div className="text-[11px] text-slate-500">
                  Store rankings, website actions, and telephony metrics
                </div>
              </div>
            </div>
            {loadingType === 'executive' ? (
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            )}
          </button>

          {/* Option 3: Printable HTML / PDF View */}
          <button
            type="button"
            disabled={loadingType !== null}
            onClick={handleExportPrintableHtml}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">
                  Printable Executive Report (HTML / PDF)
                </div>
                <div className="text-[11px] text-slate-500">
                  White-labeled formatted document for print or PDF export
                </div>
              </div>
            </div>
            {loadingType === 'printable' ? (
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
