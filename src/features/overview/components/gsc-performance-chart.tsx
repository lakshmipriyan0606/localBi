'use client';

import { useState, useId, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { OverviewTrendPoint } from '@/modules/overview/overview-service';

export type ChartGranularity = 'daily' | 'weekly' | 'monthly';

interface GscPerformanceChartProps {
  trendData?: OverviewTrendPoint[] | undefined;
}

interface BucketedPoint {
  key: string;
  label: string;
  tooltipLabel: string;
  clicks: number;
  impressions: number;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const month = MONTH_NAMES_SHORT[parseInt(parts[1] || '1', 10) - 1] || 'Jan';
    const day = parseInt(parts[2] || '1', 10);
    return `${month} ${day}`;
  }
  return dateStr;
}

function formatFullDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const year = parts[0];
    const month = MONTH_NAMES_FULL[parseInt(parts[1] || '1', 10) - 1] || 'January';
    const day = parseInt(parts[2] || '1', 10);
    return `${month} ${day}, ${year}`;
  }
  return dateStr;
}

export function GscPerformanceChart({ trendData = [] }: GscPerformanceChartProps) {
  const [granularity, setGranularity] = useState<ChartGranularity>('daily');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const gradPurpleId = useId().replace(/:/g, '');
  const gradBlueId = useId().replace(/:/g, '');

  const width = 580;
  const height = 190;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 28;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Aggregate raw daily points into deterministic calendar buckets
  const bucketedData = useMemo<BucketedPoint[]>(() => {
    if (!trendData || trendData.length === 0) return [];

    if (granularity === 'daily') {
      return trendData.map((p) => ({
        key: p.date,
        label: formatShortDate(p.date),
        tooltipLabel: formatFullDate(p.date),
        clicks: p.clicks,
        impressions: p.impressions,
      }));
    }

    if (granularity === 'weekly') {
      const weekMap = new Map<string, { monday: Date; clicks: number; impressions: number }>();

      for (const p of trendData) {
        const dt = new Date(p.date + 'T00:00:00Z');
        const day = dt.getUTCDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(dt);
        monday.setUTCDate(dt.getUTCDate() + diffToMonday);
        const weekKey = monday.toISOString().slice(0, 10);

        const existing = weekMap.get(weekKey) || { monday, clicks: 0, impressions: 0 };
        existing.clicks += p.clicks;
        existing.impressions += p.impressions;
        weekMap.set(weekKey, existing);
      }

      return Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, val]) => {
          const m = val.monday;
          const monthShort = MONTH_NAMES_SHORT[m.getUTCMonth()];
          const monthFull = MONTH_NAMES_FULL[m.getUTCMonth()];
          const day = m.getUTCDate();
          const year = m.getUTCFullYear();

          return {
            key,
            label: `Wk ${monthShort} ${day}`,
            tooltipLabel: `Week of ${monthFull} ${day}, ${year}`,
            clicks: val.clicks,
            impressions: val.impressions,
          };
        });
    }

    if (granularity === 'monthly') {
      const monthMap = new Map<string, { clicks: number; impressions: number }>();

      for (const p of trendData) {
        const monthKey = p.date.slice(0, 7); // YYYY-MM
        const existing = monthMap.get(monthKey) || { clicks: 0, impressions: 0 };
        existing.clicks += p.clicks;
        existing.impressions += p.impressions;
        monthMap.set(monthKey, existing);
      }

      return Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, val]) => {
          const [year, mStr] = key.split('-');
          const mIdx = parseInt(mStr || '1', 10) - 1;
          const monthShort = MONTH_NAMES_SHORT[mIdx] || 'Jan';
          const monthFull = MONTH_NAMES_FULL[mIdx] || 'January';

          return {
            key,
            label: `${monthShort} '${year?.slice(2)}`,
            tooltipLabel: `${monthFull} ${year}`,
            clicks: val.clicks,
            impressions: val.impressions,
          };
        });
    }

    return [];
  }, [trendData, granularity]);

  // Max values for auto-scaling
  const { maxClicks, maxImpressions } = useMemo(() => {
    if (bucketedData.length === 0) return { maxClicks: 10, maxImpressions: 100 };
    const highestClicks = Math.max(...bucketedData.map((d) => d.clicks));
    const highestImpr = Math.max(...bucketedData.map((d) => d.impressions));
    return {
      maxClicks: Math.max(10, Math.ceil(highestClicks * 1.25)),
      maxImpressions: Math.max(100, Math.ceil(highestImpr * 1.25)),
    };
  }, [bucketedData]);

  // SVG Coordinates and Smooth Paths
  const {
    coordsClicks,
    coordsImpressions,
    clicksPath,
    clicksArea,
    impressionsPath,
    impressionsArea,
  } = useMemo(() => {
    const count = bucketedData.length;
    if (count === 0) {
      return {
        coordsClicks: [],
        coordsImpressions: [],
        clicksPath: '',
        clicksArea: '',
        impressionsPath: '',
        impressionsArea: '',
      };
    }

    const coordsC = bucketedData.map((pt, i) => ({
      x: padLeft + (count > 1 ? (i / (count - 1)) * chartW : chartW / 2),
      y: padTop + chartH - (pt.clicks / maxClicks) * chartH,
    }));

    const coordsI = bucketedData.map((pt, i) => ({
      x: padLeft + (count > 1 ? (i / (count - 1)) * chartW : chartW / 2),
      y: padTop + chartH - (pt.impressions / maxImpressions) * chartH,
    }));

    function makeSmoothPath(pts: Array<{ x: number; y: number }>) {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0]!.x},${pts[0]!.y} L ${pts[0]!.x + 1},${pts[0]!.y}`;

      const first = pts[0]!;
      let d = `M ${first.x.toFixed(1)},${first.y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1] ?? first;
        const p1 = pts[i] ?? first;
        const p2 = pts[i + 1] ?? p1;
        const p3 = pts[i + 2] ?? p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      }
      return d;
    }

    const cPath = makeSmoothPath(coordsC);
    const iPath = makeSmoothPath(coordsI);

    const bottomY = padTop + chartH;
    const firstC = coordsC[0] ?? { x: padLeft, y: bottomY };
    const lastC = coordsC[coordsC.length - 1] ?? { x: padLeft + chartW, y: bottomY };
    const cArea = `${cPath} L ${lastC.x.toFixed(1)},${bottomY} L ${firstC.x.toFixed(1)},${bottomY} Z`;

    const firstI = coordsI[0] ?? { x: padLeft, y: bottomY };
    const lastI = coordsI[coordsI.length - 1] ?? { x: padLeft + chartW, y: bottomY };
    const iArea = `${iPath} L ${lastI.x.toFixed(1)},${bottomY} L ${firstI.x.toFixed(1)},${bottomY} Z`;

    return {
      coordsClicks: coordsC,
      coordsImpressions: coordsI,
      clicksPath: cPath,
      clicksArea: cArea,
      impressionsPath: iPath,
      impressionsArea: iArea,
    };
  }, [bucketedData, chartW, chartH, maxClicks, maxImpressions]);

  // Active hover point
  const activeIdx =
    hoverIndex !== null
      ? hoverIndex
      : bucketedData.length > 0
      ? bucketedData.length - 1
      : null;

  const activeClicksPt = activeIdx !== null ? coordsClicks[activeIdx] : null;
  const activeImpressionsPt = activeIdx !== null ? coordsImpressions[activeIdx] : null;
  const activeBucket = activeIdx !== null ? bucketedData[activeIdx] : null;

  // Selected tick marks for X-axis labels (render ~5-7 readable labels)
  const xAxisTicks = useMemo(() => {
    const count = bucketedData.length;
    if (count <= 7) return bucketedData.map((d, i) => ({ index: i, label: d.label }));
    const step = Math.ceil(count / 6);
    const ticks: Array<{ index: number; label: string }> = [];
    for (let i = 0; i < count; i += step) {
      ticks.push({ index: i, label: bucketedData[i]!.label });
    }
    if (ticks[ticks.length - 1]?.index !== count - 1) {
      ticks.push({ index: count - 1, label: bucketedData[count - 1]!.label });
    }
    return ticks;
  }, [bucketedData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Search className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight leading-snug">
              Search Performance Trend
            </h3>
            <div className="text-[11px] text-slate-500 font-medium">
              Daily time-series with aggregate calendar buckets
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Series Legends */}
          <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 mr-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
              <span className="font-semibold text-slate-700">Clicks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
              <span className="font-semibold text-slate-700">Impressions</span>
            </div>
          </div>

          {/* Granularity Switcher Pills */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            {(['daily', 'weekly', 'monthly'] as ChartGranularity[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setGranularity(mode);
                  setHoverIndex(null);
                }}
                className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold capitalize transition-all ${
                  granularity === mode
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full h-[190px] select-none">
        {bucketedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Search className="w-6 h-6 stroke-1 text-slate-300 mb-1" />
            <span className="font-medium text-slate-600">No search performance trend data available</span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Search Console traffic will graph automatically once metrics are recorded.
            </span>
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={gradPurpleId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.01" />
              </linearGradient>

              <linearGradient id={gradBlueId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line
              x1={padLeft}
              y1={padTop}
              x2={width - padRight}
              y2={padTop}
              stroke="#F1F5F9"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <line
              x1={padLeft}
              y1={padTop + chartH * 0.5}
              x2={width - padRight}
              y2={padTop + chartH * 0.5}
              stroke="#F1F5F9"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <line
              x1={padLeft}
              y1={padTop + chartH}
              x2={width - padRight}
              y2={padTop + chartH}
              stroke="#E2E8F0"
              strokeWidth="1"
            />

            {/* Left Y-Axis Label (Clicks) */}
            <text x={padLeft - 6} y={padTop + 6} textAnchor="end" fill="#8B5CF6" fontSize="9" fontWeight="700">
              {maxClicks}
            </text>
            <text x={padLeft - 6} y={padTop + chartH * 0.5 + 3} textAnchor="end" fill="#94A3B8" fontSize="8.5" fontWeight="500">
              {Math.round(maxClicks / 2)}
            </text>
            <text x={padLeft - 6} y={padTop + chartH} textAnchor="end" fill="#94A3B8" fontSize="9" fontWeight="600">
              0
            </text>

            {/* Right Y-Axis Label (Impressions) */}
            <text x={width - padRight + 6} y={padTop + 6} textAnchor="start" fill="#3B82F6" fontSize="9" fontWeight="700">
              {maxImpressions.toLocaleString()}
            </text>
            <text x={width - padRight + 6} y={padTop + chartH} textAnchor="start" fill="#94A3B8" fontSize="9" fontWeight="600">
              0
            </text>

            {/* Area Fills */}
            {impressionsArea && <path d={impressionsArea} fill={`url(#${gradBlueId})`} />}
            {clicksArea && <path d={clicksArea} fill={`url(#${gradPurpleId})`} />}

            {/* Spline Lines */}
            {impressionsPath && (
              <path
                d={impressionsPath}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity="0.85"
              />
            )}
            {clicksPath && (
              <path
                d={clicksPath}
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            )}

            {/* Vertical crosshair guide */}
            {activeClicksPt && (
              <line
                x1={activeClicksPt.x}
                y1={padTop}
                x2={activeClicksPt.x}
                y2={padTop + chartH}
                stroke="#CBD5E1"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            )}

            {/* Active Circles on Curves */}
            {activeImpressionsPt && (
              <circle
                cx={activeImpressionsPt.x}
                cy={activeImpressionsPt.y}
                r="4"
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            )}
            {activeClicksPt && (
              <circle
                cx={activeClicksPt.x}
                cy={activeClicksPt.y}
                r="4.5"
                fill="#8B5CF6"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            )}

            {/* X-Axis Ticks & Labels */}
            {xAxisTicks.map((tick) => {
              const count = bucketedData.length;
              const x = padLeft + (count > 1 ? (tick.index / (count - 1)) * chartW : chartW / 2);
              const isHovered = activeIdx === tick.index;
              return (
                <text
                  key={tick.index}
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  fill={isHovered ? '#1E293B' : '#94A3B8'}
                  fontSize="9.5"
                  fontWeight={isHovered ? '700' : '500'}
                >
                  {tick.label}
                </text>
              );
            })}

            {/* Interactive Column Hitboxes */}
            {bucketedData.map((_, i) => {
              const count = bucketedData.length;
              const x = padLeft + (count > 1 ? (i / (count - 1)) * chartW : chartW / 2);
              const w = Math.max(12, chartW / Math.max(1, count));
              return (
                <rect
                  key={i}
                  x={x - w / 2}
                  y={padTop}
                  width={w}
                  height={chartH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              );
            })}
          </svg>
        )}

        {/* Floating Tooltip Callout */}
        {bucketedData.length > 0 && activeBucket && activeClicksPt && (
          <div
            className="absolute z-10 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl shadow-lg px-3 py-2 text-[11px] pointer-events-none transition-all duration-150"
            style={{
              left: `${Math.min(78, Math.max(12, (activeClicksPt.x / width) * 100))}%`,
              top: '15px',
              transform: activeClicksPt.x > width * 0.65 ? 'translateX(-100%)' : 'translateX(10px)',
            }}
          >
            <div className="font-semibold text-slate-800 mb-1 border-b border-slate-100 pb-0.5">
              {activeBucket.tooltipLabel}
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                Clicks
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {activeBucket.clicks.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-600 mt-0.5">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                Impressions
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {activeBucket.impressions.toLocaleString()}
              </span>
            </div>
            {activeBucket.impressions > 0 && (
              <div className="flex items-center justify-between gap-4 text-slate-600 mt-0.5 pt-0.5 border-t border-slate-100 text-[10px]">
                <span className="font-medium text-slate-500">Derived CTR</span>
                <span className="font-semibold text-emerald-600 tabular-nums">
                  {((activeBucket.clicks / activeBucket.impressions) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
