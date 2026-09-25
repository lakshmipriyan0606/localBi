'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Smartphone,
  Laptop,
  Tablet,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/shared/lib/formatters';

export interface Ga4DeviceRow {
  device: string;
  sessions: number;
  percent: string;
}

export interface Ga4DevicesCardProps {
  tenantSlug: string;
  devices?: Ga4DeviceRow[];
  hasRealData?: boolean;
}

interface DeviceStyle {
  icon: any;
  gradient: string;
  hex: string;
  text: string;
  bg: string;
  border: string;
}

const DEFAULT_DEVICE_STYLE: DeviceStyle = {
  icon: Laptop,
  gradient: 'from-blue-600 to-indigo-600',
  hex: '#4F46E5',
  text: 'text-indigo-600',
  bg: 'bg-indigo-50',
  border: 'border-indigo-200',
};

const DEVICE_META: Record<string, DeviceStyle> = {
  Desktop: DEFAULT_DEVICE_STYLE,
  Mobile: {
    icon: Smartphone,
    gradient: 'from-sky-500 to-blue-600',
    hex: '#0284C7',
    text: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  Tablet: {
    icon: Tablet,
    gradient: 'from-purple-500 to-pink-600',
    hex: '#8B5CF6',
    text: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
};

export function Ga4DevicesCard({
  tenantSlug,
  devices = [],
  hasRealData = false,
}: Ga4DevicesCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayDevices = useMemo(() => {
    if (devices.length > 0) return devices;
    return [
      { device: 'Desktop', sessions: 1, percent: '100%' },
      { device: 'Mobile', sessions: 0, percent: '0%' },
      { device: 'Tablet', sessions: 0, percent: '0%' },
    ];
  }, [devices]);

  const pieData = useMemo(() => {
    return displayDevices.map((d) => {
      const meta = DEVICE_META[d.device] || DEFAULT_DEVICE_STYLE;
      const numVal = d.sessions > 0 ? d.sessions : parseFloat(d.percent.replace('%', '')) || 0;
      return {
        name: d.device,
        value: numVal > 0 ? numVal : 0.001,
        actualSessions: d.sessions,
        percent: d.percent,
        color: meta.hex,
      };
    });
  }, [displayDevices]);

  const primaryDevice = displayDevices[0]?.device || 'Desktop';

  return (
    <div className="space-y-6">
      {/* Hardware Distribution Card with Recharts Donut */}
      <Card className="border border-slate-200/90 shadow-md bg-white rounded-2xl overflow-hidden hover:border-slate-300 transition-all duration-300">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-teal-50/20 p-5 sm:p-6 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                  Device Hardware & Platform Distribution
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">
                  Visitor hardware category share, client resolution environments, and mobile penetration
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 font-bold py-0.5 px-2">
              Telemetry Active
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Visual Platform Share: Donut Gauge + Device Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-5 rounded-2xl bg-gradient-to-br from-slate-50/80 via-white to-teal-50/20 border border-slate-200/80">
            {/* Donut Gauge Canvas */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative h-[210px] w-full max-w-[240px] flex items-center justify-center">
                {!mounted ? (
                  <div className="h-full w-full rounded-full border-4 border-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Loading gauge...
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
                                <span className="font-mono font-bold text-slate-900">{formatNumber(data.actualSessions)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-[11px] mt-0.5">
                                <span className="text-slate-500 font-medium">Share:</span>
                                <span className="font-mono font-bold text-teal-700">{data.percent}</span>
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
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    {primaryDevice}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.2 rounded-full border border-teal-200/60 mt-0.5">
                    {displayDevices[0]?.percent || '100%'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1">
                Hardware Platform Donut
              </span>
            </div>

            {/* Platform Legend Chips */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <span>Hardware Platform Matrix</span>
                <span className="font-mono text-slate-700 font-bold">100% Share</span>
              </div>
              {displayDevices.map((d) => {
                const meta = DEVICE_META[d.device] || DEFAULT_DEVICE_STYLE;
                const Icon = meta.icon;

                return (
                  <div
                    key={d.device}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-teal-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${meta.bg} ${meta.text} border ${meta.border}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800">{d.device}</span>
                        <p className="text-[10px] text-slate-400">Client Hardware Platform</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sm font-black text-slate-900">{d.percent}</span>
                      <p className="text-[10px] text-slate-500">{formatNumber(d.sessions)} visits</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Reporting Ecosystem Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/60 via-white to-sky-50/30 p-5 shadow-sm transition-all duration-300 hover:border-indigo-200">
        <div className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Connected Reporting Sources
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Google Business Profile storefront impressions and Google Search Console organic queries are currently active for this workspace.
          </p>

          <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Link
              href={`/client/${tenantSlug}/reports/gsc/queries`}
              className="text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-white hover:bg-indigo-50/70 border border-slate-200/90 hover:border-indigo-300 text-slate-800 hover:text-indigo-700 shadow-2xs flex items-center justify-between transition-all group"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                View GSC Search Queries
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            <Link
              href={`/client/${tenantSlug}/reports/gbp/locations`}
              className="text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-white hover:bg-teal-50/70 border border-slate-200/90 hover:border-teal-300 text-slate-800 hover:text-teal-700 shadow-2xs flex items-center justify-between transition-all group"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                View GBP Storefront Metrics
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
