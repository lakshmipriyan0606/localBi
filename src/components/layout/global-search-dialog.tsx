'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Store,
  TrendingUp,
  Globe,
  BarChart3,
  ShoppingBag,
  Layers,
  FileText,
  Palette,
  Menu as MenuIcon,
  MapPin,
  Package,
  Settings2,
  Sparkles,
  LineChart,
  ShieldCheck,
  Tag,
  Download,
  Plug,
  RefreshCw,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandOption, useActiveBrand } from '@/providers/active-brand-context';

export interface GlobalSearchDialogProps {
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
  brands?: BrandOption[];
  onOpenIntegrations?: () => void;
  onOpenExport?: () => void;
}

interface SearchItem {
  id: string;
  category: 'Channels' | 'Site Studio' | 'Reports & Settings' | 'Brands' | 'Actions';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  shortcut?: string;
}

export function GlobalSearchDialog({
  open,
  onClose,
  tenantSlug,
  brands = [],
  onOpenIntegrations,
  onOpenExport,
}: GlobalSearchDialogProps) {
  const router = useRouter();
  const brandCtx = useActiveBrand();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  // All searchable items
  const allItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [
      // Channels
      {
        id: 'nav-dashboard',
        category: 'Channels',
        title: 'Dashboard Overview',
        subtitle: 'Main local SEO and performance dashboard',
        icon: LayoutDashboard,
        href: `/client/${tenantSlug}`,
      },
      {
        id: 'nav-gbp',
        category: 'Channels',
        title: 'Google Business Profile',
        subtitle: 'Local listing views, calls, directions, and reviews',
        icon: Store,
        href: `/client/${tenantSlug}?tab=gbp`,
      },
      {
        id: 'nav-rankings',
        category: 'Channels',
        title: 'SEO & Search Rankings',
        subtitle: 'Geo-grid rankings, keywords, and local search visibility',
        icon: TrendingUp,
        href: `/client/${tenantSlug}/rank`,
      },
      {
        id: 'nav-gsc',
        category: 'Channels',
        title: 'Google Search Console',
        subtitle: 'Organic search clicks, impressions, CTR, and top queries',
        icon: Globe,
        href: `/client/${tenantSlug}?tab=gsc`,
      },
      {
        id: 'nav-ga4',
        category: 'Channels',
        title: 'Google Analytics 4',
        subtitle: 'Traffic sessions, user engagement, and conversions',
        icon: BarChart3,
        href: `/client/${tenantSlug}?tab=web`,
      },
      {
        id: 'nav-gmc',
        category: 'Channels',
        title: 'Google Merchant Center',
        subtitle: 'Product catalog sync, inventory, and free listings',
        icon: ShoppingBag,
        href: `/client/${tenantSlug}/merchant`,
      },

      // Site Studio
      {
        id: 'studio-overview',
        category: 'Site Studio',
        title: 'Site Studio Overview',
        subtitle: 'Health, publish status, and storefront management',
        icon: Layers,
        href: `/client/${tenantSlug}/website`,
      },
      {
        id: 'studio-pages',
        category: 'Site Studio',
        title: 'Pages & Content',
        subtitle: 'Create, edit, and publish landing pages',
        icon: FileText,
        href: `/client/${tenantSlug}/website/pages`,
      },
      {
        id: 'studio-design',
        category: 'Site Studio',
        title: 'Design & Theme',
        subtitle: 'Brand colors, typography, and visual presets',
        icon: Palette,
        href: `/client/${tenantSlug}/website/design`,
      },
      {
        id: 'studio-nav',
        category: 'Site Studio',
        title: 'Navigation Menus',
        subtitle: 'Header and footer link builders',
        icon: MenuIcon,
        href: `/client/${tenantSlug}/website/navigation`,
      },
      {
        id: 'studio-locations',
        category: 'Site Studio',
        title: 'Store Locations',
        subtitle: 'Multi-location addresses, hours, and GBP linking',
        icon: MapPin,
        href: `/client/${tenantSlug}/locations`,
      },
      {
        id: 'studio-products',
        category: 'Site Studio',
        title: 'Product Catalog',
        subtitle: 'Product inventory, pricing, and GMC feeds',
        icon: Package,
        href: `/client/${tenantSlug}/catalog`,
      },
      {
        id: 'studio-seo',
        category: 'Site Studio',
        title: 'SEO Settings',
        subtitle: 'Meta tags, sitemaps, robots.txt, and canonical URLs',
        icon: Settings2,
        href: `/client/${tenantSlug}/settings/seo`,
      },
      {
        id: 'studio-ai',
        category: 'Site Studio',
        title: 'SEO Intelligence & AI',
        subtitle: 'Keyword opportunities and automated SEO audit insights',
        icon: Sparkles,
        href: `/client/${tenantSlug}/intelligence`,
      },
      {
        id: 'studio-analytics',
        category: 'Site Studio',
        title: 'Web Analytics',
        subtitle: 'Conversion tracking, funnel events, and visitor sessions',
        icon: LineChart,
        href: `/client/${tenantSlug}/visitors`,
      },
      {
        id: 'studio-domains',
        category: 'Site Studio',
        title: 'Domains & SSL',
        subtitle: 'Custom domain DNS verification and SSL provisioning',
        icon: ShieldCheck,
        href: `/client/${tenantSlug}/website/domains`,
      },

      // Reports & Settings
      {
        id: 'rep-executive',
        category: 'Reports & Settings',
        title: 'Executive Reports',
        subtitle: 'Multi-channel executive performance summaries',
        icon: FileText,
        href: `/client/${tenantSlug}/reports`,
      },
      {
        id: 'settings-integrations',
        category: 'Reports & Settings',
        title: 'Google Integrations & Mapping',
        subtitle: 'Manage connected Google accounts and resource mapping',
        icon: Plug,
        href: `/client/${tenantSlug}/integrations`,
      },
      {
        id: 'settings-org',
        category: 'Reports & Settings',
        title: 'Organization Settings',
        subtitle: 'Tenant configuration, team members, and roles',
        icon: Settings2,
        href: `/client/${tenantSlug}/settings`,
      },

      // Quick Actions
      {
        id: 'action-sync',
        category: 'Actions',
        title: 'Sync Google Integrations',
        subtitle: 'Trigger immediate sync for GSC, GBP, and GA4 data',
        icon: RefreshCw,
        action: () => {
          onClose();
          onOpenIntegrations?.();
        },
      },
      {
        id: 'action-export',
        category: 'Actions',
        title: 'Export Performance Report',
        subtitle: 'Download current period analytics as CSV or Printable HTML',
        icon: Download,
        action: () => {
          onClose();
          onOpenExport?.();
        },
      },
    ];

    // Add brands
    if (brands.length > 0) {
      brands.forEach((brand) => {
        const isCurrent = brandCtx?.activeBrandId === brand.id;
        items.push({
          id: `brand-${brand.id}`,
          category: 'Brands',
          title: `Brand: ${brand.name}`,
          subtitle: isCurrent ? 'Active Brand' : `Switch to ${brand.name}`,
          icon: Tag,
          action: () => {
            onClose();
            brandCtx?.setActiveBrandId(brand.id);
          },
        });
      });
    }

    return items;
  }, [tenantSlug, brands, brandCtx, onClose, onOpenIntegrations, onOpenExport]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Adjust selectedIndex when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Navigate to selected item
  const handleSelect = useCallback(
    (item: SearchItem) => {
      onClose();
      if (item.action) {
        item.action();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [onClose, router]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector('[data-selected="true"]');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global Search and Navigation"
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="h-4 w-4 text-indigo-600 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports, Site Studio pages, brands, or commands..."
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-200/60 rounded border border-slate-300/60">
            ESC
          </kbd>
        </div>

        {/* Search Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-100"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for &quot;dashboard&quot;, &quot;pages&quot;, or a brand name.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  data-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-indigo-50/80 text-indigo-950 ring-1 ring-indigo-500/20'
                      : 'hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-white group-hover:border group-hover:border-slate-200'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate leading-tight">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <CornerDownLeft className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0 animate-in fade-in duration-100" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600 mr-1">
                ↑
              </kbd>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600 mr-1">
                ↓
              </kbd>
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600 mr-1">
                ↵
              </kbd>
              Select
            </span>
          </div>
          <span>
            Active Brand:{' '}
            <strong className="text-slate-700 font-semibold">
              {brandCtx?.activeBrand?.name || 'All'}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
