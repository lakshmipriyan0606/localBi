'use client';

import { useState, useId, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const DATES = [
  'Aug 18', 'Aug 21', 'Aug 24', 'Aug 27', 'Aug 30',
  'Sep 2', 'Sep 5', 'Sep 8', 'Sep 11', 'Sep 14', 'Sep 17'
];

// 11 data points matching the x-axis ticks
const CLICKS_SERIES = [350, 420, 510, 480, 590, 640, 680, 742, 710, 690, 760];
const IMPRESSIONS_SERIES = [11200, 12800, 14900, 13800, 16100, 17200, 17900, 18421, 17600, 16900, 19100];

export function GscPerformanceChart() {
  const [hoverIndex, setHoverIndex] = useState<number | null>(7); // Default to Sep 8 matching screenshot
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

  // Build SVG path strings using Catmull-Rom or cubic spline
  const { clicksPath, clicksArea, impressionsPath, impressionsArea, coordsClicks, coordsImpressions } = useMemo(() => {
    const maxClicks = 1000;
    const maxImpressions = 24000;

    const coordsC = CLICKS_SERIES.map((val, i) => ({
      x: padLeft + (i / (CLICKS_SERIES.length - 1)) * chartW,
      y: padTop + chartH - (val / maxClicks) * chartH,
    }));

    const coordsI = IMPRESSIONS_SERIES.map((val, i) => ({
      x: padLeft + (i / (IMPRESSIONS_SERIES.length - 1)) * chartW,
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

    const pathC = makeSmoothPath(coordsC);
    const pathI = makeSmoothPath(coordsI);

    const bottomY = padTop + chartH;
    const lastC = coordsC[coordsC.length - 1] ?? coordsC[0]!;
    const firstC = coordsC[0]!;
    const lastI = coordsI[coordsI.length - 1] ?? coordsI[0]!;
    const firstI = coordsI[0]!;

    const areaC = `${pathC} L ${lastC.x.toFixed(1)},${bottomY} L ${firstC.x.toFixed(1)},${bottomY} Z`;
    const areaI = `${pathI} L ${lastI.x.toFixed(1)},${bottomY} L ${firstI.x.toFixed(1)},${bottomY} Z`;

    return {
      clicksPath: pathC,
      clicksArea: areaC,
      impressionsPath: pathI,
      impressionsArea: areaI,
      coordsClicks: coordsC,
      coordsImpressions: coordsI,
    };
  }, [chartW, chartH, padLeft, padTop]);

  const activeIdx = hoverIndex ?? 7;
  const activeClicksPt = coordsClicks[activeIdx] ?? coordsClicks[0]!;
  const activeImpressionsPt = coordsImpressions[activeIdx] ?? coordsImpressions[0]!;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-600" />
          <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
            Search Performance Trend
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              Clicks
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              Impressions
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-600 cursor-pointer hover:bg-slate-100">
            <span>Daily</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-[180px] select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoverIndex(7)}
        >
          <defs>
            <linearGradient id={gradPurpleId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={gradBlueId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {[24000, 18000, 12000, 6000, 0].map((val) => {
            const y = padTop + chartH - (val / 24000) * chartH;
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9.5px] fill-slate-400 font-medium"
                >
                  {val === 0 ? '0' : `${val / 1000}K`}
                </text>
              </g>
            );
          })}

          {/* Areas */}
          <path d={clicksArea} fill={`url(#${gradPurpleId})`} />
          <path d={impressionsArea} fill={`url(#${gradBlueId})`} />

          {/* Lines */}
          <path
            d={impressionsPath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d={clicksPath}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Active dashed indicator at activeIdx */}
          {activeClicksPt && activeImpressionsPt && (
            <>
              <line
                x1={activeClicksPt.x}
                y1={padTop}
                x2={activeClicksPt.x}
                y2={padTop + chartH}
                stroke="#06B6D4"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Dot on clicks curve */}
              <circle
                cx={activeClicksPt.x}
                cy={activeClicksPt.y}
                r="4.5"
                fill="#8B5CF6"
                stroke="#FFFFFF"
                strokeWidth="2"
              />

              {/* Dot on impressions curve */}
              <circle
                cx={activeImpressionsPt.x}
                cy={activeImpressionsPt.y}
                r="4.5"
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </>
          )}

          {/* X Axis labels */}
          {DATES.map((d, i) => {
            const x = padLeft + (i / (DATES.length - 1)) * chartW;
            return (
              <text
                key={d}
                x={x}
                y={height - 5}
                textAnchor="middle"
                className="text-[9.5px] fill-slate-400 font-medium"
              >
                {d}
              </text>
            );
          })}

          {/* Hover hit areas */}
          {DATES.map((_, i) => {
            const x = padLeft + (i / (DATES.length - 1)) * chartW;
            const w = chartW / (DATES.length - 1);
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

        {/* Floating Tooltip Callout matching Screenshot */}
        {activeClicksPt && (
          <div
            className="absolute z-10 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl shadow-lg px-3 py-2 text-[11px] pointer-events-none transition-all duration-150"
            style={{
              left: `${(activeClicksPt.x / width) * 100}%`,
              top: '20px',
              transform: 'translateX(10px)',
            }}
          >
            <div className="font-semibold text-slate-700 mb-1 border-b border-slate-100 pb-0.5">
              {DATES[activeIdx] ?? 'Sep 8'}, 2026
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                Clicks
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {CLICKS_SERIES[activeIdx] ?? 742}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-600 mt-0.5">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                Impressions
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                {(IMPRESSIONS_SERIES[activeIdx] ?? 18421).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
