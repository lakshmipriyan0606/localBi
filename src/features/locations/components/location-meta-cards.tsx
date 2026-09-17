import { MapPin, Building2 } from 'lucide-react';

interface LocationMetaCardsProps {
  tenantName: string;
  location: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    timezone: string;
    brandName: string;
    storeCode: string | null;
  };
  mapping: {
    externalResourceId: string | null;
    verified: boolean;
  };
}

export function LocationMetaCards({ tenantName, location, mapping }: LocationMetaCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Physical Address Card */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <MapPin className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Physical Storefront Details</h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Street Address</span>
            <span className="font-medium text-slate-900 text-right">{location.addressLine1}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">City / Locality</span>
            <span className="font-medium text-slate-900">{location.city}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">State / Province</span>
            <span className="font-medium text-slate-900">{location.state}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Postal Code</span>
            <span className="font-mono font-medium text-slate-900">{location.postalCode}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Country ISO Code</span>
            <span className="font-mono font-semibold text-slate-900">{location.country}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">IANA Timezone</span>
            <span className="font-mono text-slate-700">{location.timezone}</span>
          </div>
        </div>
      </div>

      {/* Integration & Scope Context */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Building2 className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">Brand & Tenant Hierarchy</h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Client Workspace</span>
            <span className="font-semibold text-slate-900">{tenantName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Parent Brand</span>
            <span className="font-semibold text-slate-900">{location.brandName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Internal Store Code</span>
            <span className="font-mono font-bold text-slate-800">{location.storeCode || '—'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Google External Resource</span>
            <span className="font-mono text-slate-600 truncate max-w-[200px]">
              {mapping.externalResourceId || 'Not linked'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Voice of Merchant</span>
            <span className={`font-semibold ${mapping.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
              {mapping.verified ? 'Verified Active' : 'Pending Verification'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
