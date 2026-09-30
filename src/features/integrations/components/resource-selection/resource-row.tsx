import { Check } from "lucide-react";
import { GoogleProductIcon, GoogleProduct } from "../google-product-icon";
import { IntegrationStatusBadge, IntegrationStatus } from "../integration-status-badge";
import { cn } from "@/lib/cn";

export interface ResourceRowProps {
  id: string;
  externalResourceId: string;
  product: GoogleProduct;
  name: string;
  metadata: string;
  status: IntegrationStatus;
  typeBadge: string;
  thumbnailUrl?: string;
  isSelected: boolean;
  onToggle: (id: string, selected: boolean) => void;
  onViewDetails?: () => void;
  // Specific for GBP
  requiresLocationMapping?: boolean;
  locationMappingValue?: string;
  locationOptions?: Array<{ id: string; name: string }>;
  onLocationMap?: (id: string, locationId: string) => void;
}

export function ResourceRow({
  id,
  product,
  name,
  metadata,
  status,
  typeBadge,
  thumbnailUrl,
  isSelected,
  onToggle,
  onViewDetails,
  requiresLocationMapping,
  locationMappingValue,
  locationOptions,
  onLocationMap,
}: ResourceRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition-colors border-b border-slate-100 last:border-b-0 group",
        isSelected ? "bg-indigo-50/30" : "hover:bg-slate-50/50"
      )}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggle(id, !isSelected)}
          className={cn(
            "w-5 h-5 mt-1 rounded border flex items-center justify-center transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
            isSelected
              ? "bg-[#5138EE] border-[#5138EE] text-white"
              : "bg-white border-slate-300 text-transparent hover:border-indigo-400"
          )}
          aria-checked={isSelected}
          role="checkbox"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        {/* Resource Info */}
        <div className="flex gap-3 min-w-0 items-center">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
          ) : (
            <GoogleProductIcon product={product} size="lg" className="shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-[14px] font-bold text-slate-900 truncate">{name}</span>
            <span className="text-[12px] text-slate-500 truncate">{metadata}</span>
            
            {requiresLocationMapping && isSelected && onLocationMap && locationOptions && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600">Maps to:</span>
                <select
                  value={locationMappingValue || ""}
                  onChange={(e) => onLocationMap(id, e.target.value)}
                  className={cn(
                    "text-xs border rounded-md px-2 py-1 bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
                    !locationMappingValue ? "border-amber-300 ring-1 ring-amber-300" : "border-slate-200"
                  )}
                >
                  <option value="" disabled>Select Location</option>
                  {locationOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
                {!locationMappingValue && (
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 rounded-full border border-amber-200">Required</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 justify-end shrink-0 pl-9 sm:pl-0">
        <IntegrationStatusBadge status={status} />
        
        <span className="text-[12px] text-slate-500 font-medium w-32 truncate text-right hidden lg:block">
          {typeBadge}
        </span>
        
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}
