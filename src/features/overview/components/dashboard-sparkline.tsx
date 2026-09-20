'use client';

import { useId, useMemo } from 'react';

interface DashboardSparklineProps {
  color?: string | undefined;
  height?: number | undefined;
  seed?: number | undefined;
  points?: number[] | undefined;
  className?: string | undefined;
}

export function DashboardSparkline({
  color = '#4338CA',
  height = 36,
  points,
  className = '',
}: DashboardSparklineProps) {
  const gradId = useId().replace(/:/g, '');

  const { pathD, areaD, isFlat } = useMemo(() => {
    const width = 100;
    const h = 36;
    const padding = 3;

    // Check if real points exist and have at least one non-zero value
    const hasData = Boolean(points && points.length >= 2 && points.some((p) => p > 0));

    if (!hasData) {
      // Clean flat baseline at the bottom representing no data yet
      return {
        pathD: `M 0,${h - padding} L ${width},${h - padding}`,
        areaD: '',
        isFlat: true,
      };
    }

    const data = points!;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Map data points to SVG coordinates
    const coords: Array<{ x: number; y: number }> = data.map((val, i) => ({
      x: (i / (data.length - 1)) * width,
      y: h - padding - ((val - min) / range) * (h - padding * 2),
    }));

    if (coords.length < 2 || !coords[0]) {
      return {
        pathD: `M 0,${h - padding} L ${width},${h - padding}`,
        areaD: '',
        isFlat: true,
      };
    }

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

    return { pathD: d, areaD: area, isFlat: false };
  }, [points]);

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
        {!isFlat && <path d={areaD} fill={`url(#${gradId})`} />}
        <path
          d={pathD}
          fill="none"
          stroke={isFlat ? '#CBD5E1' : color}
          strokeWidth={isFlat ? '1.5' : '2'}
          strokeDasharray={isFlat ? '3 3' : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
