
import { GoogleAccountCard } from "../resource-selection/google-account-card";
import { GoogleProductIcon, GoogleProduct } from "../google-product-icon";
import { IntegrationStatusBadge } from "../integration-status-badge";
import { ResourceSelection } from "./select-google-resources-step";
import { ShieldCheck, RefreshCw, BarChart3, Settings, Zap } from "lucide-react";

interface ReviewGoogleResourcesStepProps {
  email: string;
  draftSelections: Record<string, ResourceSelection>;
  resources: any[];
  locationOptions: Array<{ id: string; name: string }>;
  onChangeAccount: () => void;
  onEditSelection: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

export function ReviewGoogleResourcesStep({
  email,
  draftSelections,
  resources,
  locationOptions,
  onChangeAccount,
  onEditSelection,
  onSync,
  isSyncing,
}: ReviewGoogleResourcesStepProps) {

  const selectedResourceIds = Object.keys(draftSelections).filter(id => draftSelections[id]?.selected);
  const selectedResources = resources.filter(r => selectedResourceIds.includes(r.id));
  
  const gsc = selectedResources.filter(r => draftSelections[r.id]?.resourceType === 'GSC');
  const gbp = selectedResources.filter(r => draftSelections[r.id]?.resourceType === 'GBP');
  const ga4 = selectedResources.filter(r => draftSelections[r.id]?.resourceType === 'GA4');

  return (
    <div className="w-full max-w-6xl mx-auto pb-24">
      <GoogleAccountCard email={email} onChangeAccount={onChangeAccount} />

      <div className="flex flex-col lg:flex-row gap-6 items-start mt-2">
        {/* Main Content - Selected Resources */}
        <div className="flex-1 w-full min-w-0 bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                Selected Resources ({selectedResources.length})
              </h3>
              <p className="text-[13px] text-slate-500 font-medium">
                Review your selected Google resources before connecting to LocalBi.
              </p>
            </div>
            <button
              onClick={onEditSelection}
              className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/70 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
            >
              Edit Selection
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4 bg-slate-50/30">
            {selectedResources.length === 0 && (
              <div className="p-8 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No resources selected.</p>
                <button onClick={onEditSelection} className="mt-4 text-indigo-600 font-bold hover:underline">Go back and select some.</button>
              </div>
            )}

            {/* Render groups */}
            {[
              { list: gsc, title: "Google Search Console", product: "GSC" as GoogleProduct },
              { list: gbp, title: "Google Business Profile", product: "GBP" as GoogleProduct },
              { list: ga4, title: "Google Analytics 4", product: "GA4" as GoogleProduct }
            ].map(group => {
              if (group.list.length === 0) return null;
              return (
                <div key={group.product} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                    <GoogleProductIcon product={group.product} size="sm" />
                    <h4 className="font-bold text-[14px] text-slate-900">{group.title}</h4>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.list.map(res => {
                      const draft = draftSelections[res.id];
                      const locName = draft?.target?.locationId ? locationOptions.find(l => l.id === draft.target.locationId)?.name : null;
                      return (
                        <div key={res.id} className="p-4 flex items-center justify-between gap-4">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[15px] font-bold text-slate-900 truncate">
                              {group.product === 'GSC' ? res.externalResourceId : res.resourceName}
                            </span>
                            <span className="text-[13px] text-slate-500 truncate mt-0.5">
                              {group.product === 'GSC' ? `Domain property` : group.product === 'GBP' ? res.accountName : `G-${res.externalResourceId.split('/').pop()}`}
                            </span>
                            
                            {group.product === 'GBP' && locName && (
                              <div className="mt-2 flex items-center gap-1.5 text-[12px]">
                                <span className="font-semibold text-slate-400">Maps to:</span>
                                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">{locName}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 shrink-0 pl-4">
                            <IntegrationStatusBadge status="VERIFIED" />
                            <button onClick={onEditSelection} className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 hidden sm:flex">
                              View Details
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar - What happens next */}
        <div className="w-full lg:w-[360px] shrink-0 bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm flex flex-col">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h4 className="text-[18px] font-extrabold text-slate-900 mb-2 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-600 rounded-lg p-1">🚀</span> What happens next?
            </h4>
            <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
              After you connect, LocalBi will securely sync your data and make it available in your dashboards.
            </p>
          </div>

          <div className="flex flex-col gap-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-slate-900">Secure OAuth</span>
                <span className="text-[13px] text-slate-500 leading-snug mt-1">We'll securely connect your selected resources using Google OAuth.</span>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-slate-900">Automatic sync</span>
                <span className="text-[13px] text-slate-500 leading-snug mt-1">Your data will start syncing automatically in the background.</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-slate-900">Reports ready</span>
                <span className="text-[13px] text-slate-500 leading-snug mt-1">You can view live data on the Google Search Console, Business Profile, and Analytics dashboards.</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-slate-900">Manage later</span>
                <span className="text-[13px] text-slate-500 leading-snug mt-1">You can always manage or disconnect these resources from the Connections page.</span>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="w-full py-4 bg-[#5138EE] hover:bg-[#432ee0] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-extrabold text-[15px] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-white stroke-none" />
                  Connect & Start Syncing →
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-1.5 mt-4 text-[12px] text-slate-400 font-medium px-4 text-center">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Your data is secure. We use Google OAuth and never store your account credentials.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
