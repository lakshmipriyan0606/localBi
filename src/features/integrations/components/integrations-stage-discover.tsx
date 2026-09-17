import { MapPin, Globe, RefreshCw, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';

interface StageDiscoverProps {
  gbpResources: Array<{ id: string; resourceName: string; externalResourceId: string }>;
  gscResources: Array<{ id: string; resourceName: string; externalResourceId: string }>;
  isRefreshing: boolean;
  canManage: boolean;
  onRefresh: () => void;
  onContinue: () => void;
}

export function IntegrationsStageDiscover({
  gbpResources,
  gscResources,
  isRefreshing,
  canManage,
  onRefresh,
  onContinue,
}: StageDiscoverProps) {
  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900">Stage 3: Discovered Google Resources</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Review verified storefront locations and Search Console domains discovered under your Google account.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing || !canManage} className="text-xs font-semibold">
          <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Discovery</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {isRefreshing ? (
          <AnalyticsLoader variant="hero" message="Querying Google Business Profile and Search Console APIs..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GBP Locations */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600" />
                  <span>Business Profile Locations ({gbpResources.length})</span>
                </span>
              </div>
              {gbpResources.length === 0 ? (
                <div className="py-6 text-center text-slate-400 space-y-1">
                  <Search className="h-4 w-4 mx-auto text-slate-300" />
                  <p>No GBP locations found</p>
                  <p className="text-[11px] text-slate-400">Verify your Google account has manager/owner access.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {gbpResources.map((res) => (
                    <div key={res.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{res.resourceName}</span>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Verified</Badge>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{res.externalResourceId}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GSC Properties */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Search Console Properties ({gscResources.length})</span>
                </span>
              </div>
              {gscResources.length === 0 ? (
                <div className="py-6 text-center text-slate-400 space-y-1">
                  <Search className="h-4 w-4 mx-auto text-slate-300" />
                  <p>No GSC properties found</p>
                  <p className="text-[11px] text-slate-400">Ensure Search Console properties are verified for this account.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {gscResources.map((res) => (
                    <div key={res.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-slate-900">{res.resourceName}</span>
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                          {res.externalResourceId.startsWith('sc-domain:') ? 'Domain' : 'URL Prefix'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={onContinue} className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
            <span>Proceed to Resource Mapping</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
