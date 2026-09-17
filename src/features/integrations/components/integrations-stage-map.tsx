import { useMemo } from 'react';
import { MapPin, Globe, ChevronRight, Sparkles, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StageMapProps {
  locations: Array<{
    id: string;
    brandId?: string;
    name: string;
    storeCode: string | null;
    city: string;
  }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  gbpResources: Array<{
    id: string;
    resourceName: string;
    externalResourceId: string;
    accountName?: string;
  }>;
  gscResources: Array<{ id: string; resourceName: string; externalResourceId: string }>;
  internalMappings: Array<{
    id: string;
    resourceName: string;
    externalResourceId: string;
    internalType: string;
    internalId?: string;
  }>;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  selectedGbpResourceId: string;
  setSelectedGbpResourceId: (id: string) => void;
  selectedBrandId: string;
  setSelectedBrandId: (id: string) => void;
  selectedGscResourceId: string;
  setSelectedGscResourceId: (id: string) => void;
  bestMatch?: { resourceId: string; reason: string } | undefined;
  canManage: boolean;
  onMapLocation: () => void;
  onMapGsc: () => void;
  onAutoMapBrand?: (brandId: string) => Promise<void>;
  isAutoMapping?: boolean;
  onUnmap: (mappingId: string) => void;
  onContinue: () => void;
}

export function IntegrationsStageMap({
  locations,
  brands,
  gbpResources,
  gscResources,
  internalMappings,
  selectedLocationId,
  setSelectedLocationId,
  selectedGbpResourceId,
  setSelectedGbpResourceId,
  selectedBrandId,
  setSelectedBrandId,
  selectedGscResourceId,
  setSelectedGscResourceId,
  bestMatch,
  canManage,
  onMapLocation,
  onMapGsc,
  onAutoMapBrand,
  isAutoMapping = false,
  onUnmap,
  onContinue,
}: StageMapProps) {
  const activeBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];

  // Filter internal locations to the active brand
  const brandLocations = useMemo(() => {
    if (!activeBrand) return locations;
    return locations.filter((loc) => !loc.brandId || loc.brandId === activeBrand.id);
  }, [locations, activeBrand]);

  // Identify matching GBP resources for the active brand
  const { matchingGbp, otherGbp } = useMemo(() => {
    if (!activeBrand) return { matchingGbp: gbpResources, otherGbp: [] };
    const brandKeywords = activeBrand.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const matching: typeof gbpResources = [];
    const others: typeof gbpResources = [];

    for (const res of gbpResources) {
      const text = `${res.resourceName} ${res.accountName || ''}`.toLowerCase();
      const isMatch = brandKeywords.some((k) => text.includes(k));
      if (isMatch) {
        matching.push(res);
      } else {
        others.push(res);
      }
    }

    return { matchingGbp: matching, otherGbp: others };
  }, [gbpResources, activeBrand]);

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-slate-900">
          Stage 4: Map Internal Resources to Google Assets
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Explicitly bind local storefronts to Google Business Profiles and brands to Search Console domains.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-xs">
        {/* Brand-Wise Switcher & Auto-Map Hero */}
        <div className="p-4 bg-gradient-to-r from-indigo-50/60 via-slate-50 to-teal-50/60 rounded-xl border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Select Client / Brand to Configure</h3>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Managing multiple clients? Choose a brand to isolate its locations and auto-connect its Google profiles.
              </p>
            </div>

            {onAutoMapBrand && activeBrand && (
              <Button
                size="sm"
                onClick={() => onAutoMapBrand(activeBrand.id)}
                disabled={isAutoMapping || !canManage}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isAutoMapping ? 'Auto-mapping…' : `⚡ Auto-Map All Locations for ${activeBrand.name}`}</span>
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {brands.map((brand) => {
              const isSelected = brand.id === selectedBrandId;
              const brandLocCount = locations.filter((l) => l.brandId === brand.id).length;
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => {
                    setSelectedBrandId(brand.id);
                    const firstLoc = locations.find((l) => l.brandId === brand.id);
                    if (firstLoc) setSelectedLocationId(firstLoc.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{brand.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {brandLocCount} {brandLocCount === 1 ? 'store' : 'stores'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location Form */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-teal-600" />
            <span>Map Storefront to Google Business Profile for {activeBrand?.name || 'Selected Brand'}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Internal Store Location ({activeBrand?.name || 'Brand'})
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800"
              >
                {brandLocations.length === 0 ? (
                  <option value="">No locations found under {activeBrand?.name || 'this brand'}</option>
                ) : (
                  brandLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.storeCode ? `(${loc.storeCode})` : ''} — {loc.city}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Google Business Profile</label>
              <select
                value={selectedGbpResourceId}
                onChange={(e) => setSelectedGbpResourceId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800"
              >
                <option value="">Select Google location…</option>
                {matchingGbp.length > 0 && (
                  <optgroup label={`✨ Matching ${activeBrand?.name || 'Active Brand'}`}>
                    {matchingGbp.map((res) => (
                      <option key={res.id} value={res.externalResourceId}>
                        {res.resourceName} ({res.externalResourceId})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="All Discovered Google Profiles">
                  {(matchingGbp.length > 0 ? otherGbp : gbpResources).map((res) => (
                    <option key={res.id} value={res.externalResourceId}>
                      {res.resourceName} ({res.externalResourceId})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
          {bestMatch && !selectedGbpResourceId && (
            <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-lg flex items-center justify-between text-teal-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" /> Suggested match: {bestMatch.reason}
              </span>
              <button
                type="button"
                onClick={() => {
                  const target = gbpResources.find((r) => r.id === bestMatch.resourceId);
                  if (target) setSelectedGbpResourceId(target.externalResourceId);
                }}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                Apply
              </button>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={onMapLocation}
              disabled={!selectedGbpResourceId || !selectedLocationId || !canManage}
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
            >
              Save Location Mapping
            </Button>
          </div>
        </div>

        {/* Brand Form */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-indigo-600" />
            <span>Map Brand to Search Console Property</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Internal Brand</label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.slug})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Search Console Property</label>
              <select
                value={selectedGscResourceId}
                onChange={(e) => setSelectedGscResourceId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800"
              >
                <option value="">Select Search Console property…</option>
                {gscResources.map((res) => (
                  <option key={res.id} value={res.externalResourceId}>
                    {res.resourceName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={onMapGsc}
              disabled={!selectedGscResourceId || !canManage}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Save Property Mapping
            </Button>
          </div>
        </div>

        {/* Active Mappings */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">Active Mappings ({internalMappings.length})</h3>
          {internalMappings.length === 0 ? (
            <p className="text-slate-400 py-4 text-center">No active resource mappings yet.</p>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {internalMappings.map((m) => {
                const loc = locations.find((l) => l.id === m.internalId);
                const brand = loc
                  ? brands.find((b) => b.id === loc.brandId)
                  : brands.find((b) => b.id === m.internalId);
                return (
                  <div key={m.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          m.internalType === 'LOCATION'
                            ? 'bg-teal-100 text-teal-800 border-teal-200'
                            : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                        }
                      >
                        {m.internalType}
                      </Badge>
                      {brand && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {brand.name}
                        </span>
                      )}
                      <div>
                        <span className="font-semibold text-slate-900">{m.resourceName}</span>
                        {loc && <span className="text-[11px] text-slate-500 block">Store: {loc.name}</span>}
                        <span className="font-mono text-[11px] text-slate-400 block">{m.externalResourceId}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUnmap(m.id)}
                      disabled={!canManage}
                      className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={onContinue}
            className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <span>Proceed to Ingestion & Sync</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
