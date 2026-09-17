import { MapPin, Globe, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StageMapProps {
  locations: Array<{ id: string; name: string; storeCode: string | null; city: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  gbpResources: Array<{ id: string; resourceName: string; externalResourceId: string }>;
  gscResources: Array<{ id: string; resourceName: string; externalResourceId: string }>;
  internalMappings: Array<{ id: string; resourceName: string; externalResourceId: string; internalType: string }>;
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
  onUnmap,
  onContinue,
}: StageMapProps) {
  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-slate-900">Stage 4: Map Internal Resources to Google Assets</CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Explicitly bind local storefronts to Google Business Profiles and brands to Search Console domains.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-xs">
        {/* Location Form */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-teal-600" />
            <span>Map Storefront to Google Business Profile</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Internal Store Location</label>
              <select value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)} className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800">
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name} {loc.storeCode ? `(${loc.storeCode})` : ''} — {loc.city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Google Business Profile</label>
              <select value={selectedGbpResourceId} onChange={(e) => setSelectedGbpResourceId(e.target.value)} className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800">
                <option value="">Select Google location…</option>
                {gbpResources.map((res) => (
                  <option key={res.id} value={res.externalResourceId}>{res.resourceName} ({res.externalResourceId})</option>
                ))}
              </select>
            </div>
          </div>
          {bestMatch && !selectedGbpResourceId && (
            <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-lg flex items-center justify-between text-teal-800">
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-teal-600" /> Suggested match: {bestMatch.reason}</span>
              <button type="button" onClick={() => { const target = gbpResources.find((r) => r.id === bestMatch.resourceId); if (target) setSelectedGbpResourceId(target.externalResourceId); }} className="text-xs font-semibold text-teal-700 hover:underline">Apply</button>
            </div>
          )}
          <div className="flex justify-end">
            <Button size="sm" onClick={onMapLocation} disabled={!selectedGbpResourceId || !canManage} className="bg-teal-700 hover:bg-teal-800 text-white font-semibold">Save Location Mapping</Button>
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
              <select value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)} className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800">
                {brands.map((b) => (<option key={b.id} value={b.id}>{b.name} ({b.slug})</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Search Console Property</label>
              <select value={selectedGscResourceId} onChange={(e) => setSelectedGscResourceId(e.target.value)} className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800">
                <option value="">Select Search Console property…</option>
                {gscResources.map((res) => (<option key={res.id} value={res.externalResourceId}>{res.resourceName}</option>))}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={onMapGsc} disabled={!selectedGscResourceId || !canManage} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Save Property Mapping</Button>
          </div>
        </div>

        {/* Active Mappings */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">Active Mappings ({internalMappings.length})</h3>
          {internalMappings.length === 0 ? (
            <p className="text-slate-400 py-4 text-center">No active resource mappings yet.</p>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {internalMappings.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge className={m.internalType === 'LOCATION' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200'}>{m.internalType}</Badge>
                    <div><span className="font-semibold text-slate-900">{m.resourceName}</span><span className="font-mono text-[11px] text-slate-400 block">{m.externalResourceId}</span></div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onUnmap(m.id)} disabled={!canManage} className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50">Remove</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={onContinue} className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
            <span>Proceed to Ingestion & Sync</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
