import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type IntegrationWizardStep = 1 | 2 | 3;

interface GoogleIntegrationStepperProps {
  activeStep: IntegrationWizardStep;
  onStepClick?: (step: IntegrationWizardStep) => void;
  canNavigate?: boolean;
}

export function GoogleIntegrationStepper({
  activeStep,
  onStepClick,
  canNavigate = false,
}: GoogleIntegrationStepperProps) {
  const steps: Array<{ step: IntegrationWizardStep; title: string; description: string }> = [
    {
      step: 1,
      title: "Google Account",
      description: "Connect your account",
    },
    {
      step: 2,
      title: "Link Website & Stores",
      description: "Select and link your resources",
    },
    {
      step: 3,
      title: "Review & Sync",
      description: "Ready to Connect",
    },
  ];

  return (
    <div className="flex items-center justify-between w-full max-w-3xl mx-auto mb-10 pt-4 pb-2">
      {steps.map((s, index) => {
        const isCompleted = activeStep > s.step;
        const isActive = activeStep === s.step;
        const isClickable = canNavigate && onStepClick;

        return (
          <React.Fragment key={s.step}>
            {/* Step Item */}
            <div
              className={cn(
                "flex items-center gap-3 relative z-10 bg-transparent select-none",
                isClickable && "cursor-pointer group"
              )}
              onClick={() => {
                if (isClickable) onStepClick(s.step);
              }}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all shadow-sm",
                  isCompleted
                    ? "bg-emerald-500 text-white group-hover:bg-emerald-600"
                    : isActive
                    ? "bg-[#5138EE] text-white ring-4 ring-indigo-100"
                    : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : s.step}
              </div>
              <div className="hidden sm:flex flex-col">
                <span
                  className={cn(
                    "text-sm font-bold",
                    isActive ? "text-slate-900" : isCompleted ? "text-slate-700" : "text-slate-400"
                  )}
                >
                  {s.step === 3 && isActive ? "Step 3" : s.title}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isActive || isCompleted ? "text-slate-500" : "text-slate-400"
                  )}
                >
                  {s.step === 3 && isActive ? "Review & Sync" : s.description}
                </span>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 px-4">
                <div
                  className={cn(
                    "h-[2px] w-full rounded-full transition-colors",
                    isCompleted ? "bg-[#5138EE]/40" : "bg-slate-200"
                  )}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
