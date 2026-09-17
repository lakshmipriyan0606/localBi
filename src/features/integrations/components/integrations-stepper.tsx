import { Layers, Check } from 'lucide-react';

export type SetupStage = 1 | 2 | 3 | 4 | 5 | 6;

interface IntegrationsStepperProps {
  activeStage: SetupStage;
  onSelectStage: (stage: SetupStage) => void;
  stages: Array<{ id: SetupStage; label: string; status: 'completed' | 'current' | 'upcoming' }>;
}

export function IntegrationsStepper({ activeStage, onSelectStage, stages }: IntegrationsStepperProps) {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Google Integration Journey
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Stage {activeStage} of 6
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {stages.map((stage) => {
          const isSelected = activeStage === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage(stage.id)}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
                  : stage.status === 'completed'
                  ? 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Step {stage.id}
                </span>
                {stage.status === 'completed' ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : isSelected ? (
                  <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                ) : null}
              </div>
              <p className="text-xs font-semibold text-slate-900 truncate">
                {stage.label.replace(/^\d+\.\s*/, '')}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
