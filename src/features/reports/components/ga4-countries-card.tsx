'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Globe, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/shared/lib/formatters';
import { ChartTooltipFrame, ChartEmptyState } from '@/components/charts';

export interface Ga4CountryRow {
  code: string;
  sessions: number;
  impressions: number;
  percent: string;
}

export interface Ga4CountriesCardProps {
  countries?: Ga4CountryRow[];
  hasRealData?: boolean;
}

const COUNTRY_LOOKUP: Record<string, { name: string; flag: string; region: string; hex: string }> = {
  IND: { name: 'India', flag: '🇮🇳', region: 'South Asia', hex: '#10B981' },
  IN: { name: 'India', flag: '🇮🇳', region: 'South Asia', hex: '#10B981' },
  USA: { name: 'United States', flag: '🇺🇸', region: 'North America', hex: '#3B82F6' },
  US: { name: 'United States', flag: '🇺🇸', region: 'North America', hex: '#3B82F6' },
  GBR: { name: 'United Kingdom', flag: '🇬🇧', region: 'Europe', hex: '#8B5CF6' },
  GB: { name: 'United Kingdom', flag: '🇬🇧', region: 'Europe', hex: '#8B5CF6' },
  CAN: { name: 'Canada', flag: '🇨🇦', region: 'North America', hex: '#F59E0B' },
  CA: { name: 'Canada', flag: '🇨🇦', region: 'North America', hex: '#F59E0B' },
  AUS: { name: 'Australia', flag: '🇦🇺', region: 'Oceania', hex: '#EC4899' },
  AU: { name: 'Australia', flag: '🇦🇺', region: 'Oceania', hex: '#EC4899' },
  DEU: { name: 'Germany', flag: '🇩🇪', region: 'Europe', hex: '#6366F1' },
  DE: { name: 'Germany', flag: '🇩🇪', region: 'Europe', hex: '#6366F1' },
  SGP: { name: 'Singapore', flag: '🇸🇬', region: 'Southeast Asia', hex: '#14B8A6' },
  SG: { name: 'Singapore', flag: '🇸🇬', region: 'Southeast Asia', hex: '#14B8A6' },
  UAE: { name: 'United Arab Emirates', flag: '🇦🇪', region: 'Middle East', hex: '#F97316' },
  AE: { name: 'United Arab Emirates', flag: '🇦🇪', region: 'Middle East', hex: '#F97316' },
};

function getCountryInfo(code: string): { name: string; flag: string; region: string; hex: string } {
  const upper = (code || '').toUpperCase().trim();
  if (COUNTRY_LOOKUP[upper]) return COUNTRY_LOOKUP[upper];
  return { name: upper || 'Global Market', flag: '🌐', region: 'International', hex: '#10B981' };
}

export function Ga4CountriesCard({ countries = [], hasRealData: _hasRealData = false }: Ga4CountriesCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasData = countries.length > 0 && countries.some((c) => c.sessions > 0 || c.impressions > 0);
  const displayCountries = countries;

  const totalSessions = useMemo(() => {
    return displayCountries.reduce((acc, c) => acc + c.sessions, 0);
  }, [displayCountries]);

  const totalImpressions = useMemo(() => {
    return displayCountries.reduce((acc, c) => acc + c.impressions, 0);
  }, [displayCountries]);

  const pieData = useMemo(() => {
    return displayCountries.map((c) => {
      const info = getCountryInfo(c.code);
      const val = c.sessions > 0 ? c.sessions : parseFloat(c.percent.replace('%', '')) || 1;
      return {
        name: info.name,
        code: c.code,
        flag: info.flag,
        region: info.region,
        value: val,
        actualSessions: c.sessions,
        percent: c.percent,
        color: info.hex,
      };
    });
  }, [displayCountries]);

  return (
    <Card className="border border-slate-200/90 shadow-md bg-white rounded-2xl overflow-hidden hover:border-slate-300 transition-all duration-300">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/20 p-5 sm:p-6 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                  Visitor Geographic Regions
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold py-0.5 px-2">
                  Geo Verified
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                National and regional visitor origination, search visibility reach, and market penetration
              </CardDescription>
            </div>
          </div>

          <div className="text-right self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Geographic Visits</span>
            <span className="text-lg font-black text-slate-900">{formatNumber(totalSessions)} Sessions</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {!hasData ? (
          <ChartEmptyState
            heightClass="h-[220px]"
            title="No geographic metrics recorded yet"
            message="Country distributions will appear as Google Search Console geographic metrics are synced."
          />
        ) : (
          <>
          {/* Visual Geographic Share: Donut Reach Chart + Region Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-5 rounded-2xl bg-gradient-to-br from-slate-50/80 via-white to-emerald-50/20 border border-slate-200/80">
            {/* Donut Reach Canvas */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative h-[210px] w-full max-w-[240px] flex items-center justify-center">
                {!mounted ? (
                  <div className="h-full w-full rounded-full border-4 border-slate-100 flex items-center justify-center text-xs text-slate-400">
                    Loading geo chart...
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
                            <ChartTooltipFrame
                              title={`${data.flag} ${data.name}`}
                              items={[
                                { label: 'Sessions', value: formatNumber(data.actualSessions), color: data.color },
                                { label: 'Share', value: data.percent },
                              ]}
                            />
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center of Donut Metric */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {displayCountries[0] ? getCountryInfo(displayCountries[0].code).flag : '🌐'}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200/60 mt-0.5">
                    {displayCountries[0]?.percent || '100%'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1">
                Geographic Audience Donut
              </span>
            </div>

            {/* Regional Legend Chips */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
              <span>National Territory Share</span>
              <span className="font-mono text-slate-700 font-bold">{formatNumber(totalImpressions)} Impressions</span>
            </div>
            {displayCountries.map((c) => {
              const info = getCountryInfo(c.code);

              return (
                <div
                  key={c.code}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none">{info.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{info.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                          {c.code}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-emerald-500" />
                        {info.region}
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-sm font-black text-slate-900">{c.percent}</span>
                    <p className="text-[10px] text-slate-500">{formatNumber(c.sessions)} visits</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Country Cards */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Regional Telemetry & Impressions
          </h4>
          {displayCountries.map((c) => {
            const info = getCountryInfo(c.code);

            return (
              <div
                key={c.code}
                className="group rounded-2xl border border-slate-200/80 bg-white p-4 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl leading-none filter drop-shadow-xs">{info.flag}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{info.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                          {c.code}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {info.region}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        Primary target market for localized customer acquisition
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end font-mono">
                      <span className="font-black text-slate-900 text-base">
                        {formatNumber(c.sessions)}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        {c.percent}
                      </span>
                    </div>
                    {c.impressions > 0 && (
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {formatNumber(c.impressions)} search impressions
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
        )}
      </CardContent>
    </Card>
  );
}
