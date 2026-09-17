'use client';

import { useState } from 'react';
import { Map, MapPin, ArrowUp } from 'lucide-react';

interface LocationMarker {
  id: string;
  name: string;
  x: number; // percentage
  y: number; // percentage
  users: number;
  conversions: number;
  rate: string;
  trend: number;
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose';
  isHq?: boolean;
}

const MAP_LOCATIONS: LocationMarker[] = [
  {
    id: 'denver-hq',
    name: 'Denver (HQ)',
    x: 49,
    y: 54,
    users: 5421,
    conversions: 842,
    rate: '4.9%',
    trend: 28,
    color: 'emerald',
    isHq: true,
  },
  {
    id: 'lakewood',
    name: 'Lakewood',
    x: 24,
    y: 64,
    users: 3218,
    conversions: 421,
    rate: '4.2%',
    trend: 24,
    color: 'blue',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    x: 77,
    y: 67,
    users: 2184,
    conversions: 298,
    rate: '4.6%',
    trend: 18,
    color: 'purple',
  },
  {
    id: 'arvada',
    name: 'Arvada / Westminster',
    x: 22,
    y: 36,
    users: 1421,
    conversions: 156,
    rate: '3.8%',
    trend: 12,
    color: 'blue',
  },
  {
    id: 'littleton',
    name: 'Littleton',
    x: 48,
    y: 84,
    users: 598,
    conversions: 74,
    rate: '3.1%',
    trend: 8,
    color: 'purple',
  },
];

export function LocationPerformanceMap() {
  const [selectedId, setSelectedId] = useState<string>('denver-hq');
  const selectedLoc = MAP_LOCATIONS.find((l) => l.id === selectedId) ?? MAP_LOCATIONS[0]!;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Map className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
          Location Performance Map.
          <span className="font-normal text-slate-500 text-[11.5px] ml-1.5">
            See how your locations perform across your service area
          </span>
        </h3>
      </div>

      {/* Styled Denver Map Canvas */}
      <div className="relative w-full h-[220px] rounded-xl overflow-hidden border border-slate-200/70 bg-[#F4F6F8] select-none">
        <svg
          viewBox="0 0 600 240"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Soft map water gradient */}
            <linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="100%" stopColor="#7DD3FC" />
            </linearGradient>
            {/* Green park fill */}
            <pattern id="parkPat" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="#E2F7E8" />
            </pattern>
          </defs>

          {/* Base landmass */}
          <rect width="600" height="240" fill="#F6F7F9" />

          {/* Parks & green areas */}
          <path
            d="M 260 80 Q 290 60 320 85 Q 340 120 300 130 Q 260 120 260 80 Z"
            fill="#DCFCE7"
            opacity="0.85"
          />
          <path
            d="M 110 90 Q 140 70 160 100 Q 150 140 120 130 Z"
            fill="#DCFCE7"
            opacity="0.75"
          />
          <path
            d="M 430 140 Q 480 120 500 160 Q 460 190 420 170 Z"
            fill="#DCFCE7"
            opacity="0.75"
          />

          {/* River / Creek (South Platte River winding through Denver) */}
          <path
            d="M 220 0 Q 270 70 290 120 T 320 240"
            fill="none"
            stroke="url(#riverGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Secondary road network grid */}
          <g stroke="#E8ECF2" strokeWidth="1.5">
            <line x1="0" y1="50" x2="600" y2="50" />
            <line x1="0" y1="100" x2="600" y2="100" />
            <line x1="0" y1="150" x2="600" y2="150" />
            <line x1="0" y1="200" x2="600" y2="200" />
            <line x1="80" y1="0" x2="80" y2="240" />
            <line x1="160" y1="0" x2="160" y2="240" />
            <line x1="240" y1="0" x2="240" y2="240" />
            <line x1="320" y1="0" x2="320" y2="240" />
            <line x1="400" y1="0" x2="400" y2="240" />
            <line x1="480" y1="0" x2="480" y2="240" />
            <line x1="560" y1="0" x2="560" y2="240" />
          </g>

          {/* Major arterial highways */}
          {/* I-70 East-West */}
          <path
            d="M 0 75 Q 280 70 600 80"
            fill="none"
            stroke="#FEF08A"
            strokeWidth="5"
            opacity="0.9"
          />
          <path
            d="M 0 75 Q 280 70 600 80"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            opacity="0.6"
          />

          {/* I-25 North-South */}
          <path
            d="M 310 0 Q 295 100 305 240"
            fill="none"
            stroke="#FEF08A"
            strokeWidth="5"
            opacity="0.9"
          />
          <path
            d="M 310 0 Q 295 100 305 240"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            opacity="0.6"
          />

          {/* 6th Ave Freeway West */}
          <path
            d="M 0 135 L 300 135"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="3.5"
          />

          {/* I-70 Highway Shield */}
          <g transform="translate(425, 68)">
            <rect x="-9" y="-7" width="18" height="14" rx="3" fill="#1D4ED8" />
            <rect x="-9" y="-7" width="18" height="4.5" rx="1" fill="#DC2626" />
            <text x="0" y="4" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold">
              70
            </text>
          </g>

          {/* I-25 Highway Shield */}
          <g transform="translate(303, 215)">
            <rect x="-9" y="-7" width="18" height="14" rx="3" fill="#1D4ED8" />
            <rect x="-9" y="-7" width="18" height="4.5" rx="1" fill="#DC2626" />
            <text x="0" y="4" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold">
              25
            </text>
          </g>

          {/* City / Region typography labels */}
          <text
            x="300"
            y="170"
            textAnchor="middle"
            fill="#334155"
            fontSize="18"
            fontWeight="bold"
            letterSpacing="0.5"
          >
            Denver
          </text>
          <text
            x="135"
            y="65"
            textAnchor="middle"
            fill="#64748B"
            fontSize="12"
            fontWeight="600"
          >
            Arvada
          </text>
          <text
            x="125"
            y="155"
            textAnchor="middle"
            fill="#64748B"
            fontSize="12"
            fontWeight="600"
          >
            Lakewood
          </text>
          <text
            x="485"
            y="175"
            textAnchor="middle"
            fill="#64748B"
            fontSize="12"
            fontWeight="600"
          >
            Aurora
          </text>
        </svg>

        {/* Interactive Location Markers & Radar Pulses */}
        {MAP_LOCATIONS.map((loc) => {
          const isSelected = loc.id === selectedId;
          const isHq = loc.isHq;

          return (
            <div
              key={loc.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
              style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
              onClick={() => setSelectedId(loc.id)}
            >
              {/* Radar pulse animation circles */}
              {isHq && (
                <>
                  <span className="absolute -inset-4 rounded-full bg-emerald-400/25 animate-ping" />
                  <span className="absolute -inset-8 rounded-full bg-emerald-300/15" />
                </>
              )}

              {/* Pin Icon */}
              <div
                className={`relative flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110 shadow-md ${
                  isHq
                    ? 'w-9 h-9 bg-emerald-600 text-white ring-4 ring-emerald-300/60'
                    : loc.color === 'blue'
                    ? 'w-7 h-7 bg-blue-600 text-white ring-2 ring-blue-300/60'
                    : loc.color === 'purple'
                    ? 'w-7 h-7 bg-purple-600 text-white ring-2 ring-purple-300/60'
                    : 'w-7 h-7 bg-amber-600 text-white ring-2 ring-amber-300/60'
                }`}
              >
                <MapPin
                  className={`${
                    isHq ? 'w-5 h-5 fill-white text-emerald-600' : 'w-4 h-4 fill-white text-blue-600'
                  }`}
                />
              </div>

              {/* Selected Popup Card matching screenshot */}
              {isSelected && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-white/95 backdrop-blur-xs rounded-xl shadow-xl border border-slate-200/90 p-2 text-left z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="text-[11.5px] font-bold text-slate-900 leading-tight">
                    {selectedLoc.name}
                  </div>
                  <div className="text-[10.5px] text-slate-600 mt-0.5 font-medium">
                    {selectedLoc.conversions} conversions
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 mt-0.5">
                    <ArrowUp className="w-2.5 h-2.5 stroke-[3]" />
                    <span>+{selectedLoc.trend}%</span>
                  </div>

                  {/* Tiny arrow pointing to pin */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
