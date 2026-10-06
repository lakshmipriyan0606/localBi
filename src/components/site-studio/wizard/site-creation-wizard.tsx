'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Palette,
  FileText,
  Compass,
  MapPin,
  ShoppingBag,
  Search,
  Eye,
  Send,
  Sparkles,
} from 'lucide-react';

interface SiteCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
  brandId: string;
}

export function SiteCreationWizard({
  isOpen,
  onClose,
  tenantSlug,
  brandId,
}: SiteCreationWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [siteName, setSiteName] = useState('Lakshmi Food');
  const [tagline, setTagline] = useState('Authentic. Fresh. Local.');
  const [clientDomain, setClientDomain] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4F46E5');
  const [metaTitle, setMetaTitle] = useState('Lakshmi Food - Authentic Food Restaurant');
  const [metaDescription, setMetaDescription] = useState(
    'Enjoy authentic and fresh food at Lakshmi Food. Best restaurant with great ambiance.'
  );

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Site Identity', icon: Globe },
    { number: 2, title: 'Client Domain', icon: Globe },
    { number: 3, title: 'Pages', icon: FileText },
    { number: 4, title: 'Design & Theme', icon: Palette },
    { number: 5, title: 'Navigation', icon: Compass },
    { number: 6, title: 'Locations', icon: MapPin },
    { number: 7, title: 'Products', icon: ShoppingBag },
    { number: 8, title: 'SEO', icon: Search },
    { number: 9, title: 'Preview', icon: Eye },
    { number: 10, title: 'Publish', icon: Send },
  ];

  const handleNext = () => {
    if (currentStep < 10) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
      router.push(`/client/${tenantSlug}/website?brandId=${brandId}`);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Wizard Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Create Your LocalBi Website
              </h2>
              <p className="text-xs text-slate-500">
                Build an SEO-ready website for your brand in just a few steps.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Body: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-y-auto divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Main Step Form (2 Cols) */}
          <div className="md:col-span-2 p-6 sm:p-8 space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">1. Site Identity</h3>
                  <p className="text-xs text-slate-500">
                    Set up your business name, tagline, and brand identity.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Business / Site Name
                    </label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      placeholder="e.g. ABC Restaurant"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      placeholder="e.g. Authentic. Fresh. Local."
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">2. Client Domain</h3>
                  <p className="text-xs text-slate-500">
                    Connect your client-owned public domain. (No customer subdomains)
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Client-Owned Domain
                    </label>
                    <input
                      type="text"
                      value={clientDomain}
                      onChange={(e) => setClientDomain(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                      placeholder="e.g. www.abc.com or site.abc.com"
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800">DNS Connection Note:</div>
                    <p>
                      You will point your domain CNAME to{' '}
                      <code className="text-indigo-600 font-bold">cname.vercel-dns.com</code> or A
                      record to <code className="text-indigo-600 font-bold">76.76.21.21</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">3. Select Initial Pages</h3>
                  <p className="text-xs text-slate-500">
                    We will automatically scaffold these starter pages for your website.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {['Home', 'About Us', 'Menu / Products', 'Locations', 'Contact Us'].map(
                    (p) => (
                      <div
                        key={p}
                        className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 text-indigo-900 font-semibold"
                      >
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        <span>{p}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">4. Design & Theme</h3>
                  <p className="text-xs text-slate-500">Choose your brand color palette.</p>
                </div>
                <div className="flex items-center gap-4">
                  {['#4F46E5', '#2563EB', '#059669', '#DC2626', '#D97706', '#0F172A'].map(
                    (col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setPrimaryColor(col)}
                        className={`w-9 h-9 rounded-xl transition-transform ${
                          primaryColor === col ? 'scale-110 ring-2 ring-offset-2 ring-indigo-600' : ''
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    )
                  )}
                </div>
              </div>
            )}

            {currentStep >= 5 && currentStep <= 8 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    {steps[currentStep - 1]?.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Synchronizing live data from LocalBi database...
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Entities and schema configurations ready for automatic integration.
                  </span>
                </div>
              </div>
            )}

            {currentStep === 9 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">9. Preview Website</h3>
                  <p className="text-xs text-slate-500">
                    Your website preview is compiled and ready for review.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  ✓ Desktop, Tablet, and Mobile layouts generated.
                </div>
              </div>
            )}

            {currentStep === 10 && (
              <div className="space-y-4 text-center py-6">
                <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Setup Complete!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Your website structure has been created. Click below to enter Site Studio and begin visual editing.
                </p>
              </div>
            )}
          </div>

          {/* Steps Navigation Sidebar (1 Col) */}
          <div className="p-6 bg-slate-50/50 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Wizard Steps
            </div>
            {steps.map((s) => {
              const Icon = s.icon;
              const isPast = currentStep > s.number;
              const isCurrent = currentStep === s.number;
              return (
                <div
                  key={s.number}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors ${
                    isCurrent
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : isPast
                      ? 'text-slate-700 font-medium'
                      : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-white text-indigo-600'
                        : isPast
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPast ? '✓' : s.number}
                  </span>
                  <span>{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs"
          >
            <span>{currentStep === 10 ? 'Enter Site Studio' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
