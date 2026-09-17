'use client';

import { useState, useId, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import type { OverviewTrendPoint } from '@/modules/overview/overview-service';

interface GscPerformanceChartProps {
  trendData?: OverviewTrendPoint[] | undefined;
}

export function GscPerformanceChart({ trendData = [] }: GscPerformanceChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradPurpleId = useId().replace(/:/g, '');
  const gradBlueId = useId().replace(/:/g, '');

  const width = 580;
  const height = 180;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 25;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const dates = useMemo(() => {
    if (trendData.length === 0) return ['Aug 18', 'Sep 1', 'Sep 17'];
    // Pick up to 11 evenly spaced labels
    const step = Math.max(1, Math.floor(trendData.length / 10));
    return trendData
      .filter((_, i) => i % step === 0 || i === trendData.length - 1)
      .slice(0, 11)
      .map((p) => {
        const parts = p.date.split('-');
        if (parts.length >= 3) {
          const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
            parseInt(parts[1] || '1', 10) - 1
          ];
          return `${month} ${parseInt(parts[2] || '1', 10)}`;
        }
        return p.date;
      });
  }, [trendData]);

  const clicksSeries = useMemo(() => {
    if (trendData.length === 0) return [0, 0, 0];
    const step = Math.max(1, Math.floor(trendData.length / 10));
    return trendData
      .filter((_, i) => i % step === 0 || i === trendData.length - 1)
      .slice(0, 11)
      .map((p) => p.clicks);
  }, [trendData]);

  const impressionsSeries = useMemo(() => {
    if (trendData.length === 0) return [0, 0, 0];
    const step = Math.max(1, Math.floor(trendData.length / 10));
    return trendData
      .filter((_, i) => i % step === 0 || i === trendData.length - 1)
      .slice(0, 11)
      .map((p) => p.impressions);
  }, [trendData]);

  const { clicksPath, clicksArea, impressionsPath, impressionsArea, coordsClicks, coordsImpressions } = useMemo(() => {
    const maxClicks = Math.max(10, ...clicksSeries) * 1.25;
    const maxImpressions = Math.max(100, ...impressionsSeries) * 1.25;

    const count = clicksSeries.length;
    const coordsC = clicksSeries.map((val, i) => ({
      x: padLeft + (count > 1 ? (i / (count - 1)) * chartW : chartW / 2),
      y: padTop + chartH - (val / maxClicks) * chartH,
    }));

    const coordsI = impressionsSeries.map((val, i) => ({
      x: padLeft + (count > 1 ? (i / (count - 1)) * chartW : chartW / 2),
      y: padTop + chartH - (val / maxImpressions) * chartH,
    }));

    function makeSmoothPath(pts: Array<{ x: number; y: number }>) {
      if (pts.length === 0) return '';
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
      clicksPath: cPath,
      clicksArea: cArea,
      impressionsPath: iPath,
      impressionsArea: iArea,
      coordsClicks: coordsC,
      coordsImpressions: coordsI,
    };
  }, [clicksSeries, impressionsSeries, chartW, chartH]);

  const activeIdx = hoverIndex !== null ? hoverIndex : clicksSeries.length > 0 ? Math.floor(clicksSeries.length / 2) : 0;
  const activeClicksPt = coordsClicks[activeIdx];
  const activeImpressionsPt = coordsImpressions[activeIdx];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
            Search Performance Trend
          </h3>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Series Legends */}
          <div className="flex items-center gap-2.5 text-[11px] font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              <span>Clicks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <span>Impressions</span>
            </div>
          </div>

          {/* Granularity Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-600">
            <span>Daily</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[180px] select-none">
        {trendData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 text-xs">
            <span>No search performance trend telemetry available yet</span>
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
            <line x1={padLeft} y1={padTop} x2={width - padRight} y2={padTop} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={padLeft} y1={padTop + chartH * 0.5} x2={width - padRight} y2={padTop + chartH * 0.5} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={padLeft} y1={padTop + chartH} x2={width - padRight} y2={padTop + chartH} stroke="#E2E8F0" strokeWidth="1" />

            {/* Left Y-Axis Label */}
            <text x={padLeft - 6} y={padTop + 8} textAnchor="end" fill="#94A3B8" fontSize="9" fontWeight="600">
              {Math.round(Math.max(10, ...clicksSeries) * 1.2)}
            </text>
            <text x={padLeft - 6} y={padTop + chartH} textAnchor="end" fill="#94A3B8" fontSize="9" fontWeight="600">
              0
            </text>

            {/* Area Fills */}
            <path d={impressionsArea} fill={`url(#${gradBlueId})`} />
            <path d={clicksArea} fill={`url(#${gradPurpleId})`} />

            {/* Spline Lines */}
            <path d={impressionsPath} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <path d={clicksPath} fill="none" stroke="#8B5CF6" strokeWidth="2.2" strokeLinecap="round" />

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

            {/* Hover Circles */}
            {activeImpressionsPt && (
              <circle cx={activeImpressionsPt.x} cy={activeImpressionsPt.y} r="4" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
            )}
            {activeClicksPt && (
              <circle cx={activeClicksPt.x} cy={activeClicksPt.y} r="4.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="2" />
            )}

            {/* X-Axis Date Labels */}
            {dates.map((date, i) => {
              const x = padLeft + (dates.length > 1 ? (i / (dates.length - 1)) * chartW : chartW / 2);
              const isHovered = i === activeIdx;
              return (
                <text
                  key={i}
                  x={x}
                  y={height - 5}
                  textAnchor="middle"
                  fill={isHovered ? '#1E293B' : '#94A3B8'}
                  fontSize="9.5"
                  fontWeight={isHovered ? '700' : '500'}
                >
                  {date}
                </text>
              );
            })}

            {/* Interactive column hitboxes */}
            {dates.map((_, i) => {
              const x = padLeft + (dates.length > 1 ? (i / (dates.length - 1)) * chartW : chartW / 2);
              const w = chartW / Math.max(1, dates.length);
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
        {trendData.length > 0 && activeClicksPt && (
          <div
            className="absolute z-10 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl shadow-lg px-3 py-2 text-[11px] pointer-events-none transition-all duration-150"
            style={{
              left: `${(activeClicksPt.x / width) * 100}%`,
              top: '20px',
              transform: 'translateX(10px)',
            }}
          >
            <div className="font-semibold text-slate-700 mb-1 border-b border-slate-100 pb-0.5">
              {dates[activeIdx] ?? 'Sep 8'}, 2026
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                Clicks
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {clicksSeries[activeIdx] ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-600 mt-0.5">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                Impressions
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {(impressionsSeries[activeIdx] ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
