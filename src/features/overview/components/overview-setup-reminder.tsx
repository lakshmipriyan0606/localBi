'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Plug, ArrowRight, CheckCircle2, Circle, Zap } from 'lucide-react';

interface OverviewSetupReminderProps {
  tenantSlug: string;
  isConnected: boolean;
  isDataReady: boolean;
}

const STEPS = [
  {
    num: 1,
    label: 'Sign In with Google',
    description: 'Connect your Google account via OAuth',
  },
  {
    num: 2,
    label: 'Link Websites & Stores',
    description: 'Map GBP locations & Search Console properties',
  },
  {
    num: 3,
    label: 'Sync & View Reports',
    description: 'Live data streams into your dashboard',
  },
];

export function OverviewSetupReminder({
  tenantSlug,
  isConnected,
  isDataReady,
}: OverviewSetupReminderProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't show at all once data is flowing
  if (isDataReady || dismissed) return null;

  const currentStep = !isConnected ? 1 : 2;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 p-4 sm:p-5 shadow-[0_2px_12px_rgba(99,102,241,0.08)] animate-in fade-in slide-in-from-top-2 duration-400"
      role="alert"
      aria-label="Google integration setup required"
    >
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss setup reminder"
        className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Subtle decorative ring */}
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-indigo-100/40 blur-2xl pointer-events-none"
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon + heading */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Pulsing icon */}
          <div className="relative flex-shrink-0 mt-0.5">
            <div className="absolute inset-0 rounded-xl bg-indigo-400/30 animate-ping" />
            <div className="relative w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Plug className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[14px] font-bold text-slate-900 leading-snug">
                {isConnected
                  ? 'Almost there — Link your websites & stores'
                  : 'Connect Google to unlock your dashboard'}
              </h3>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200/70">
                <Zap className="w-2.5 h-2.5" />
                Setup Pending
              </span>
            </div>
            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
              {isConnected
                ? 'Your Google account is authorized. Complete resource mapping to start seeing live GBP, Search Console and Analytics data.'
                : 'Sign in with your Google account to automatically import your store locations and website from Google Business Profile and Search Console.'}
            </p>

            {/* Step indicators */}
            <div className="flex items-center gap-0 mt-3 flex-wrap">
              {STEPS.map((step, idx) => {
                const isDone = step.num < currentStep;
                const isActive = step.num === currentStep;
                return (
                  <div key={step.num} className="flex items-center">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        isDone
                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                          : isActive
                          ? 'text-indigo-700 bg-indigo-50 border border-indigo-200/80 shadow-xs'
                          : 'text-slate-400 bg-slate-50/60 border border-slate-200/60'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      ) : isActive ? (
                        <div className="w-3 h-3 rounded-full border-2 border-indigo-500 flex-shrink-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        </div>
                      ) : (
                        <Circle className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      )}
                      <span>
                        Step {step.num}: {step.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-slate-300 mx-1 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex-shrink-0 sm:self-center">
          <Link
            href={`/client/${tenantSlug}/integrations`}
            id="overview-setup-cta"
            className="group inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-[13px] font-semibold shadow-md shadow-indigo-200/60 transition-all duration-150 hover:shadow-lg hover:shadow-indigo-200/80 hover:-translate-y-px"
          >
            <span>{isConnected ? 'Complete Setup' : 'Connect Google'}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
