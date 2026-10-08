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
      title: "Select & Map Resources",
      description: "Choose and assign to brands",
    },
    {
      step: 3,
      title: "Review & Connect",
      description: "Confirm and sync",
    },
  ];

  return (
    <div className="flex items-center justify-between w-full max-w-3xl mx-auto mb-8 pt-2 pb-2">
      {steps.map((s, index) => {
        const isCompleted = activeStep > s.step;
        const isActive = activeStep === s.step;
        const isClickable = canNavigate && onStepClick && s.step <= (activeStep + 1);

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
                  "flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-xs sm:text-sm font-bold transition-all shadow-2xs",
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isActive
                    ? "bg-[#3B49DF] text-white ring-4 ring-indigo-100"
                    : "bg-slate-100 border border-slate-200 text-slate-400 group-hover:bg-slate-200"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[3]" /> : s.step}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span
                  className={cn(
                    "text-xs sm:text-sm font-bold leading-tight",
                    isActive ? "text-slate-900" : isCompleted ? "text-slate-800" : "text-slate-400"
                  )}
                >
                  {s.title}
                </span>
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] font-medium leading-tight mt-0.5",
                    isActive ? "text-indigo-600" : isCompleted ? "text-slate-500" : "text-slate-400"
                  )}
                >
                  {s.description}
                </span>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 px-3 sm:px-6">
                <div
                  className={cn(
                    "h-[2px] w-full rounded-full transition-colors",
                    isCompleted ? "bg-emerald-400" : "bg-slate-200"
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
