'use client';

import { useId, useMemo } from 'react';

interface DashboardSparklineProps {
  color?: string | undefined;
  height?: number | undefined;
  seed?: number | undefined;
  points?: number[] | undefined;
  className?: string | undefined;
}

// Pre-defined realistic sparkline curves that rise upward to visually match screenshot
const SPARKLINE_CURVES: readonly (readonly number[])[] = [
  [12, 18, 14, 22, 19, 28, 24, 32, 27, 36],
  [10, 15, 12, 20, 16, 25, 22, 30, 26, 35],
  [14, 12, 19, 16, 24, 21, 29, 26, 33, 38],
  [8, 14, 11, 18, 15, 23, 20, 28, 25, 34],
  [11, 16, 13, 21, 18, 26, 23, 31, 28, 37],
];

export function DashboardSparkline({
  color = '#4338CA',
  height = 36,
  seed = 1,
  points,
  className = '',
}: DashboardSparklineProps) {
  const gradId = useId().replace(/:/g, '');

  const data = useMemo((): readonly number[] => {
    if (points && points.length > 0) return points;
    const curveIndex = (Math.abs(seed) - 1) % SPARKLINE_CURVES.length;
    return SPARKLINE_CURVES[curveIndex] ?? SPARKLINE_CURVES[0]!;
  }, [points, seed]);

  const { pathD, areaD } = useMemo(() => {
    if (!data || data.length < 2) return { pathD: '', areaD: '' };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 100;
    const h = 36;
    const padding = 3;

    // Map data points to SVG coordinates
    const coords: Array<{ x: number; y: number }> = data.map((val, i) => ({
      x: (i / (data.length - 1)) * width,
      y: h - padding - ((val - min) / range) * (h - padding * 2),
    }));

    if (coords.length < 2 || !coords[0]) return { pathD: '', areaD: '' };

    // Build smooth cubic bezier curve
    let d = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1] ?? coords[0];
      const p1 = coords[i] ?? coords[0];
      const p2 = coords[i + 1] ?? p1;
      const p3 = coords[i + 2] ?? p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    const last = coords[coords.length - 1] ?? coords[0];
    const first = coords[0];
    const area = `${d} L ${last.x.toFixed(1)},${h} L ${first.x.toFixed(1)},${h} Z`;

    return { pathD: d, areaD: area };
  }, [data]);

  return (
    <div className={`w-full h-full flex items-end ${className}`} style={{ height }}>
      <svg
        viewBox="0 0 100 36"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="65%" stopColor={color} stopOpacity="0.08" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
