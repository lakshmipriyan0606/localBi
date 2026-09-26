'use client';

import { useState, useEffect, use } from 'react';
import {
  Users,
  Smartphone,
  Flame,
  MessageCircle,
  Copy,
  Check,
  RefreshCw,
  Search,
  Cpu,
  Sparkles,
  ShieldCheck,
  Code2,
  Radio,
  ExternalLink,
  Zap,
  Trash2,
  UserPlus,
  X,
  Laptop,
} from 'lucide-react';
import type { VisitorSession, VisitorStats } from '@/modules/visitors/visitor-service';

export default function TenantVisitorsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const resolvedParams = use(params);
  const tenantSlug = resolvedParams.tenantSlug;

  const [visitors, setVisitors] = useState<VisitorSession[]>([]);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stream' | 'nitro-tech' | 'embed'>('stream');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Manual Identity Stitch Modal State
  const [selectedVisitorForStitch, setSelectedVisitorForStitch] = useState<VisitorSession | null>(null);
  const [stitchPhone, setStitchPhone] = useState('');
  const [stitchName, setStitchName] = useState('');
  const [isStitching, setIsStitching] = useState(false);
  const [stitchSuccess, setStitchSuccess] = useState<string | null>(null);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tenants/${tenantSlug}/visitors`);
      if (res.ok) {
        const data = await res.json();
        setVisitors(data.visitors || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Error fetching visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [tenantSlug]);

  // Capture a real live visit from the current machine to verify telemetry
  const handleTestLiveVisit = async () => {
    try {
      setIsSimulating(true);
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(0, 0, 150, 30);
        ctx.fillStyle = '#fff';
        ctx.fillText('LiveDevice', 10, 20);
      }
      const rawFp = (canvas.toDataURL() + navigator.userAgent + screen.width + 'x' + screen.height).slice(0, 40);
      let hash = 0;
      for (let i = 0; i < rawFp.length; i++) hash = ((hash << 5) - hash) + rawFp.charCodeAt(i);
      const fp = 'fp_' + Math.abs(hash).toString(16);

      const ua = navigator.userAgent;
      let os = 'Windows Desktop';
      if (/iPhone|iPad/i.test(ua)) os = 'iOS Device';
      else if (/Android/i.test(ua)) os = 'Android Mobile';
      else if (/Mac/i.test(ua)) os = 'macOS Desktop';
      else if (/Windows/i.test(ua)) os = 'Windows 11 / 10';

      let browser = 'Google Chrome';
      if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
      else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
      else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';

      await fetch('/api/v1/pixel/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          deviceFingerprint: fp,
          url: `/site/${tenantSlug}`,
          title: `${tenantSlug.toUpperCase()} - Official Storefront`,
          platform: os,
          browser: browser,
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
          referrer: document.referrer || '',
          dwellTimeSeconds: 30,
          eventType: 'page_view',
        }),
      });

      await fetchVisitors();
    } catch (err) {
      console.error('Failed to trigger live test visit:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear real visitor logs for this store?')) return;
    try {
      await fetch(`/api/tenants/${tenantSlug}/visitors`, { method: 'DELETE' });
      await fetchVisitors();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStitchIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitorForStitch || !stitchPhone) return;

    try {
      setIsStitching(true);
      setStitchSuccess(null);
      const res = await fetch(`/api/tenants/${tenantSlug}/visitors/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceFingerprint: selectedVisitorForStitch.deviceFingerprint,
          phone: stitchPhone.trim(),
          name: stitchName.trim() || undefined,
        }),
      });

      if (res.ok) {
        setStitchSuccess(`Phone ${stitchPhone} stitched to device ${selectedVisitorForStitch.deviceFingerprint}!`);
        setTimeout(() => {
          setSelectedVisitorForStitch(null);
          setStitchPhone('');
          setStitchName('');
          setStitchSuccess(null);
          fetchVisitors();
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStitching(false);
    }
  };

  const embedScript = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://localbi.app'}/localbi-pixel.js" data-tenant="${tenantSlug}" async></script>`;

  const copyEmbedScript = () => {
    navigator.clipboard.writeText(embedScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredVisitors = visitors.filter((v) => {
    const q = searchQuery.toLowerCase();
    const phone = v.identifiedUser?.phone?.toLowerCase() || '';
    const name = v.identifiedUser?.name?.toLowerCase() || '';
    const fp = v.deviceFingerprint.toLowerCase();
    const channel = v.trafficSource.channel.toLowerCase();

    return phone.includes(q) || name.includes(q) || fp.includes(q) || channel.includes(q);
  });

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Microsite Telemetry
            </span>
            <span className="text-xs text-slate-500">Cookieless Shopper Tracking</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Microsite Visitor Analytics & WhatsApp Leads
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track genuine shoppers browsing your location storefront microsites. Identify high-intent visitors and trigger direct 1-click WhatsApp order follow-ups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchVisitors()}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Refresh visitors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {visitors.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors cursor-pointer"
              title="Clear all visitor logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Logs</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('embed')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Code2 className="w-4 h-4" />
            <span>Get Tracking Pixel</span>
          </button>
        </div>
      </div>

      {/* KPI Command Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Visitors */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Tracked Visitors</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats?.totalVisitors ?? 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real device hardware fingerprinting
            </div>
          </div>
        </div>

        {/* KPI 2: Identified Shoppers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Identified Shoppers</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-indigo-600">
              {stats?.identifiedCount ?? 0}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Phone numbers stitched to device
            </div>
          </div>
        </div>

        {/* KPI 3: High Intent / Hot Shoppers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>High-Intent Shoppers</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-amber-500">
              {stats?.highIntentCount ?? 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Menu browsers & cart drop-offs
            </div>
          </div>
        </div>

        {/* KPI 4: WhatsApp Inquiries */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>WhatsApp Inquiries</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats?.whatsappInquiries ?? 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Order intents initiated on WhatsApp
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'stream'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Live Visitor Stream ({visitors.length})
          </button>
          <button
            onClick={() => setActiveTab('nitro-tech')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'nitro-tech'
                ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            How Cookieless Identity Works
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'embed'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tracking Pixel Embed Script
          </button>
        </div>

        {activeTab === 'stream' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleTestLiveVisit}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold whitespace-nowrap transition-colors"
              title="Record a live visit from this machine"
            >
              <Zap className={`w-3.5 h-3.5 text-indigo-500 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Recording Visit...' : '⚡ Test Live Visit from This Browser'}</span>
            </button>

            {visitors.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Clear visitor logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search phone, channel, device..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* View 1: Live Visitor Stream Table */}
      {activeTab === 'stream' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {visitors.length === 0 ? (
            /* Clean Zero State when no visitors have hit the site */
            <div className="p-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <Radio className="w-8 h-8 animate-pulse" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Real Telemetry Active — Awaiting Live Visitors
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Zero mock data. When a visitor browses your microsite at <code className="text-purple-600 dark:text-purple-400 font-mono">/site/{tenantSlug}</code> or any site with the tracking pixel installed, their real hardware fingerprint, browser, and timeline will appear here automatically.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleTestLiveVisit}
                  disabled={isSimulating}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isSimulating ? 'Recording Visit...' : '⚡ Record My Browser as Live Visitor'}</span>
                </button>

                <a
                  href={`/site/${tenantSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Microsite in New Tab</span>
                </a>

                <button
                  onClick={() => setActiveTab('embed')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-xs transition-colors"
                >
                  Get Embed Code
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Visitor Identity</th>
                    <th className="py-3 px-4">Device & OS</th>
                    <th className="py-3 px-4">Traffic Channel</th>
                    <th className="py-3 px-4">Intent Level</th>
                    <th className="py-3 px-4">Activity Timeline</th>
                    <th className="py-3 px-4 text-right">Instant Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredVisitors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No visitors match your search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredVisitors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        {/* Identity */}
                        <td className="py-3.5 px-4">
                          {v.isIdentified && v.identifiedUser ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                <span>{v.identifiedUser.name || 'Shopper'}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium">
                                  Resolved
                                </span>
                              </div>
                              <div className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                {v.identifiedUser.phone}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                                <span>Anonymous Visitor</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                  Unstitched
                                </span>
                              </div>
                              <div className="font-mono text-slate-400 text-[10px] truncate max-w-[150px]" title={v.deviceFingerprint}>
                                {v.deviceFingerprint}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Device */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          <div className="font-medium flex items-center gap-1.5">
                            <Laptop className="w-3.5 h-3.5 text-slate-400" />
                            <span>{v.deviceInfo.platform}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {v.deviceInfo.browser} · {v.deviceInfo.screenResolution} · {v.deviceInfo.timezone}
                          </div>
                        </td>

                        {/* Channel */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {v.trafficSource.channel}
                          </span>
                        </td>

                        {/* Intent Level */}
                        <td className="py-3.5 px-4">
                          {v.intentLevel === 'HOT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800">
                              <Flame className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
                              HOT (Ready to Order)
                            </span>
                          )}
                          {v.intentLevel === 'HIGH' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              HIGH (Multiple Pages)
                            </span>
                          )}
                          {v.intentLevel === 'MEDIUM' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              MEDIUM
                            </span>
                          )}
                          {v.intentLevel === 'LOW' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              LOW
                            </span>
                          )}
                        </td>

                        {/* Activity */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          <div>{v.pageViews.length} page views</div>
                          <div className="text-slate-400">
                            {v.conversions.length > 0
                              ? v.conversions.map((c) => c.type).join(', ')
                              : 'Browsing Store'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {v.isIdentified && v.identifiedUser?.phone ? (
                            <a
                              href={`https://wa.me/${v.identifiedUser.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${v.identifiedUser.name || 'there'}! Saw you were checking out our special menu at ${tenantSlug}. Here is a special 10% coupon code: WELCOME10 for your order today!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm shadow-emerald-600/20 transition-all"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Send Nudge
                            </a>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedVisitorForStitch(v);
                                setStitchPhone('');
                                setStitchName('');
                                setStitchSuccess(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-semibold text-xs transition-colors"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Stitch Phone</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 2: NitroCommerce Technology Deep Dive */}
      {activeTab === 'nitro-tech' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold">
              <Cpu className="w-3.5 h-3.5" />
              Technical Architecture
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              How Cookieless Visitor Identification Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
              Traditional cookies are dying due to Apple ITP and Google Chrome cookie phaseouts. LocalBi resolves anonymous website traffic into identifiable customer profiles through a 4-step architecture:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Cookieless Device Fingerprinting (30+ Signals)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                When a visitor lands, our lightweight pixel captures hardware signals: Canvas 2D render hash, screen resolution, timezone offset, OS version, and browser userAgent. This creates an unforgeable device hash (<span className="font-mono text-purple-400">fp_8a7d...</span>) that survives cookie clears.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Intent & Conversion Telemetry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                As the visitor navigates the site, dwell times, menu views, and clicks on WhatsApp order buttons or phone dialers are captured instantly. Users who click WhatsApp are elevated to <strong className="text-red-500">HOT intent</strong>.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Identity Stitching (Phone & Name Binding)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                When a visitor fills an order inquiry form, opens a bill review link, or has their phone manually stitched, their device fingerprint is permanently linked to their verified phone number.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Automated WhatsApp Nudge & Retargeting
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Store owners can send one-click personalized WhatsApp nudges with discount codes or order assistance to bring high-intent shoppers back to checkout.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View 3: Tracking Pixel Embed */}
      {activeTab === 'embed' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Install the LocalBi Tracking Pixel on Your Website
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Paste this lightweight snippet into the <span className="font-mono">&lt;head&gt;</span> tag of your website (Shopify, WordPress, WooCommerce, or custom Next.js web application).
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                HTML Embed Code
              </span>
              <button
                type="button"
                onClick={copyEmbedScript}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied to Clipboard!' : 'Copy Script Tag'}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-purple-300 font-mono text-xs rounded-xl border border-slate-800 overflow-x-auto">
              {embedScript}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Privacy & Compliance (India DPDP Act 2023)
            </div>
            <p>
              The pixel operates in cookieless mode by default. To capture explicit consent for personal phone numbers, pair with our WhatsApp discount unlock widget on your website.
            </p>
          </div>
        </div>
      )}

      {/* Modal: Stitch Phone to Device Fingerprint */}
      {selectedVisitorForStitch && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base text-slate-900 dark:text-white">
                <UserPlus className="w-5 h-5 text-purple-600" />
                <span>Stitch Customer Identity to Device</span>
              </div>
              <button
                onClick={() => setSelectedVisitorForStitch(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1 text-xs border border-slate-200 dark:border-slate-800 font-mono">
              <div className="text-slate-400">Target Device Fingerprint:</div>
              <div className="text-purple-600 dark:text-purple-400 font-semibold truncate">
                {selectedVisitorForStitch.deviceFingerprint}
              </div>
              <div className="text-slate-500">
                {selectedVisitorForStitch.deviceInfo.platform} · {selectedVisitorForStitch.deviceInfo.browser}
              </div>
            </div>

            {stitchSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{stitchSuccess}</span>
              </div>
            )}

            <form onSubmit={handleStitchIdentity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 98401 23456"
                  required
                  value={stitchPhone}
                  onChange={(e) => setStitchPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Real Customer Name"
                  value={stitchName}
                  onChange={(e) => setStitchName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVisitorForStitch(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStitching}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  {isStitching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>{isStitching ? 'Stitching...' : 'Save & Stitch Phone'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
