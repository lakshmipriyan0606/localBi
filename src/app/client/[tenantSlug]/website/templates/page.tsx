'use client';

import React, { useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  LANDING_PAGE_STARTER_TEMPLATES,
  StarterTemplate,
} from '@/modules/page-builder/landing-page-templates';
import {
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Check,
  ChevronDown,
  ShoppingBag,
  Send,
  Coffee,
  Layout,
  Plus,
  Eye,
  Loader2,
} from 'lucide-react';
import { extractErrorMessage } from '@/lib/notify';

export default function WebsiteTemplatesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [category, setCategory] = useState<string>('ALL');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);

  const categories = [
    { id: 'ALL', label: 'All Templates' },
    { id: 'store', label: 'Storefront & Retail' },
    { id: 'services', label: 'Services & Leads' },
    { id: 'dining', label: 'Dining & Cafe' },
    { id: 'minimal', label: 'Clean & Minimal' },
  ];

  const filtered = LANDING_PAGE_STARTER_TEMPLATES.filter((tmpl) => {
    if (category === 'ALL') return true;
    return tmpl.category === category;
  });

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag':
        return ShoppingBag;
      case 'Send':
        return Send;
      case 'Coffee':
        return Coffee;
      default:
        return Layout;
    }
  };

  const handleUseTemplate = async (template: StarterTemplate) => {
    try {
      setCreatingTemplateId(template.id);
      const initialSlug = `/${template.id.replace(/_/g, '-')}-${Date.now().toString().slice(-4)}`;
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          name: template.title,
          pageType: 'LANDING',
          slug: initialSlug,
        }),
      });

      const data = await res.json();
      if (data.success && data.page) {
        // Also seed the starter template blocks to the new page puck state
        const queryBrand = brandId ? `?brandId=${brandId}` : '';
        router.push(`/client/${tenantSlug}/website/builder/${data.page.id}${queryBrand}`);
      } else {
        alert(extractErrorMessage(data.error, 'Failed to create page from template'));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error applying template');
    } finally {
      setCreatingTemplateId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Landing Page Starter Templates
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-11">
            Production-ready starter layouts engineered for conversions, local discovery, and fast deployment.
          </p>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                category === c.id
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Templates Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tmpl) => {
          const Icon = getTemplateIcon(tmpl.iconName);
          const isExpanded = expandedTemplateId === tmpl.id;
          const isCreating = creatingTemplateId === tmpl.id;

          return (
            <div
              key={tmpl.id}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="space-y-3.5">
                {/* Header Banner */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tmpl.accentColor} text-white flex items-center justify-center shadow-xs shrink-0`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {tmpl.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {tmpl.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {tmpl.tagline}
                  </p>
                </div>

                {/* Sections Summary */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {tmpl.sectionsList.length} Sections Included
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedTemplateId(isExpanded ? null : tmpl.id)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide' : 'View'} Sections</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {isExpanded && (
                    <ul className="mt-2.5 space-y-1.5 pl-1 max-h-40 overflow-y-auto text-xs text-slate-600 animate-in fade-in-50 duration-150">
                      {tmpl.sectionsList.map((sec, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate">{sec}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => handleUseTemplate(tmpl)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Page...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Use Starter Template</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
