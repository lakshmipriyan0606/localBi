'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneMissed,
  Clock,
  Users,
  Download,
  Plus,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Filter,
} from 'lucide-react';
import {
  CallDto,
  CallStatus,
  CallSummaryDto,
  StoreCallSummaryDto,
  VirtualNumberDto,
} from '@/modules/telephony/telephony-types';
import { CallFunnelMetricsDto } from '@/modules/telephony/call-dashboard-service';
import { ScopedBrandDto, ScopedLocationDto } from '@/modules/reports/report-context-service';

interface Props {
  tenantSlug: string;
  brands: ScopedBrandDto[];
  stores: ScopedLocationDto[];
  initialBrandId?: string;
}

export function CallTrackingExplorer({
  tenantSlug,
  brands,
  stores,
  initialBrandId,
}: Props) {
  const [selectedBrandId, setSelectedBrandId] = useState<string>(
    initialBrandId || brands[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'numbers' | 'funnel'>('overview');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [summary, setSummary] = useState<CallSummaryDto | null>(null);
  const [funnel, setFunnel] = useState<CallFunnelMetricsDto | null>(null);
  const [storeSummaries, setStoreSummaries] = useState<StoreCallSummaryDto[]>([]);
  const [calls, setCalls] = useState<CallDto[]>([]);
  const [callsPagination, setCallsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [virtualNumbers, setVirtualNumbers] = useState<VirtualNumberDto[]>([]);

  // Provisioning Modal State
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionStoreId, setProvisionStoreId] = useState('');
  const [provisionPhone, setProvisionPhone] = useState('+914441002000');
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Forwarding Modal State
  const [isForwardingOpen, setIsForwardingOpen] = useState(false);
  const [forwardingNumberId, setForwardingNumberId] = useState('');
  const [forwardingStoreId, setForwardingStoreId] = useState('');
  const [newDestinationPhone, setNewDestinationPhone] = useState('');
  const [isUpdatingForwarding, setIsUpdatingForwarding] = useState(false);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const brandParam = selectedBrandId ? `?brandId=${encodeURIComponent(selectedBrandId)}` : '';
      const [dashRes, callsRes, numsRes] = await Promise.all([
        fetch(`/api/tenants/${tenantSlug}/telephony/dashboard${brandParam}`),
        fetch(`/api/tenants/${tenantSlug}/telephony/calls${brandParam}&page=${callsPagination.page}`),
        fetch(`/api/tenants/${tenantSlug}/telephony/numbers${brandParam}`),
      ]);

      if (!dashRes.ok || !callsRes.ok || !numsRes.ok) {
        throw new Error('Failed to fetch call tracking data');
      }

      const dashData = await dashRes.json();
      const callsData = await callsRes.json();
      const numsData = await numsRes.json();

      setSummary(dashData.summary || null);
      setFunnel(dashData.funnel || null);
      setStoreSummaries(dashData.storeSummaries || []);
      setCalls(callsData.items || []);
      setCallsPagination(callsData.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      setVirtualNumbers(numsData.items || []);
    } catch (err: any) {
      setError(err.message || 'Error loading telephony data');
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug, selectedBrandId, callsPagination.page]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Export CSV
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const brandParam = selectedBrandId ? `?brandId=${encodeURIComponent(selectedBrandId)}` : '';
      const res = await fetch(`/api/tenants/${tenantSlug}/telephony/export${brandParam}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-tracking-${tenantSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Provision Virtual Number
  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionPhone) return;

    try {
      setIsProvisioning(true);
      const res = await fetch(`/api/tenants/${tenantSlug}/telephony/numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId || brands[0]?.id,
          storeId: provisionStoreId || null,
          phoneNumber: provisionPhone,
          providerName: 'TEST_ADAPTER',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Provisioning failed');
      }

      setIsProvisionOpen(false);
      setProvisionPhone('');
      await loadDashboardData();
    } catch (err: any) {
      alert(`Provisioning failed: ${err.message}`);
    } finally {
      setIsProvisioning(false);
    }
  };

  // Handle Update Forwarding Phone
  const handleUpdateForwarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwardingStoreId || !newDestinationPhone) return;

    try {
      setIsUpdatingForwarding(true);
      const res = await fetch(
        `/api/tenants/${tenantSlug}/telephony/numbers/${forwardingNumberId}/forwarding`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId: selectedBrandId || brands[0]?.id,
            storeId: forwardingStoreId,
            destinationPhone: newDestinationPhone,
          }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Forwarding update failed');
      }

      setIsForwardingOpen(false);
      setNewDestinationPhone('');
      await loadDashboardData();
    } catch (err: any) {
      alert(`Forwarding update failed: ${err.message}`);
    } finally {
      setIsUpdatingForwarding(false);
    }
  };

  // Handle Release Virtual Number
  const handleReleaseNumber = async (numberId: string, phone: string) => {
    if (!confirm(`Are you sure you want to release virtual number ${phone}? Historical call logs will be preserved.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/telephony/numbers/${numberId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Release failed');
      }
      await loadDashboardData();
    } catch (err: any) {
      alert(`Release error: ${err.message}`);
    }
  };

  // Helper format seconds
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  // Status badge styling
  const renderStatusBadge = (status: CallStatus) => {
    switch (status) {
      case 'ANSWERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Answered
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <PhoneIncoming className="w-3.5 h-3.5 text-blue-600" /> Completed
          </span>
        );
      case 'MISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <PhoneMissed className="w-3.5 h-3.5 text-rose-600" /> Missed
          </span>
        );
      case 'BUSY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Busy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Call Tracking & Telephony Attribution
              </h1>
              <p className="text-sm text-slate-500">
                Real inbound calls, store forwarding numbers, and click-to-call conversion
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Brand Filter */}
          {brands.length > 1 && (
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" />
              <select
                aria-label="Filter by Brand"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <button
            onClick={() => setIsProvisionOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Assign Virtual Number
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 rounded-t-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <PhoneIncoming className="w-4 h-4" /> Overview & KPIs
        </button>
        <button
          onClick={() => setActiveTab('calls')}
          className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'calls'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <PhoneCall className="w-4 h-4" /> Live Call Logs ({callsPagination.total})
        </button>
        <button
          onClick={() => setActiveTab('numbers')}
          className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'numbers'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <PhoneForwarded className="w-4 h-4" /> Store Numbers ({virtualNumbers.length})
        </button>
        <button
          onClick={() => setActiveTab('funnel')}
          className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'funnel'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Filter className="w-4 h-4" /> Click vs Call Funnel
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-sm mb-2">
                <span>Total Inbound Calls</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {summary ? summary.totalCalls.toLocaleString() : '0'}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Answered: <span className="font-semibold text-emerald-600">{summary?.answeredCalls || 0}</span> · Missed: <span className="font-semibold text-rose-600">{summary?.missedCalls || 0}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-sm mb-2">
                <span>Answer Rate</span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {summary ? `${summary.answerRatePercentage}%` : '0%'}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Of total calls connected & answered
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-sm mb-2">
                <span>Avg Talk Duration</span>
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {summary ? formatDuration(summary.avgTalkDurationSeconds) : '0s'}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Overall avg: {summary ? formatDuration(summary.avgDurationSeconds) : '0s'}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-sm mb-2">
                <span>Unique Callers</span>
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {summary ? summary.uniqueCallersCount.toLocaleString() : '0'}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Distinct callers with masked PII
              </div>
            </div>
          </div>

          {/* Click-to-Call Conversion Funnel Card */}
          {funnel && (
            <div className="bg-linear-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Filter className="w-5 h-5 text-emerald-400" />
                    Click-to-Call Reality Funnel
                  </h2>
                  <p className="text-xs text-slate-300">
                    Distinguishes browser button intent (CALL_CLICK) from verified telephony provider calls
                  </p>
                </div>
                <span className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full font-semibold">
                  Connection Rate: {funnel.clickToCallConnectionRate}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400 font-medium">1. Browser Intent Clicks</span>
                  <div className="text-2xl font-bold mt-1 text-slate-100">
                    {funnel.browserCallClicks.toLocaleString()}
                  </div>
                  <div className="text-2xs text-slate-400 mt-1">Users clicked &quot;Call Store&quot; CTA</div>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400 font-medium">2. Real Inbound Calls</span>
                  <div className="text-2xl font-bold mt-1 text-slate-100">
                    {funnel.realInboundCalls.toLocaleString()}
                  </div>
                  <div className="text-2xs text-slate-400 mt-1">
                    {funnel.clickToCallDropOffCount} callers cancelled before dialing
                  </div>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400 font-medium">3. Answered & Connected</span>
                  <div className="text-2xl font-bold mt-1 text-emerald-400">
                    {funnel.answeredInboundCalls.toLocaleString()}
                  </div>
                  <div className="text-2xs text-slate-400 mt-1">Converted to live conversation</div>
                </div>
              </div>
            </div>
          )}

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Call Generating Pages */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span>Top Call-Generating Pages</span>
                <span className="text-xs font-normal text-slate-500">By Inbound Calls</span>
              </h2>

              {summary?.topCallGeneratingPages && summary.topCallGeneratingPages.length > 0 ? (
                <div className="space-y-3">
                  {summary.topCallGeneratingPages.map((p, idx) => (
                    <div
                      key={p.pageId || idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-2xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-mono text-slate-800 truncate">
                          {p.path || p.pageId}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 ml-4 shrink-0">
                        {p.calls} calls
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-400">
                  No page attribution data recorded yet
                </div>
              )}
            </div>

            {/* Call Traffic Sources */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span>Call Acquisition Sources</span>
                <span className="text-xs font-normal text-slate-500">Attribution Channel</span>
              </h2>

              {summary?.topCallSources && Object.keys(summary.topCallSources).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(summary.topCallSources).map(([source, count]) => (
                    <div
                      key={source}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {source.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{count} calls</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-400">
                  No source attribution recorded yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE CALL LOGS */}
      {activeTab === 'calls' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">Inbound Telephony Records</h2>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Caller numbers masked for PII privacy protection
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Caller Number</th>
                  <th className="py-3 px-4">Store Location</th>
                  <th className="py-3 px-4">Tracking Number</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Talk Time</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calls.length > 0 ? (
                  calls.map((call) => (
                    <tr key={call.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">{renderStatusBadge(call.status)}</td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {call.callerNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {call.storeName || 'Unassigned Store'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                        {call.trackingNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{call.durationSeconds}s</td>
                      <td className="py-3 px-4 text-slate-900 font-semibold">
                        {call.talkDurationSeconds}s
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-500 capitalize">
                        {call.source?.replace(/_/g, ' ') || 'Direct'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(call.startedAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No call records found for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {callsPagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm">
              <span className="text-slate-500 text-xs">
                Page {callsPagination.page} of {callsPagination.totalPages} ({callsPagination.total} total calls)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={callsPagination.page <= 1}
                  onClick={() =>
                    setCallsPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 text-xs font-medium"
                >
                  Previous
                </button>
                <button
                  disabled={callsPagination.page >= callsPagination.totalPages}
                  onClick={() =>
                    setCallsPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 text-xs font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STORE NUMBERS & FORWARDING */}
      {activeTab === 'numbers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Active Store Virtual Numbers</h2>
                <p className="text-xs text-slate-500">
                  Tracking numbers route customer calls directly to real store destination phones
                </p>
              </div>
              <button
                onClick={() => setIsProvisionOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Assign Number
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Virtual Tracking Number</th>
                    <th className="py-3 px-4">Assigned Store</th>
                    <th className="py-3 px-4">Forwarding Destination (Real Phone)</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {virtualNumbers.length > 0 ? (
                    virtualNumbers.map((num) => {
                      const matchedStore = stores.find((s) => s.id === num.storeId);
                      return (
                        <tr key={num.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {num.phoneNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-800">
                            {matchedStore ? `${matchedStore.name} (${matchedStore.city})` : 'Unassigned'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                            {num.forwardingNumber || 'None configured'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-slate-100 text-slate-700">
                              {num.provider}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                                num.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {num.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {num.status === 'ACTIVE' && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setForwardingNumberId(num.id);
                                    setForwardingStoreId(num.storeId || '');
                                    setNewDestinationPhone(num.forwardingNumber || '');
                                    setIsForwardingOpen(true);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Update Forwarding
                                </button>
                                <span className="text-slate-300">·</span>
                                <button
                                  onClick={() => handleReleaseNumber(num.id, num.phoneNumber)}
                                  className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                                >
                                  Release
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No virtual tracking numbers provisioned yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FUNNEL BREAKDOWN */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Store-by-Store Call Attribution & Answer Rates
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Store Name</th>
                    <th className="py-3 px-4">Store Code</th>
                    <th className="py-3 px-4">Tracking Phone</th>
                    <th className="py-3 px-4">Real Store Phone</th>
                    <th className="py-3 px-4">Total Calls</th>
                    <th className="py-3 px-4">Answered</th>
                    <th className="py-3 px-4">Answer Rate</th>
                    <th className="py-3 px-4">Avg Talk Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storeSummaries.length > 0 ? (
                    storeSummaries.map((s) => (
                      <tr key={s.storeId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{s.storeName}</td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500">
                          {s.storeCode || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-emerald-700 font-bold">
                          {s.trackingNumber || 'Not assigned'}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {s.realPhone || 'None'}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{s.totalCalls}</td>
                        <td className="py-3 px-4 text-emerald-600 font-semibold">{s.answeredCalls}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">{s.answerRatePercentage}%</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {formatDuration(s.avgTalkDurationSeconds)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No store breakdown available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PROVISION NUMBER MODAL */}
      {isProvisionOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Assign Virtual Tracking Number</h3>
            <p className="text-xs text-slate-500">
              Provision a virtual number and map it to a physical store location. Calls will forward automatically.
            </p>

            <form onSubmit={handleProvision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Store Location
                </label>
                <select
                  value={provisionStoreId}
                  onChange={(e) => setProvisionStoreId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Store --</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Virtual Tracking Phone Number (E.164)
                </label>
                <input
                  type="text"
                  value={provisionPhone}
                  onChange={(e) => setProvisionPhone(e.target.value)}
                  placeholder="+914441002000"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                >
                  {isProvisioning ? 'Provisioning...' : 'Provision & Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE FORWARDING MODAL */}
      {isForwardingOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Update Forwarding Destination</h3>
            <p className="text-xs text-slate-500">
              Update the real store destination phone number where incoming calls to this tracking number are answered.
            </p>

            <form onSubmit={handleUpdateForwarding} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Destination Phone Number (E.164)
                </label>
                <input
                  type="text"
                  value={newDestinationPhone}
                  onChange={(e) => setNewDestinationPhone(e.target.value)}
                  placeholder="+919840155667"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForwardingOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingForwarding}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {isUpdatingForwarding ? 'Updating...' : 'Update Forwarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
