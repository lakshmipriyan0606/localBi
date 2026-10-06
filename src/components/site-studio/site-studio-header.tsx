'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Globe,
  Eye,
  Send,
  Menu,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface BrandOption {
  id: string;
  name: string;
  slug: string;
}

interface SiteStudioHeaderProps {
  tenantSlug: string;
  title?: string;
  subtitle?: string;
  brands: BrandOption[];
  selectedBrandId: string;
  onSelectBrand: (brandId: string) => void;
  primaryDomain?: string | null;
  isLive?: boolean;
  onOpenPublishModal: () => void;
  onToggleMobileSidebar: () => void;
}

export function SiteStudioHeader({
  tenantSlug,
  title = 'Overview',
  subtitle,
  brands,
  selectedBrandId,
  onSelectBrand,
  primaryDomain,
  isLive = false,
  onOpenPublishModal,
  onToggleMobileSidebar,
}: SiteStudioHeaderProps) {
  const currentBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];
  const searchParams = useSearchParams();

  // Helper to preserve active brand query param across navigation
  const previewHref = `/client/${tenantSlug}/website/preview${
    selectedBrandId ? `?brandId=${selectedBrandId}` : ''
  }`;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                {title}
              </h1>

              {/* Brand Selector Dropdown if multiple brands */}
              {brands.length > 1 ? (
                <div className="relative inline-block">
                  <select
                    value={selectedBrandId}
                    onChange={(e) => onSelectBrand(e.target.value)}
                    className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 hover:bg-slate-200/70 focus:outline-hidden cursor-pointer"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : currentBrand ? (
                <span className="hidden sm:inline-flex items-center text-xs font-medium text-slate-500">
                  • {currentBrand.name}
                </span>
              ) : null}

              {/* Status Badge */}
              {isLive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Draft
                </span>
              )}
            </div>

            {subtitle && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Client Domain Badge, Preview, Publish, and Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Domain status pill */}
          {primaryDomain ? (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100/70 transition-colors">
              <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-mono text-[11px] text-slate-900 truncate max-w-[150px]">
                {primaryDomain}
              </span>
              <a
                href={`https://${primaryDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-indigo-600 transition-colors ml-0.5"
                title="Open live website"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <Link
              href={`/client/${tenantSlug}/website/domains${
                selectedBrandId ? `?brandId=${selectedBrandId}` : ''
              }`}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800 hover:bg-amber-100/70 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-amber-600" />
              <span>Connect Client Domain</span>
            </Link>
          )}

          {/* Preview Button */}
          <Link
            href={previewHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Preview</span>
          </Link>

          {/* Publish Changes Button */}
          <button
            type="button"
            onClick={onOpenPublishModal}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm shadow-indigo-600/30"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish</span>
          </button>

          {/* Avatar Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              LP
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
