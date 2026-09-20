'use client';

import { useState, useEffect, useRef } from 'react';
import { Map, Plus, Minus, RotateCcw, Globe2 } from 'lucide-react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import type { OverviewLocationMapItem } from '@/modules/overview/overview-service';

export type MapScope = 'world' | 'us' | 'india';

export interface LocationPerformanceMapProps {
  locations?: OverviewLocationMapItem[] | undefined;
}

const SCOPE_CONFIG: Record<MapScope, { center: [number, number]; zoom: number; label: string }> = {
  world: { center: [20, 15], zoom: 2, label: 'Full World View' },
  us: { center: [39.7392, -104.9903], zoom: 10, label: 'Denver Metro (USA)' },
  india: { center: [12.35, 79.18], zoom: 7, label: 'Tamil Nadu (India)' },
};

export function LocationPerformanceMap({ locations = [] }: LocationPerformanceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);

  const [scope, setScope] = useState<MapScope>('us');
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [activeLocationId, setActiveLocationId] = useState<string>(locations[0]?.id || '');
  const activeLocation = locations.find((l) => l.id === activeLocationId) || locations[0];

  // Country counts & aggregates
  const usLocations = locations.filter((l) => l.region === 'us');
  const indiaLocations = locations.filter((l) => l.region === 'india');
  const usConversions = usLocations.reduce((acc, l) => acc + l.conversions, 0);
  const indiaConversions = indiaLocations.reduce((acc, l) => acc + l.conversions, 0);
  const totalConversions = usConversions + indiaConversions;

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current || mapInstanceRef.current) return;

      const L = await import('leaflet');
      if (!isMounted || !containerRef.current) return;

      // Determine initial center & zoom based on provided locations
      let initialCenter = SCOPE_CONFIG['us'].center;
      let initialZoom = SCOPE_CONFIG['us'].zoom;

      if (locations.length > 0) {
        const first = locations[0]!;
        initialCenter = [first.lat, first.lng];
        initialZoom = first.region === 'us' ? 10 : first.region === 'india' ? 7 : 6;
      }

      // Initialize Leaflet Map
      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        minZoom: 2,
        maxZoom: 16,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      });

      mapInstanceRef.current = map;

      // Add CartoDB Voyager Tile Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Track zoom level changes
      map.on('zoomend', () => {
        if (isMounted) {
          const z = map.getZoom();
          setCurrentZoom(z);
          if (z <= 3) {
            setScope('world');
          } else {
            const center = map.getCenter();
            if (center.lng > 60 && center.lng < 100) {
              setScope('india');
            } else if (center.lng < -50 && center.lng > -130) {
              setScope('us');
            }
          }
        }
      });

      // Add custom styled markers for each location
      const markers: LeafletMarker[] = [];

      locations.forEach((loc) => {
        const isHq = loc.isHq;

        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
            ${
              isHq
                ? `
              <span class="absolute -inset-2.5 rounded-full bg-emerald-400/40 animate-ping"></span>
              <span class="absolute -inset-5 rounded-full bg-emerald-300/20"></span>
              <div class="relative w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-emerald-400/60 transition-transform duration-150 group-hover:scale-115">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#059669"/></svg>
              </div>
            `
                : `
              <div class="relative w-6 h-6 rounded-full ${
                loc.region === 'india' ? 'bg-purple-600 ring-purple-300/60' : 'bg-blue-600 ring-blue-300/60'
              } text-white flex items-center justify-center shadow-md border-2 border-white ring-2 transition-transform duration-150 group-hover:scale-115">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="currentColor"/></svg>
              </div>
            `
            }
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-location-pin',
          html: markerHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        const popupHtml = `
          <div class="p-3 bg-white rounded-xl min-w-[195px] font-sans text-slate-900 border border-slate-100 shadow-xl">
            <div class="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-slate-100">
              <div class="font-bold text-[12px] text-slate-900 leading-snug">${loc.name}</div>
              <span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">${loc.flag} ${loc.countryCode}</span>
            </div>
            <div class="space-y-1.5 text-[11px]">
              <div class="flex items-center justify-between text-slate-600">
                <span>Conversions:</span>
                <span class="font-bold text-slate-900">${loc.conversions.toLocaleString()} (${loc.rate})</span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span>Monthly Visitors:</span>
                <span class="font-medium text-slate-800">${loc.users.toLocaleString()}</span>
              </div>
              <div class="flex items-center justify-between pt-1 border-t border-slate-50 text-[10px] font-bold text-emerald-600">
                <span>Visibility Growth:</span>
                <span>+${loc.trend}%</span>
              </div>
            </div>
          </div>
        `;

        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(map);

        marker.bindPopup(popupHtml, {
          closeButton: false,
          offset: [0, -12],
          className: 'custom-leaflet-popup',
        });

        marker.on('click', () => {
          setActiveLocationId(loc.id);
          if (map.getZoom() <= 3) {
            const targetScope = loc.region === 'india' ? 'india' : 'us';
            setScope(targetScope);
            map.flyTo([loc.lat, loc.lng], targetScope === 'us' ? 10 : 7, {
              duration: 1.2,
            });
          }
        });

        markers.push(marker);

        if (loc.isHq) {
          setTimeout(() => {
            if (isMounted) {
              marker.openPopup();
            }
          }, 400);
        }
      });

      markersRef.current = markers;

      setTimeout(() => {
        if (isMounted && map) {
          map.invalidateSize();
          setIsReady(true);
        }
      }, 150);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations]);

  // Zoom handlers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleScopeChange = (targetScope: MapScope) => {
    setScope(targetScope);
    const config = SCOPE_CONFIG[targetScope];
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(config.center, config.zoom, {
        duration: 1.2,
      });

      if (targetScope === 'india') {
        const indiaLoc = locations.find((l) => l.region === 'india');
        if (indiaLoc) {
          setActiveLocationId(indiaLoc.id);
          const idx = locations.findIndex((l) => l.id === indiaLoc.id);
          markersRef.current[idx]?.openPopup();
        }
      } else if (targetScope === 'us') {
        const usLoc = locations.find((l) => l.region === 'us');
        if (usLoc) {
          setActiveLocationId(usLoc.id);
          const idx = locations.findIndex((l) => l.id === usLoc.id);
          markersRef.current[idx]?.openPopup();
        }
      }
    }
  };

  const handleReset = () => {
    handleScopeChange('us');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      {/* Header with Title and Scope Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
            Location Performance Map.
            <span className="font-normal text-slate-500 text-[11.5px] ml-1.5 hidden md:inline">
              See how your locations perform across your service area & global network
            </span>
          </h3>
        </div>

        {/* Scope selector pills with Country Counts */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 self-end sm:self-auto">
          {/* Full World Pill */}
          <button
            type="button"
            onClick={() => handleScopeChange('world')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              scope === 'world'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe2 className="w-3 h-3" />
            <span>World</span>
            <span
              className={`text-[9.5px] px-1 py-0.2 rounded-full font-bold ${
                scope === 'world' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {locations.length}
            </span>
          </button>

          {/* USA Pill with Count */}
          <button
            type="button"
            onClick={() => handleScopeChange('us')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              scope === 'us'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🇺🇸</span>
            <span>USA</span>
            <span
              className={`text-[9.5px] px-1 py-0.2 rounded-full font-bold ${
                scope === 'us' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {usLocations.length}
            </span>
          </button>

          {/* India Pill with Count */}
          <button
            type="button"
            onClick={() => handleScopeChange('india')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              scope === 'india'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🇮🇳</span>
            <span>India</span>
            <span
              className={`text-[9.5px] px-1 py-0.2 rounded-full font-bold ${
                scope === 'india' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {indiaLocations.length}
            </span>
          </button>
        </div>
      </div>

      {/* Global & Country Aggregate Stats Bar */}
      <div className="grid grid-cols-3 gap-2 mb-3 bg-slate-50/80 border border-slate-200/70 rounded-xl p-2 text-[11px]">
        {/* All Locations */}
        <div
          onClick={() => handleScopeChange('world')}
          className="flex items-center gap-2 cursor-pointer hover:bg-white/80 p-1 rounded-lg transition-colors"
        >
          <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px]">
            🌍
          </div>
          <div>
            <div className="text-slate-500 text-[10px] font-medium leading-tight">Global Network</div>
            <div className="font-bold text-slate-900 leading-tight">
              {locations.length} Locations <span className="text-slate-400 font-normal">({totalConversions} conv)</span>
            </div>
          </div>
        </div>

        {/* United States */}
        <div
          onClick={() => handleScopeChange('us')}
          className="flex items-center gap-2 cursor-pointer hover:bg-white/80 p-1 rounded-lg transition-colors"
        >
          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px]">
            🇺🇸
          </div>
          <div>
            <div className="text-slate-500 text-[10px] font-medium leading-tight">America (US)</div>
            <div className="font-bold text-slate-900 leading-tight">
              {usLocations.length} Locations <span className="text-slate-400 font-normal">({usConversions} conv)</span>
            </div>
          </div>
        </div>

        {/* India */}
        <div
          onClick={() => handleScopeChange('india')}
          className="flex items-center gap-2 cursor-pointer hover:bg-white/80 p-1 rounded-lg transition-colors"
        >
          <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-[10px]">
            🇮🇳
          </div>
          <div>
            <div className="text-slate-500 text-[10px] font-medium leading-tight">India (IN)</div>
            <div className="font-bold text-slate-900 leading-tight">
              {indiaLocations.length} Locations <span className="text-slate-400 font-normal">({indiaConversions} conv)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Map Canvas Container */}
      <div className="relative w-full h-[270px] rounded-xl overflow-hidden border border-slate-200/80 bg-[#E8ECEF] select-none">
        {/* Floating Google Maps-Style Zoom & Reset Controls */}
        <div className="absolute top-2.5 right-2.5 z-[1000] flex flex-col bg-white/95 backdrop-blur-xs rounded-lg shadow-md border border-slate-200/90 overflow-hidden divide-y divide-slate-100">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom In"
            title="Zoom In (+)"
            className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom Out"
            title="Zoom Out (-)"
            className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Minus className="w-4 h-4 stroke-[2.2]" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset View"
            title="Reset to USA"
            className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* Current View Scale Badge */}
        <div className="absolute bottom-2 left-2.5 z-[1000] px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs border border-slate-200/90 text-[10.5px] font-bold text-slate-700 shadow-xs flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{SCOPE_CONFIG[scope].label}</span>
          <span className="text-slate-400 font-normal">|</span>
          <span className="text-slate-500 font-medium">Zoom {currentZoom}x</span>
          {activeLocation && (
            <>
              <span className="text-slate-300 font-normal">•</span>
              <span className="text-indigo-600 font-semibold">{activeLocation.flag} {activeLocation.name}</span>
            </>
          )}
        </div>

        {/* Leaflet Mount Element */}
        <div ref={containerRef} className="w-full h-full z-10" />

        {/* Empty state overlay when client has 0 locations */}
        {locations.length === 0 && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-2xs text-slate-600 text-xs p-4 text-center">
            <Globe2 className="w-8 h-8 stroke-1 text-slate-400 mb-2" />
            <span className="font-bold text-slate-800 text-[13px]">No Store Locations Added Yet</span>
            <span className="text-slate-500 mt-1 max-w-sm">
              Add your store locations in the Storefront Directory to plot real-time patient reach and conversion telemetry.
            </span>
          </div>
        )}

        {/* Loading / Ready placeholder */}
        {!isReady && locations.length > 0 && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-100/90 text-slate-400 text-xs font-medium">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
            <span>Loading World Performance Map...</span>
          </div>
        )}
      </div>

      {/* Global CSS overrides for Leaflet Popups and Map Canvas */}
      <style jsx global>{`
        .custom-location-pin {
          background: transparent !important;
          border: none !important;
        }
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08) !important;
          border: 1px solid #E2E8F0 !important;
          overflow: hidden !important;
        }
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: 1.4 !important;
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: white !important;
        }
        .leaflet-container {
          font-family: inherit !important;
          background-color: #E8ECEF !important;
        }
      `}</style>
    </div>
  );
}
