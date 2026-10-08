'use client';

import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { GoogleProductIcon } from '../google-product-icon';
import { Button } from '@/components/ui/button';

interface ConnectGoogleStepProps {
  brandName: string;
  isAuthorized: boolean;
  activeConnectionEmail?: string;
  onConnect: () => void;
  onContinue: () => void;
  onChangeAccount: () => void;
}

export function ConnectGoogleStep({
  isAuthorized,
  activeConnectionEmail,
  onConnect,
  onContinue,
  onChangeAccount,
}: ConnectGoogleStepProps) {
  const benefits = [
    'View your Google Search Console properties',
    'Access your Google Analytics 4 properties',
    'Map resources to your brands',
    'Sync data to LocalBi dashboards',
  ];

  return (
    <div className="max-w-xl mx-auto w-full pt-4 pb-12 space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="text-left space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Connect your Google Account
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Connect your Google account to access Search Console, Analytics and other Google resources for your brands.
        </p>
      </div>

      {/* Account Connection Card */}
      {isAuthorized ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3.5 min-w-0">
            <GoogleProductIcon product="GOOGLE" size="lg" />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900 truncate">
                  {activeConnectionEmail || 'Connected Google Account'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-snug">
                Access to Google Search Console, Google Analytics 4 and other supported services.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onChangeAccount}
            className="shrink-0 text-xs font-semibold text-slate-700 border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl shadow-2xs cursor-pointer self-start sm:self-center"
          >
            Change Account
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div className="mx-auto flex items-center justify-center">
            <GoogleProductIcon product="GOOGLE" size="xl" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900">Sign in with Google</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Authenticate securely with Google to automatically discover Search Console properties, Analytics metrics, and Business Profile storefronts.
            </p>
          </div>
          <Button
            type="button"
            onClick={onConnect}
            className="bg-[#3B49DF] hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer gap-2"
          >
            <GoogleProductIcon product="GOOGLE" size="sm" className="w-5 h-5 border-none shadow-none bg-transparent" />
            Connect Google Account
          </Button>
        </div>
      )}

      {/* What You'll Get Section */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          What you&apos;ll get
        </h4>
        <div className="space-y-2.5">
          {benefits.map((benefit, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      {isAuthorized && (
        <div className="pt-2">
          <Button
            type="button"
            onClick={onContinue}
            className="w-full bg-[#3B49DF] hover:bg-indigo-700 text-white font-bold text-sm py-3 px-6 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Next: Select &amp; Map Resources</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
