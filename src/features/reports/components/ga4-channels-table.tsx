'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Share2,
  Inbox,
  Globe,
  Search,
  Users,
  CheckCircle2,
  Clock,
  Zap,
  PieChart as PieIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatPercent } from '@/shared/lib/formatters';

export interface Ga4ChannelRow {
  channel: string;
  sessions: number;
  share: string;
  engagementRate: number;
  avgDuration: string;
  conversions: number;
}

export interface Ga4ChannelsTableProps {
  channels?: Ga4ChannelRow[];
  hasRealData?: boolean;
}

const CHANNEL_CONFIG: Record<string, { color: string; hex: string; bg: string; border: string; bar: string; icon: any }> = {
  'Organic Search': {
    color: 'text-indigo-600',
    hex: '#4F46E5',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    bar: 'from-indigo-600 to-blue-500',
    icon: Search,
  },
  'Organic Search (Google Search Console)': {
    color: 'text-indigo-600',
    hex: '#4F46E5',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    bar: 'from-indigo-600 to-blue-500',
    icon: Search,
  },
  'Direct': {
    color: 'text-sky-600',
    hex: '#0284C7',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    bar: 'from-sky-600 to-cyan-500',
    icon: Globe,
  },
  'Referral (Local Directories)': {
    color: 'text-amber-600',
    hex: '#F59E0B',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    bar: 'from-amber-500 to-orange-500',
    icon: Share2,
  },
  'Organic Social': {
    color: 'text-rose-600',
    hex: '#E11D48',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    bar: 'from-rose-500 to-pink-500',
    icon: Users,
  },
  'Paid Search (Ads)': {
    color: 'text-emerald-600',
    hex: '#10B981',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    bar: 'from-emerald-500 to-teal-500',
    icon: Zap,
  },
};

const DEFAULT_HEX = '#6366F1';

export function Ga4ChannelsTable({
  channels = [],
  hasRealData = false,
}: Ga4ChannelsTableProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalSessions = useMemo(() => {
    return channels.reduce((acc, c) => acc + c.sessions, 0);
  }, [channels]);

  const pieData = useMemo(() => {
    if (channels.length === 0) return [];
    return channels.map((c) => {
      const conf = CHANNEL_CONFIG[c.channel] || { hex: DEFAULT_HEX };
      return {
        name: c.channel,
        value: c.sessions || 1,
        color: conf.hex,
        share: c.share,
      };
    });
  }, [channels]);

  return (
    <Card className="border border-slate-200/90 shadow-md bg-white rounded-2xl overflow-hidden hover:border-slate-300 transition-all duration-300">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 p-5 sm:p-6 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                  Traffic Acquisition Channels
                </CardTitle>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200/80 font-bold text-[10px] py-0.5 px-2">
                  30-Day Grain
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Multi-channel acquisition share, engagement quality, and conversion contribution
              </CardDescription>
            </div>
          </div>

          <div className="text-right self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Acquisition Volume</span>
            <span className="text-lg font-black text-slate-900">{formatNumber(totalSessions)} Sessions</span>
          </div>
        </div>
      </CardHeader>

      {channels.length === 0 || (!hasRealData && channels.length === 0) ? (
        <CardContent className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto shadow-xs">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Acquisition Records Found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Traffic attribution begins automatically when web visitors arrive via Google Search Console or direct sessions.
          </p>
        </CardContent>
      ) : (
        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Visual Channel Share: Donut Chart & Legends */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-5 rounded-2xl bg-gradient-to-br from-slate-50/80 via-white to-indigo-50/20 border border-slate-200/80">
            {/* Donut Chart Canvas */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative h-[210px] w-full max-w-[240px] flex items-center justify-center">
                {!mounted ? (
                  <div className="h-full w-full rounded-full border-4 border-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Loading chart...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={88}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length || !payload[0]?.payload) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-xl p-2.5 text-xs text-slate-800">
                              <p className="font-bold text-slate-900 mb-1">{data.name}</p>
                              <div className="flex items-center justify-between gap-3 text-[11px]">
                                <span className="text-slate-500 font-medium">Sessions:</span>
                                <span className="font-mono font-bold text-slate-900">{formatNumber(data.value)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-[11px] mt-0.5">
                                <span className="text-slate-500 font-medium">Share:</span>
                                <span className="font-mono font-bold text-indigo-700">{data.share}</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center of Donut Metric */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {formatNumber(totalSessions)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Visits
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                <PieIcon className="h-3 w-3 text-indigo-500" />
                Channel Distribution Donut
              </span>
            </div>

            {/* Channels Proportional Legend Chips */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <span>Acquisition Breakdown</span>
                <span className="font-mono text-slate-700 font-bold">100% Attributed</span>
              </div>
              {channels.map((c, i) => {
                const conf = CHANNEL_CONFIG[c.channel] || { hex: DEFAULT_HEX, color: 'text-indigo-600', bg: 'bg-indigo-50' };
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: conf.hex }} />
                      <span className="text-xs font-bold text-slate-800 truncate">{c.channel}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                      <span className="text-xs font-extrabold text-slate-900">{formatNumber(c.sessions)}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {c.share}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Channel Performance Cards */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Channel Telemetry & Goal Conversions
            </h4>
            {channels.map((row, idx) => {
              const conf = CHANNEL_CONFIG[row.channel] || {
                color: 'text-indigo-600',
                hex: DEFAULT_HEX,
                bg: 'bg-indigo-50',
                border: 'border-indigo-200',
                bar: 'from-indigo-600 to-blue-500',
                icon: Globe,
              };
              const Icon = conf.icon;

              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-4 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${conf.bg} ${conf.color} border ${conf.border} shadow-xs group-hover:scale-110 transition-transform`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {row.channel}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">
                            {row.share}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="font-semibold text-slate-700 font-mono">{formatNumber(row.sessions)} Sessions</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-600">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {row.avgDuration} avg
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Metric Chips on the Right */}
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <div className="px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-teal-600" />
                        <span>{formatPercent(row.engagementRate)} Engaged</span>
                      </div>

                      <div className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200/80 text-purple-800 text-xs font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-purple-600" />
                        <span>{formatNumber(row.conversions)} Goals</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
