'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Home,
  Info,
  Phone,
  Briefcase,
  MapPin,
  ShoppingBag,
  FileCode,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateType: string, templateName: string, initialSlug: string) => void;
}

export function TemplatePickerModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplatePickerModalProps) {
  const [selectedType, setSelectedType] = useState('HOME');
  const [pageName, setPageName] = useState('New Page');
  const [slug, setSlug] = useState('/new-page');
  const [step, setStep] = useState<1 | 2>(1);

  if (!isOpen) return null;

  const templates = [
    {
      type: 'HOME',
      title: 'Home Page',
      description: 'Header, Hero banner, Featured items, Store locator, and Reviews.',
      icon: Home,
      defaultSlug: '/',
      defaultName: 'Home',
    },
    {
      type: 'ABOUT',
      title: 'About Us',
      description: 'Brand story, mission, company values, and image gallery.',
      icon: Info,
      defaultSlug: '/about',
      defaultName: 'About Us',
    },
    {
      type: 'CONTACT',
      title: 'Contact Us',
      description: 'Location details, interactive map, operating hours, and inquiry form.',
      icon: Phone,
      defaultSlug: '/contact',
      defaultName: 'Contact Us',
    },
    {
      type: 'SERVICES',
      title: 'Services / Offerings',
      description: 'Service cards, key benefits, customer testimonials, and direct CTAs.',
      icon: Briefcase,
      defaultSlug: '/services',
      defaultName: 'Services',
    },
    {
      type: 'STORE',
      title: 'Locations / Stores',
      description: 'Store finder, city filtering, Google map integration, and directions.',
      icon: MapPin,
      defaultSlug: '/locations',
      defaultName: 'Locations',
    },
    {
      type: 'PRODUCT',
      title: 'Menu / Products',
      description: 'Dynamic product grid, category tabs, and real-time pricing.',
      icon: ShoppingBag,
      defaultSlug: '/menu',
      defaultName: 'Menu',
    },
    {
      type: 'CUSTOM',
      title: 'Custom / Blank Canvas',
      description: 'Start from a clean slate with complete visual builder control.',
      icon: FileCode,
      defaultSlug: '/custom',
      defaultName: 'Custom Page',
    },
  ];

  const handleChooseTemplate = (t: (typeof templates)[0]) => {
    setSelectedType(t.type);
    setPageName(t.defaultName);
    setSlug(t.defaultSlug);
    setStep(2);
  };

  const handleConfirm = () => {
    onSelectTemplate(selectedType, pageName, slug);
    onClose();
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Create New Page</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {step === 1 ? 'Step 1: Choose a template' : 'Step 2: Configure page details'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 1 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {templates.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.type}
                    type="button"
                    onClick={() => handleChooseTemplate(tpl)}
                    className="flex flex-col text-left p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors mb-3">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="font-bold text-xs text-slate-900 mb-1">{tpl.title}</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {tpl.description}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Page Title
                </label>
                <input
                  type="text"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Path / Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  placeholder="/about"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Must start with a forward slash (e.g. /menu)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Back to templates
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            {step === 2 && (
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Create & Open Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
