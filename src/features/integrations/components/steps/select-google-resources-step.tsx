import { useMemo } from "react";
import { GoogleAccountCard } from "../resource-selection/google-account-card";
import { ResourceSection } from "../resource-selection/resource-section";
import { ResourceRow } from "../resource-selection/resource-row";
import { SelectionSummary } from "../resource-selection/selection-summary";
import { IntegrationStatus } from "../integration-status-badge";
import { ArrowLeft, Tag } from "lucide-react";
import { cn } from "@/lib/cn";

export type ResourceSelection = {
  resourceType: 'GSC' | 'GBP' | 'GA4';
  externalResourceId: string;
  selected: boolean;
  target: { brandId: string; locationId?: string };
};

interface SelectGoogleResourcesStepProps {
  email: string;
  gscResources: any[];
  gbpResources: any[];
  ga4Resources: any[];
  draftSelections: Record<string, ResourceSelection>;
  locationOptions: Array<{ id: string; name: string }>;
  brandOptions?: Array<{ id: string; name: string }>;
  activeBrand?: { id: string; name: string };
  onChangeAccount: () => void;
  onRefresh: () => void;
  onToggleSelection: (id: string, resourceType: 'GSC' | 'GBP' | 'GA4', targetBrandId: string) => void;
  onLocationMap: (id: string, locationId: string) => void;
  onBrandMap?: (id: string, brandId: string) => void;
  onSelectAll: (resourceType: 'GSC' | 'GBP' | 'GA4', selected: boolean, resources: any[], targetBrandId: string) => void;
  onBack: () => void;
  onContinue: () => void;
  defaultBrandId: string;
}

export function SelectGoogleResourcesStep({
  email,
  gscResources,
  gbpResources,
  ga4Resources,
  draftSelections,
  locationOptions,
  brandOptions = [],
  activeBrand,
  onChangeAccount,
  onRefresh,
  onToggleSelection,
  onLocationMap,
  onBrandMap,
  onSelectAll,
  onBack,
  onContinue,
  defaultBrandId,
}: SelectGoogleResourcesStepProps) {

  const selectedGscCount = gscResources.filter(r => draftSelections[r.id]?.selected).length;
  const selectedGbpCount = gbpResources.filter(r => draftSelections[r.id]?.selected).length;
  const selectedGa4Count = ga4Resources.filter(r => draftSelections[r.id]?.selected).length;
  const totalSelected = selectedGscCount + selectedGbpCount + selectedGa4Count;

  // Validation: are all selected GBP resources mapped to a location?
  const isValid = useMemo(() => {
    return gbpResources.every(r => {
      const draft = draftSelections[r.id];
      if (!draft?.selected) return true;
      return !!draft.target.locationId;
    });
  }, [gbpResources, draftSelections]);

  const mapStatus = (res: any): IntegrationStatus => {
    // Basic status mapping, assuming verified if we can list it, but can be improved
    if (res.connectionAccess?.length > 0 && !res.connectionAccess[0].canAccess) return "ERROR";
    return "VERIFIED";
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col pb-24">
      <GoogleAccountCard email={email} onChangeAccount={onChangeAccount} />

      {activeBrand && (
        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-indigo-600 shrink-0" />
            <span className="text-xs font-medium text-slate-700">Connecting resources for Brand:</span>
            <span className="text-xs font-bold text-indigo-900 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
              {activeBrand.name}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Selected resources will be assigned to this brand by default
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start mt-2">
        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-0">
          
          <ResourceSection
            product="GSC"
            title="Google Search Console"
            totalCount={gscResources.length}
            selectedCount={selectedGscCount}
            unitLabel="websites"
            onSelectAll={(selected) => onSelectAll('GSC', selected, gscResources, defaultBrandId)}
          >
            {gscResources.map(res => (
              <ResourceRow
                key={res.id}
                id={res.id}
                externalResourceId={res.externalResourceId}
                product="GSC"
                name={res.externalResourceId}
                metadata={`Primary website · ${res.externalResourceId.replace(/^https?:\/\//, '').replace(/\/$/, '')}`}
                status={mapStatus(res)}
                typeBadge="Domain property"
                isSelected={!!draftSelections[res.id]?.selected}
                onToggle={(id) => onToggleSelection(id, 'GSC', defaultBrandId)}
                onViewDetails={() => {}}
                brandOptions={brandOptions}
                brandMappingValue={draftSelections[res.id]?.target?.brandId || defaultBrandId}
                onBrandMap={onBrandMap}
              />
            ))}
          </ResourceSection>

          <ResourceSection
            product="GBP"
            title="Google Business Profile"
            totalCount={gbpResources.length}
            selectedCount={selectedGbpCount}
            unitLabel="store locations"
            onSelectAll={(selected) => onSelectAll('GBP', selected, gbpResources, defaultBrandId)}
          >
            {gbpResources.map(res => (
              <ResourceRow
                key={res.id}
                id={res.id}
                externalResourceId={res.externalResourceId}
                product="GBP"
                name={res.resourceName}
                metadata={res.accountName}
                status={mapStatus(res)}
                typeBadge={`Store ID: ${res.externalResourceId}`}
                isSelected={!!draftSelections[res.id]?.selected}
                onToggle={(id) => onToggleSelection(id, 'GBP', defaultBrandId)}
                onViewDetails={() => {}}
                brandOptions={brandOptions}
                brandMappingValue={draftSelections[res.id]?.target?.brandId || defaultBrandId}
                onBrandMap={onBrandMap}
                requiresLocationMapping={true}
                locationOptions={locationOptions}
                locationMappingValue={draftSelections[res.id]?.target?.locationId || ''}
                onLocationMap={(id, locId) => onLocationMap(id, locId)}
              />
            ))}
          </ResourceSection>

          <ResourceSection
            product="GA4"
            title="Google Analytics 4"
            totalCount={ga4Resources.length}
            selectedCount={selectedGa4Count}
            unitLabel="properties"
            onSelectAll={(selected) => onSelectAll('GA4', selected, ga4Resources, defaultBrandId)}
          >
            {ga4Resources.map(res => (
              <ResourceRow
                key={res.id}
                id={res.id}
                externalResourceId={res.externalResourceId}
                product="GA4"
                name={res.resourceName}
                metadata={res.accountName}
                status={mapStatus(res)}
                typeBadge="Web property"
                isSelected={!!draftSelections[res.id]?.selected}
                onToggle={(id) => onToggleSelection(id, 'GA4', defaultBrandId)}
                onViewDetails={() => {}}
                brandOptions={brandOptions}
                brandMappingValue={draftSelections[res.id]?.target?.brandId || defaultBrandId}
                onBrandMap={onBrandMap}
              />
            ))}
          </ResourceSection>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-[320px] shrink-0">
          <SelectionSummary
            gscCount={selectedGscCount}
            gbpCount={selectedGbpCount}
            ga4Count={selectedGa4Count}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 p-4 px-6 flex justify-between items-center z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] lg:left-[240px]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[14px] font-bold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2 hover:bg-slate-50 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Step 1
        </button>
        
        <div className="flex items-center gap-6">
          <span className="text-[13px] font-bold text-slate-500 hidden sm:inline-block">
            {totalSelected} resources selected
          </span>
          <button
            onClick={onContinue}
            disabled={!isValid || totalSelected === 0}
            className={cn(
              "px-6 py-3 rounded-xl font-bold text-[14px] shadow-sm transition-all flex items-center gap-2",
              isValid && totalSelected > 0
                ? "bg-[#5138EE] hover:bg-[#432ee0] text-white hover:shadow-md"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            Continue to Review & Sync →
          </button>
        </div>
      </div>
    </div>
  );
}
