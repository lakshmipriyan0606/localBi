'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Store,
  Save,
  Check,
  Trash2,
  Sparkles,
  Fingerprint,
  ShoppingBag,
  Plus,
  Phone,
  MapPin,
  Settings,
  Layers,
  X,
  ChevronDown,
  UtensilsCrossed,
  Gem,
  Stethoscope,
  Briefcase,
  Copy,
  QrCode,
  MessageCircle,
  Clock,
  Globe,
  Zap,
  Search,
} from 'lucide-react';
import type { MicrositeConfig, MenuItem } from '@/modules/microsites/microsite-service';
import { notify } from '@/lib/notify';

type IndustryType = 'FOOD' | 'JEWELRY' | 'HOSPITAL' | 'RETAIL' | 'SERVICES';

interface IndustryOption {
  value: IndustryType;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}

const INDUSTRY_OPTIONS: IndustryOption[] = [
  {
    value: 'FOOD',
    label: 'Food & Dining',
    subtitle: 'Restaurants, cafes, bakeries & cloud kitchens',
    icon: UtensilsCrossed,
    color: 'amber',
  },
  {
    value: 'JEWELRY',
    label: 'Jewellery & Luxury',
    subtitle: 'Gold, diamond, ornaments & boutique stores',
    icon: Gem,
    color: 'yellow',
  },
  {
    value: 'HOSPITAL',
    label: 'Healthcare & Clinic',
    subtitle: 'Hospitals, diagnostic centers & pharmacies',
    icon: Stethoscope,
    color: 'emerald',
  },
  {
    value: 'RETAIL',
    label: 'Retail & Lifestyle',
    subtitle: 'Apparel, electronics, supermarkets & gifts',
    icon: ShoppingBag,
    color: 'blue',
  },
  {
    value: 'SERVICES',
    label: 'Professional Services',
    subtitle: 'Salons, repair shops, fitness & consultants',
    icon: Briefcase,
    color: 'purple',
  },
];

export default function TenantMicrositesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const resolvedParams = use(params);
  const tenantSlug = resolvedParams.tenantSlug;

  const [microsites, setMicrosites] = useState<MicrositeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubdomain, setSelectedSubdomain] = useState<string>('');
  const [activeView, setActiveView] = useState<'manage' | 'editor'>('manage');
  const [editorTab, setEditorTab] = useState<'identity' | 'catalog' | 'cname' | 'pages'>('identity');
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // QR Code Modal State
  const [qrModalSite, setQrModalSite] = useState<MicrositeConfig | null>(null);

  // Standardized toast notifications
  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    if (type === 'success') {
      notify.success(message);
    } else if (type === 'error') {
      notify.error(message);
    } else {
      notify.info(message);
    }
  };

  // Form states for currently selected microsite
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Chennai');
  const [hours, setHours] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [industry, setIndustry] = useState<IndustryType>('FOOD');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // New catalog item state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Popular Items');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemIsVeg, setNewItemIsVeg] = useState(true);
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');

  // Create Storefront form states
  const [newStoreSubdomain, setNewStoreSubdomain] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreIndustry, setNewStoreIndustry] = useState<IndustryType>('FOOD');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStoreCity, setNewStoreCity] = useState('Chennai');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreWhatsapp, setNewStoreWhatsapp] = useState('');
  const [newStoreCustomDomain, setNewStoreCustomDomain] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [hasManuallyEditedSlug, setHasManuallyEditedSlug] = useState(false);

  // Copy state helper
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyLink = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(identifier);
    addToast('Storefront URL copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Load all microsites for tenant
  const loadMicrosites = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/microsites?tenantSlug=${tenantSlug}`);
      if (res.ok) {
        const json = await res.json();
        const list: MicrositeConfig[] = json.microsites || [];
        setMicrosites(list);
        if (list.length > 0) {
          if (!list.some((s) => s.subdomain === selectedSubdomain)) {
            setSelectedSubdomain(list[0]!.subdomain);
          }
        } else {
          setSelectedSubdomain('');
        }
      }
    } catch (err) {
      console.error('Failed to load microsites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMicrosites();
  }, [tenantSlug]);

  // Load selected microsite details into form
  const fetchSelectedSite = async (sub: string) => {
    if (!sub) return;
    try {
      const res = await fetch(`/api/microsites/${sub}`);
      if (res.ok) {
        const data = await res.json();
        const s: MicrositeConfig = data.microsite;
        if (s) {
          setBrandName(s.brandName || '');
          setTagline(s.tagline || '');
          setPhone(s.phone || '');
          setWhatsapp(s.whatsapp || '');
          setAddress(s.address || '');
          setCity(s.city || 'Chennai');
          setHours(s.hours || '9:00 AM - 9:00 PM');
          setCustomDomain(s.customDomain || '');
          setIndustry(s.industry || 'FOOD');
          setMenuItems(s.menuItems || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedSubdomain) {
      fetchSelectedSite(selectedSubdomain);
    }
  }, [selectedSubdomain]);

  // Auto-generate slug from store name during creation unless manually touched
  const handleStoreNameChange = (val: string) => {
    setNewStoreName(val);
    if (!hasManuallyEditedSlug) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setNewStoreSubdomain(slug);
    }
  };

  // 1-Click auto-fill from tenant details
  const handleQuickFillFromTenant = () => {
    const formattedTenantName = tenantSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    
    setNewStoreName(`${formattedTenantName} Flagship`);
    setNewStoreSubdomain(tenantSlug);
    setNewStoreIndustry('FOOD');
    setNewStoreCity('Chennai');
    setNewStoreAddress('Khan St, Thiruvenkatapuram, Choolaimedu, Chennai, Tamil Nadu 600094');
    setNewStorePhone('+91 98401 23456');
    setNewStoreWhatsapp('+919840123456');
    setHasManuallyEditedSlug(true);
    addToast('Auto-filled with registered business details!', 'info');
  };

  // 1-Click Launch First Storefront (Quick Start)
  const handleInstantLaunchDefault = async () => {
    setIsCreating(true);
    const formattedTenantName = tenantSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    try {
      const res = await fetch('/api/microsites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: tenantSlug,
          tenantSlug,
          brandName: `${formattedTenantName} Store`,
          address: 'Khan St, Thiruvenkatapuram, Choolaimedu, Chennai, Tamil Nadu 600094',
          city: 'Chennai',
          phone: '+91 98401 23456',
          whatsapp: '+919840123456',
          industry: 'FOOD',
          hours: '9:00 AM - 10:00 PM',
          tagline: 'Authentic taste & handcrafted freshness prepared daily.',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        await loadMicrosites();
        setSelectedSubdomain(json.microsite.subdomain);
        setActiveView('manage');
        addToast('Storefront launched successfully! 🎉', 'success');
      }
    } catch (err) {
      console.error('Failed to launch storefront:', err);
      addToast('Failed to create storefront.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSubdomain) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/microsites/${selectedSubdomain}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          tagline,
          phone,
          whatsapp,
          address,
          city,
          hours,
          industry,
          customDomain: customDomain.trim() || undefined,
          menuItems,
        }),
      });

      if (res.ok) {
        addToast('Storefront profile updated successfully! 🚀', 'success');
        loadMicrosites();
      } else {
        addToast('Failed to save profile changes.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Network error while saving.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateMicrosite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreSubdomain.trim() || !newStoreName.trim()) {
      addToast('Please enter both Store Name and Subdomain.', 'error');
      return;
    }
    setIsCreating(true);

    try {
      const res = await fetch('/api/microsites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: newStoreSubdomain.trim().toLowerCase(),
          tenantSlug,
          brandName: newStoreName.trim(),
          address: newStoreAddress.trim(),
          city: newStoreCity.trim() || 'Chennai',
          phone: newStorePhone.trim(),
          whatsapp: newStoreWhatsapp.trim(),
          industry: newStoreIndustry,
          customDomain: newStoreCustomDomain.trim() || undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        await loadMicrosites();
        setSelectedSubdomain(json.microsite.subdomain);
        setShowCreateModal(false);
        setNewStoreSubdomain('');
        setNewStoreName('');
        setNewStoreAddress('');
        setNewStorePhone('');
        setNewStoreWhatsapp('');
        setNewStoreCustomDomain('');
        setHasManuallyEditedSlug(false);
        setActiveView('manage');
        addToast(`Storefront "${json.microsite.brandName}" deployed! 🎉`, 'success');
      } else {
        const errorJson = await res.json().catch(() => ({}));
        addToast(errorJson.error || 'Failed to create storefront.', 'error');
      }
    } catch (err) {
      console.error('Failed to create microsite:', err);
      addToast('Failed to create storefront.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteMicrosite = async (sub: string) => {
    if (!confirm(`Are you sure you want to delete the storefront for "${sub}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/microsites/${sub}`, { method: 'DELETE' });
      if (res.ok) {
        addToast(`Storefront "${sub}" deleted.`, 'info');
        await loadMicrosites();
      }
    } catch (err) {
      console.error('Failed to delete microsite:', err);
    }
  };

  const handleAddCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice.trim()) {
      addToast('Item name and price are required.', 'error');
      return;
    }

    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory.trim() || 'General',
      price: Number(newItemPrice),
      description: newItemDesc.trim(),
      isPopular: false,
      isVeg: newItemIsVeg,
    };

    const updated = [...menuItems, newItem];
    setMenuItems(updated);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemDesc('');
    addToast(`Added "${newItem.name}" to catalog. Remember to Save!`, 'info');
  };

  const handleDeleteCatalogItem = (id: string) => {
    setMenuItems(menuItems.filter((m) => m.id !== id));
    addToast('Item removed from catalog.', 'info');
  };

  // Filter storefronts by search query
  const filteredMicrosites = microsites.filter((site) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      site.brandName?.toLowerCase().includes(q) ||
      site.subdomain.toLowerCase().includes(q) ||
      site.city?.toLowerCase().includes(q) ||
      site.address?.toLowerCase().includes(q)
    );
  });

  // Filter catalog items
  const filteredMenuItems = menuItems.filter((item) => {
    if (catalogCategoryFilter === 'ALL') return true;
    return item.category === catalogCategoryFilter;
  });

  const uniqueCategories = Array.from(new Set(menuItems.map((m) => m.category)));

  const currentStore = microsites.find((m) => m.subdomain === selectedSubdomain);

  const sitePages = [
    {
      path: '/',
      name: 'Branch Overview & Hero',
      desc: 'Hero banner, trust badge, lead form, Google Map, and instant contact.',
      previewUrl: `/site/${selectedSubdomain}`,
    },
    {
      path: '/menu',
      name: 'Offerings & WhatsApp Catalog',
      desc: 'Complete product catalog or menu with 1-click WhatsApp order generation.',
      previewUrl: `/site/${selectedSubdomain}/menu`,
    },
    {
      path: '/about',
      name: 'Brand Heritage & Assurances',
      desc: 'Location story, certifications, quality benchmarks, and team specialties.',
      previewUrl: `/site/${selectedSubdomain}/about`,
    },
    {
      path: '/contact',
      name: 'Timings, Contact & Directions',
      desc: 'Operating schedule, calling buttons, WhatsApp support, and Google Map.',
      previewUrl: `/site/${selectedSubdomain}/contact`,
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-sans antialiased text-slate-900">

      {/* ── Top Header Section ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Digital Storefront Engine
            </span>
            <span className="text-xs text-slate-500 font-medium">Multi-Location Branch Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            Storefront Microsites Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
            Deploy high-converting local landing pages for your store branches with custom subdomains, visual drag-and-drop customization, and direct WhatsApp ordering.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Link
            href={`/client/${tenantSlug}/visitors`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors shadow-2xs"
          >
            <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
            <span>Store Visitors</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setHasManuallyEditedSlug(false);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Storefront</span>
          </button>
        </div>
      </div>

      {/* ── View Switcher & Store Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('manage')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'manage'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Store Locations ({microsites.length})</span>
          </button>

          {microsites.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveView('editor')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'editor'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure Storefront</span>
            </button>
          )}
        </div>

        {/* Switch Location dropdown in editor view */}
        {activeView === 'editor' && microsites.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Selected Branch:</span>
            <div className="relative">
              <select
                value={selectedSubdomain}
                onChange={(e) => setSelectedSubdomain(e.target.value)}
                className="pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:border-indigo-600 cursor-pointer appearance-none"
              >
                {microsites.map((m) => (
                  <option key={m.subdomain} value={m.subdomain}>
                    {m.brandName || m.subdomain} ({m.subdomain}.localbi.app)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 1: MANAGE ALL STOREFRONT CARDS
      ═══════════════════════════════════════════════════════════════════ */}
      {activeView === 'manage' && (
        <div className="space-y-6">
          {/* ONBOARDING HERO WHEN 0 STOREFRONTS EXIST */}
          {microsites.length === 0 && !loading && (
            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 p-8 sm:p-12 shadow-sm text-center max-w-4xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-100/70 text-indigo-700 text-xs font-bold border border-indigo-200">
                <Store className="w-3.5 h-3.5 text-indigo-600" />
                <span>Zero Storefronts Configured</span>
              </div>

              <div className="max-w-xl mx-auto space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Launch your branch storefront in 30 seconds
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Provide your customers with a fast, mobile-optimized landing page for your store location. Enable instant WhatsApp ordering, showcase products, and route via custom subdomains.
                </p>
              </div>

              {/* 3 Step Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto pt-2">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs">
                    1
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Custom Subdomain</h4>
                  <p className="text-[11px] text-slate-500">
                    Get an instant URL like <span className="font-mono text-indigo-600">store.localbi.app</span> or your own CNAME.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs">
                    2
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">WhatsApp Ordering</h4>
                  <p className="text-[11px] text-slate-500">
                    Visitors click to order catalog items directly into your business WhatsApp chat.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold text-xs">
                    3
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Visual Page Studio</h4>
                  <p className="text-[11px] text-slate-500">
                    Customize headlines, reviews, hero sections, and maps with our drag-and-drop studio.
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleInstantLaunchDefault}
                  disabled={isCreating}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>{isCreating ? 'Deploying...' : '1-Click Launch with Lakshmi Food'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(true);
                    setHasManuallyEditedSlug(false);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Custom Branch Setup</span>
                </button>
              </div>
            </div>
          )}

          {/* STOREFRONTS LIST (When storefronts exist) */}
          {microsites.length > 0 && (
            <div className="space-y-4">
              {/* Search & Statistics Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search branch name, subdomain, or city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span>
                    Showing <strong className="text-slate-900">{filteredMicrosites.length}</strong> of{' '}
                    <strong className="text-slate-900">{microsites.length}</strong> locations
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Network Active
                  </span>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMicrosites.map((site) => {
                  const displayDomain = site.customDomain || `${site.subdomain}.localbi.app`;
                  const liveUrl = site.customDomain
                    ? `https://${site.customDomain}`
                    : `/site/${site.subdomain}`;
                  const isSelected = site.subdomain === selectedSubdomain;

                  return (
                    <div
                      key={site.subdomain}
                      className={`group rounded-2xl border bg-white p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                        isSelected ? 'border-indigo-600 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Header: Status & Industry */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-mono text-xs font-bold text-slate-900 truncate">
                                {displayDomain}
                              </span>
                            </div>
                            <h3 className="font-bold text-base text-slate-900 leading-snug truncate">
                              {site.brandName || site.subdomain}
                            </h3>
                          </div>

                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">
                            {site.industry || 'FOOD'}
                          </span>
                        </div>

                        {/* Tagline */}
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {site.tagline || 'Leading brand destination for authentic quality and service.'}
                        </p>

                        {/* Metadata Rows */}
                        <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                          {site.address && (
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{site.address}</span>
                            </div>
                          )}
                          {site.phone && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{site.phone}</span>
                            </div>
                          )}
                          {site.hours && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{site.hours}</span>
                            </div>
                          )}
                        </div>

                        {/* Route links preview */}
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                          <span className="font-semibold text-slate-400">Routes:</span>
                          <a href={`/site/${site.subdomain}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200">
                            /home
                          </a>
                          <a href={`/site/${site.subdomain}/menu`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200">
                            /menu ({site.menuItems?.length || 0})
                          </a>
                          <a href={`/site/${site.subdomain}/about`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200">
                            /about
                          </a>
                          <a href={`/site/${site.subdomain}/contact`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200">
                            /contact
                          </a>
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Visual Studio Button */}
                          <Link
                            href={`/client/${tenantSlug}/microsites/${site.subdomain}/builder`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Visual Builder</span>
                          </Link>

                          {/* Configure Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubdomain(site.subdomain);
                              setActiveView('editor');
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Configure
                          </button>

                          {/* QR Code Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => setQrModalSite(site)}
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Generate Store QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy Link Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const fullUrl = `${window.location.origin}/site/${site.subdomain}`;
                              handleCopyLink(fullUrl, site.subdomain);
                            }}
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Copy Storefront URL"
                          >
                            {copiedId === site.subdomain ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Open Live Tab */}
                          <a
                            href={liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                            title="Open live storefront in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMicrosite(site.subdomain)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete storefront"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add Storefront Quick Card */}
                <div
                  onClick={() => {
                    setShowCreateModal(true);
                    setHasManuallyEditedSlug(false);
                  }}
                  className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10 p-6 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer min-h-[240px] group"
                >
                  <div className="h-11 w-11 rounded-2xl bg-white group-hover:bg-indigo-600 border border-slate-200 group-hover:border-indigo-600 flex items-center justify-center text-slate-600 group-hover:text-white transition-all shadow-2xs">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Add Another Branch</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                      Deploy a dedicated storefront microsite for your next branch location.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 2: CONFIGURE SELECTED STOREFRONT
      ═══════════════════════════════════════════════════════════════════ */}
      {activeView === 'editor' && currentStore && (
        <div className="space-y-6">
          {/* Active Store Status Header Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-base text-slate-900">
                    {customDomain ? customDomain : `${selectedSubdomain}.localbi.app`}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Live & Published
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Store: <strong className="text-slate-900">{brandName || selectedSubdomain}</strong> &bull; Industry: <strong className="text-slate-900">{industry}</strong> &bull; Catalog: <strong className="text-slate-900">{menuItems.length} items</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setQrModalSite(currentStore)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
              </button>

              <a
                href={`/site/${selectedSubdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                <span>Live View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <Link
                href={`/client/${tenantSlug}/microsites/${selectedSubdomain}/builder`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Drag & Drop Studio</span>
              </Link>
            </div>
          </div>

          {/* Sub-Tabs: Identity, Catalog, CNAME, Pages */}
          <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setEditorTab('identity')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                editorTab === 'identity'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Store Identity & Profile
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('catalog')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                editorTab === 'catalog'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Catalog & Menu ({menuItems.length})
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('cname')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                editorTab === 'cname'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Custom Domain & CNAME
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('pages')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                editorTab === 'pages'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Page Routes (4 Pages)
            </button>
          </div>

          {/* Sub-Tab 1: Identity */}
          {editorTab === 'identity' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Store Profile & Contacts</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Core brand information shown across all landing pages and Google SEO tags.</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Store Branch Name *</label>
                      <input
                        type="text"
                        required
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. Lakshmi Food Anna Nagar"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Industry Category</label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value as IndustryType)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      >
                        {INDUSTRY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} - {opt.subtitle}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tagline / Headline</label>
                    <textarea
                      rows={2}
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Handcrafted purity and authentic quality for our local community."
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Phone Number (Calling)</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98401 23456"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">WhatsApp Lead Number</label>
                      <input
                        type="text"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="+919840123456"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                      <p className="text-[10px] text-slate-400">Include country code without spaces (e.g. +919840123456).</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Physical Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street Address, Area"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Operating Hours</label>
                      <input
                        type="text"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        placeholder="e.g. 9:00 AM - 10:00 PM (Daily)"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Real-time Preview Side Widget */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Live Header Preview
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Live
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        {brandName ? brandName.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 truncate">
                          {brandName || 'Storefront Name'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{city || 'Chennai'}</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 italic">
                      &quot;{tagline || 'Authentic quality and local service.'}&quot;
                    </p>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono text-[10px]">{hours || '9 AM - 9 PM'}</span>
                      {whatsapp && (
                        <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          WhatsApp Ready
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={`/site/${selectedSubdomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Open Live Storefront</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Catalog */}
          {editorTab === 'catalog' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Store Offerings & Catalog</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Products, dishes, or services visible on <span className="font-mono text-indigo-600">/menu</span> with instant WhatsApp 1-click ordering.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save All Catalog Changes'}</span>
                </button>
              </div>

              {/* Add New Item Form */}
              <form onSubmit={handleAddCatalogItem} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  + Add Product / Service / Menu Item
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Item / Dish Name *"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <input
                    type="text"
                    placeholder="Category (e.g. Starters, Main, Specials)"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Price in ₹ *"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewItemIsVeg(!newItemIsVeg)}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                        newItemIsVeg
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      {newItemIsVeg ? '🟢 Vegetarian' : '🔴 Non-Veg'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    placeholder="Brief description or ingredient highlights (optional)"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="w-full flex-1 px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </form>

              {/* Category Filter Pills */}
              {uniqueCategories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setCatalogCategoryFilter('ALL')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      catalogCategoryFilter === 'ALL'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Items ({menuItems.length})
                  </button>
                  {uniqueCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCatalogCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        catalogCategoryFilter === cat
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat} ({menuItems.filter((m) => m.category === cat).length})
                    </button>
                  ))}
                </div>
              )}

              {/* Items List */}
              {menuItems.length === 0 ? (
                <div className="p-10 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">No catalog items configured.</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Use the form above to add products, dishes, or packages for this location. Customers will be able to order them directly on WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      <div className="space-y-0.5 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">{item.name}</span>
                          <span className="text-[10px] text-indigo-700 font-semibold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 shrink-0">
                            {item.category}
                          </span>
                          {item.isVeg !== undefined && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                item.isVeg ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.isVeg ? 'VEG' : 'NON-VEG'}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 truncate">{item.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-mono text-sm font-bold text-slate-900">₹{item.price}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCatalogItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 3: Custom Domain & CNAME */}
          {editorTab === 'cname' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-base text-slate-900">Custom Domain & CNAME Routing</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Connect your branch directly to your primary website domain (e.g. <span className="font-mono font-bold text-slate-800">annanagar.lakshmifood.com</span> or <span className="font-mono font-bold text-slate-800">store.yourbrand.com</span>).
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Custom Subdomain FQDN</label>
                    <input
                      type="text"
                      placeholder="e.g. annanagar.lakshmifood.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                    />
                    <p className="text-[11px] text-slate-400">
                      Leave empty to use the default: <span className="font-mono text-indigo-600">{selectedSubdomain}.localbi.app</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={isSaving}
                    className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Save Custom Domain
                  </button>
                </div>

                {/* DNS Table Helper */}
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">
                    DNS Configuration Instructions
                  </span>
                  <p className="text-xs text-slate-500">
                    Add the following record in your DNS provider (Cloudflare, GoDaddy, Namecheap, Vercel):
                  </p>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-400">Record Type</span>
                      <span className="font-bold text-slate-900">CNAME</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-400">Host / Name</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {customDomain ? customDomain.split('.')[0] : selectedSubdomain}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyLink(
                              customDomain ? customDomain.split('.')[0]! : selectedSubdomain,
                              'cname-host'
                            )
                          }
                          className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                          title="Copy Host"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-400">Points To / Value</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600">cname.localbi.app</span>
                        <button
                          type="button"
                          onClick={() => handleCopyLink('cname.localbi.app', 'cname-target')}
                          className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                          title="Copy Target"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Multi-Page Routes */}
          {editorTab === 'pages' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900">Multi-Page Route Architecture</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Each storefront automatically exposes 4 dedicated SEO landing pages.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sitePages.map((page) => (
                  <div
                    key={page.path}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {page.path}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Active & Indexed
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-2">{page.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{page.desc}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={page.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-indigo-600"
                      >
                        <span>Open Live Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <Link
                        href={`/client/${tenantSlug}/microsites/${selectedSubdomain}/builder`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                      >
                        <span>Visual Studio</span>
                        <Sparkles className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: CREATE NEW STOREFRONT LOCATION
      ═══════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Create New Storefront</h3>
                  <p className="text-[11px] text-slate-500">Deploy a dedicated microsite for another store location.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1-Click Auto-Fill from Registered Business Details */}
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-indigo-950">Auto-fill from Business Profile</p>
                <p className="text-[10px] text-indigo-600 truncate">Quick-fill with Lakshmi Food brand details</p>
              </div>
              <button
                type="button"
                onClick={handleQuickFillFromTenant}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs transition-colors"
              >
                ⚡ Auto-Fill
              </button>
            </div>

            <form onSubmit={handleCreateMicrosite} className="space-y-3.5">
              {/* Store Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Store / Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lakshmi Food Anna Nagar"
                  value={newStoreName}
                  onChange={(e) => handleStoreNameChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Subdomain Slug */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Subdomain Slug *</label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-indigo-600">
                  <input
                    type="text"
                    required
                    placeholder="e.g. annanagar"
                    value={newStoreSubdomain}
                    onChange={(e) => {
                      setHasManuallyEditedSlug(true);
                      setNewStoreSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    className="flex-1 px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                  />
                  <span className="px-3 py-2 text-xs text-slate-400 font-mono bg-slate-50 border-l border-slate-200">
                    .localbi.app
                  </span>
                </div>
                {newStoreSubdomain && (
                  <p className="text-[10px] text-indigo-600 font-mono">
                    URL: https://{newStoreSubdomain}.localbi.app
                  </p>
                )}
              </div>

              {/* Industry Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Industry Category</label>
                <select
                  value={newStoreIndustry}
                  onChange={(e) => setNewStoreIndustry(e.target.value as IndustryType)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                >
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.subtitle})
                    </option>
                  ))}
                </select>
              </div>

              {/* Physical Address & City */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 14, 2nd Avenue, Anna Nagar"
                    value={newStoreAddress}
                    onChange={(e) => setNewStoreAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">City</label>
                  <input
                    type="text"
                    placeholder="Chennai"
                    value={newStoreCity}
                    onChange={(e) => setNewStoreCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Phone & WhatsApp */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Calling Phone</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={newStorePhone}
                    onChange={(e) => setNewStorePhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">WhatsApp Lead Number</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={newStoreWhatsapp}
                    onChange={(e) => setNewStoreWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Custom Domain CNAME */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Custom Subdomain CNAME (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. annanagar.lakshmifood.com"
                  value={newStoreCustomDomain}
                  onChange={(e) => setNewStoreCustomDomain(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Deploying Storefront...' : 'Deploy Storefront'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: INTERACTIVE STORE QR CODE
      ═══════════════════════════════════════════════════════════════════ */}
      {qrModalSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-sm text-slate-900">Storefront QR Code</span>
              </div>
              <button
                type="button"
                onClick={() => setQrModalSite(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-base text-slate-900">{qrModalSite.brandName}</h4>
              <p className="font-mono text-xs text-indigo-600">
                {qrModalSite.customDomain || `${qrModalSite.subdomain}.localbi.app`}
              </p>
            </div>

            {/* Generated QR Code Image */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/site/${qrModalSite.subdomain}`
                    : `https://${qrModalSite.subdomain}.localbi.app`
                )}`}
                alt={`QR code for ${qrModalSite.brandName}`}
                className="w-48 h-48 rounded-lg shadow-2xs"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Place this QR code on physical dining tables, billing counters, or print flyers so walk-in customers can view your catalog and order directly on WhatsApp.
            </p>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/site/${qrModalSite.subdomain}`;
                  handleCopyLink(url, `qr-${qrModalSite.subdomain}`);
                }}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>

              <a
                href={`/site/${qrModalSite.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Site</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
