'use client';

import React, { useState, useEffect, useRef, use } from 'react';
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
  ShieldCheck,
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
} from 'lucide-react';
import type { MicrositeConfig, MenuItem } from '@/modules/microsites/microsite-service';

type IndustryType = 'FOOD' | 'JEWELRY' | 'HOSPITAL' | 'RETAIL' | 'SERVICES';

interface IndustryOption {
  value: IndustryType;
  label: string;
  subtitle: string;
  icon: React.ElementType;
}

const INDUSTRY_OPTIONS: IndustryOption[] = [
  {
    value: 'FOOD',
    label: 'Food & Dining',
    subtitle: 'Restaurants, cafes, bakeries & cloud kitchens',
    icon: UtensilsCrossed,
  },
  {
    value: 'JEWELRY',
    label: 'Jewellery & Luxury',
    subtitle: 'Gold, diamond, ornaments & boutique stores',
    icon: Gem,
  },
  {
    value: 'HOSPITAL',
    label: 'Healthcare & Clinic',
    subtitle: 'Hospitals, diagnostic centers & pharmacies',
    icon: Stethoscope,
  },
  {
    value: 'RETAIL',
    label: 'Retail & Lifestyle',
    subtitle: 'Apparel, electronics, supermarkets & gifts',
    icon: ShoppingBag,
  },
  {
    value: 'SERVICES',
    label: 'Professional Services',
    subtitle: 'Salons, repair shops, fitness & consultants',
    icon: Briefcase,
  },
];

function IndustrySelect({
  value,
  onChange,
  size = 'sm',
  align = 'left',
}: {
  value: IndustryType;
  onChange: (val: IndustryType) => void;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption: IndustryOption =
    INDUSTRY_OPTIONS.find((opt) => opt.value === value) || INDUSTRY_OPTIONS[0]!;
  const IconComponent = selectedOption.icon;

  const sizeClasses =
    size === 'md'
      ? 'px-3.5 py-2.5 text-xs rounded-xl'
      : 'px-3 py-2 text-xs rounded-xl';

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-white border border-slate-200 text-slate-900 font-medium hover:border-slate-300 focus:outline-none transition-colors cursor-pointer text-left ${sizeClasses} ${
          isOpen ? 'border-indigo-600 ring-2 ring-indigo-500/10' : ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
            <IconComponent className="w-3 h-3" />
          </div>
          <span className="truncate">{selectedOption.label}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 py-1 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>Select Industry Preset</span>
            <span className="text-[9px] text-slate-400 font-normal">5 presets</span>
          </div>
          <div className="p-1 space-y-0.5">
            {INDUSTRY_OPTIONS.map((opt) => {
              const isSelected = opt.value === value;
              const OptIcon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-950 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <OptIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs ${isSelected ? 'font-bold text-indigo-950' : 'font-medium text-slate-800'}`}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{opt.subtitle}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StoreSelect({
  value,
  onChange,
  microsites,
}: {
  value: string;
  onChange: (subdomain: string) => void;
  microsites: MicrositeConfig[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentStore = microsites.find((m) => m.subdomain === value) || microsites[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none transition-colors cursor-pointer ${
          isOpen ? 'border-indigo-600 ring-2 ring-indigo-500/10' : ''
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />
        <span className="truncate max-w-[140px] sm:max-w-[200px]">
          {currentStore ? currentStore.brandName || currentStore.subdomain : value}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 py-1 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>Switch Storefront</span>
            <span className="text-[9px] text-slate-400 font-normal">{microsites.length} locations</span>
          </div>
          <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
            {microsites.map((m) => {
              const isSelected = m.subdomain === value;
              return (
                <button
                  key={m.subdomain}
                  type="button"
                  onClick={() => {
                    onChange(m.subdomain);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50 text-indigo-950 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-xs truncate ${isSelected ? 'font-bold text-indigo-950' : 'font-medium text-slate-800'}`}>
                      {m.brandName || m.subdomain}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      {m.subdomain}.localbi.app
                    </p>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TenantMicrositesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const resolvedParams = use(params);
  const tenantSlug = resolvedParams.tenantSlug;

  const [microsites, setMicrosites] = useState<MicrositeConfig[]>([]);
  const [selectedSubdomain, setSelectedSubdomain] = useState<string>('lakshmi-food');
  const [activeView, setActiveView] = useState<'manage' | 'editor'>('manage');
  const [editorTab, setEditorTab] = useState<'identity' | 'catalog' | 'pages'>('identity');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for currently selected microsite
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [industry, setIndustry] = useState<'FOOD' | 'JEWELRY' | 'HOSPITAL' | 'RETAIL' | 'SERVICES'>('FOOD');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // New item form (Catalog)
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Standard Offerings');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Create Microsite modal states
  const [newStoreSubdomain, setNewStoreSubdomain] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreIndustry, setNewStoreIndustry] = useState<'FOOD' | 'JEWELRY' | 'HOSPITAL' | 'RETAIL' | 'SERVICES'>('FOOD');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreWhatsapp, setNewStoreWhatsapp] = useState('');
  const [newStoreCustomDomain, setNewStoreCustomDomain] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load all microsites for tenant
  const loadMicrosites = async () => {
    try {
      const res = await fetch(`/api/microsites?tenantSlug=${tenantSlug}`);
      if (res.ok) {
        const json = await res.json();
        const list: MicrositeConfig[] = json.microsites || [];
        setMicrosites(list);
        if (list.length > 0 && !list.some((s) => s.subdomain === selectedSubdomain)) {
          setSelectedSubdomain(list[0]?.subdomain || 'lakshmi-food');
        }
      }
    } catch (err) {
      console.error('Failed to load microsites:', err);
    }
  };

  useEffect(() => {
    loadMicrosites();
  }, [tenantSlug]);

  // Load selected microsite details into form
  const fetchSelectedSite = async (sub: string) => {
    try {
      const res = await fetch(`/api/microsites/${sub}`);
      if (res.ok) {
        const data = await res.json();
        const s: MicrositeConfig = data.microsite;
        setBrandName(s.brandName || '');
        setTagline(s.tagline || '');
        setPhone(s.phone || '');
        setWhatsapp(s.whatsapp || '');
        setAddress(s.address || '');
        setHours(s.hours || '');
        setCustomDomain(s.customDomain || '');
        setIndustry(s.industry || 'FOOD');
        setMenuItems(s.menuItems || []);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

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
          hours,
          industry,
          customDomain: customDomain.trim() || undefined,
          menuItems,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        loadMicrosites();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateMicrosite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreSubdomain || !newStoreName) return;
    setIsCreating(true);

    try {
      const res = await fetch('/api/microsites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: newStoreSubdomain,
          tenantSlug,
          brandName: newStoreName,
          address: newStoreAddress,
          phone: newStorePhone,
          whatsapp: newStoreWhatsapp,
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
        setActiveView('editor');
      }
    } catch (err) {
      console.error('Failed to create microsite:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteMicrosite = async (sub: string) => {
    if (!confirm(`Are you sure you want to delete the microsite for "${sub}"?`)) return;

    try {
      const res = await fetch(`/api/microsites/${sub}`, { method: 'DELETE' });
      if (res.ok) {
        await loadMicrosites();
      }
    } catch (err) {
      console.error('Failed to delete microsite:', err);
    }
  };

  const handleAddCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory.trim() || 'General',
      price: Number(newItemPrice),
      description: newItemDesc.trim(),
      isPopular: false,
      isVeg: true,
    };

    setMenuItems([...menuItems, newItem]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemDesc('');
  };

  const handleDeleteCatalogItem = (id: string) => {
    setMenuItems(menuItems.filter((m) => m.id !== id));
  };

  const sitePages = [
    {
      path: '/',
      name: 'Location Home',
      desc: 'Hero banner, customer reviews wall, lead form, and Google Map.',
      previewUrl: `/site/${selectedSubdomain}`,
    },
    {
      path: '/menu',
      name: 'Offerings & Catalog',
      desc: 'Products, services, or menu items with instant WhatsApp ordering.',
      previewUrl: `/site/${selectedSubdomain}/menu`,
    },
    {
      path: '/about',
      name: 'About & Credentials',
      desc: 'Branch heritage, quality assurances, team specialists, and certifications.',
      previewUrl: `/site/${selectedSubdomain}/about`,
    },
    {
      path: '/contact',
      name: 'Store Hours & Directions',
      desc: 'Operating hours, phone numbers, WhatsApp, and Google Map directions.',
      previewUrl: `/site/${selectedSubdomain}/contact`,
    },
  ];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto font-sans">
      {/* ── Top Enterprise Studio Navbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Enterprise Storefront Network
            </span>
            <span className="text-xs text-slate-500 font-medium">Multi-Location Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Storefront Microsites Manager
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage, customize, and deploy high-converting branch landing pages with custom subdomain CNAME routing and drag-and-drop visual editing.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Link
            href={`/client/${tenantSlug}/visitors`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors shadow-2xs"
          >
            <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
            <span>Visitor Analytics</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Storefront</span>
          </button>
        </div>
      </div>

      {/* ── Studio View Toggle Bar ── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
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
            <span>Configure Store: {selectedSubdomain}</span>
          </button>
        </div>

        {activeView === 'editor' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Switch Location:</span>
            <StoreSelect
              value={selectedSubdomain}
              onChange={setSelectedSubdomain}
              microsites={microsites}
            />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 1: MANAGE ALL STOREFRONT CARDS
      ═══════════════════════════════════════════════════════════════════ */}
      {activeView === 'manage' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {microsites.map((site) => {
              const displayDomain = site.customDomain || `${site.subdomain}.localbi.app`;
              const isSelected = site.subdomain === selectedSubdomain;

              return (
                <div
                  key={site.subdomain}
                  className={`rounded-2xl border bg-white p-5 shadow-xs transition-all duration-200 flex flex-col justify-between ${
                    isSelected ? 'border-indigo-600 ring-1 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="font-mono text-xs font-bold text-slate-900 truncate">
                            {displayDomain}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 leading-snug">
                          {site.brandName || site.subdomain}
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {site.industry || 'FOOD'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {site.tagline || 'Leading brand destination for quality and service.'}
                    </p>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                      {site.address && (
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{site.address}</span>
                        </div>
                      )}
                      {site.phone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{site.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Multi-Page Routes */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-400">Pages:</span>
                      <a href={`/site/${site.subdomain}`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 font-mono">/home</a>
                      <span>&bull;</span>
                      <a href={`/site/${site.subdomain}/menu`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 font-mono">/catalog</a>
                      <span>&bull;</span>
                      <a href={`/site/${site.subdomain}/about`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 font-mono">/about</a>
                      <span>&bull;</span>
                      <a href={`/site/${site.subdomain}/contact`} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 font-mono">/contact</a>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/client/${tenantSlug}/microsites/${site.subdomain}/builder`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Visual Builder</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubdomain(site.subdomain);
                          setActiveView('editor');
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                        title="Configure details & catalog"
                      >
                        Configure
                      </button>

                      <a
                        href={`/site/${site.subdomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        title="Open live website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {microsites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMicrosite(site.subdomain)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete storefront"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Create New Storefront Card */}
            <div
              onClick={() => setShowCreateModal(true)}
              className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10 p-6 flex flex-col items-center justify-center text-center gap-3 transition-all cursor-pointer min-h-[220px]"
            >
              <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Add Location Microsite</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
                  Deploy a dedicated sub-page or branded subdomain for another branch location.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 2: CONFIGURE SELECTED STOREFRONT
      ═══════════════════════════════════════════════════════════════════ */}
      {activeView === 'editor' && (
        <div className="space-y-6">
          {/* Active Store Status Header Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
                <Store className="w-5 h-5" />
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
                  Location: <strong className="text-slate-900">{brandName || selectedSubdomain}</strong> &bull; Industry: <strong className="text-slate-900">{industry}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Drag & Drop Studio</span>
              </Link>
            </div>
          </div>

          {/* Sub-Tabs: Identity, Catalog, Pages */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setEditorTab('identity')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                editorTab === 'identity'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Store Identity & CNAME
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('catalog')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                editorTab === 'catalog'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Catalog & Offerings ({menuItems.length})
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('pages')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                editorTab === 'pages'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Page Routes (4 Pages)
            </button>
          </div>

          {/* Sub-Tab 1: Identity & CNAME */}
          {editorTab === 'identity' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Store Profile & Contact</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Core brand identity and contact numbers for customer leads.</p>
                  </div>
                  {saveSuccess && (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <Check className="w-3.5 h-3.5" /> Saved!
                    </span>
                  )}
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Store Branch Name</label>
                      <input
                        type="text"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. Anna Nagar Flagship Store"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Industry Preset</label>
                      <IndustrySelect
                        value={industry}
                        onChange={setIndustry}
                        size="md"
                        align="left"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tagline / Mission</label>
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
                      <label className="text-xs font-semibold text-slate-700">Phone Number</label>
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Physical Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street Address, Area, City"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Operating Hours</label>
                      <input
                        type="text"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        placeholder="e.g. 9:00 AM - 9:00 PM (Daily)"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSaving ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Custom Domain CNAME */}
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">Custom Subdomain CNAME</h3>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Map this branch directly to your client's domain (e.g. <span className="font-mono text-slate-700 font-bold">annanagar.lakshmifood.com</span>).
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Subdomain Host</label>
                    <input
                      type="text"
                      placeholder="e.g. annanagar.lakshmifood.com"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 font-mono text-[10px]">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-400">DNS Type:</span>
                      <span className="font-bold text-slate-900">CNAME</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 py-1">
                      <span className="text-slate-400">Host:</span>
                      <span className="font-bold text-slate-900">{customDomain ? customDomain.split('.')[0] : selectedSubdomain}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">Points To:</span>
                      <span className="font-bold text-indigo-600">cname.localbi.app</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    Save CNAME
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Catalog & Offerings (Zero Mock Data) */}
          {editorTab === 'catalog' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-base text-slate-900">Branch Catalog & Offerings</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Products, services, consultations, or menu items for this location. Visible on <span className="font-mono text-slate-700">/menu</span> with instant WhatsApp ordering.
                </p>
              </div>

              {/* Add New Item Form */}
              <form onSubmit={handleAddCatalogItem} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">+ Add New Product / Service / Item</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Item / Service Name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <input
                    type="text"
                    placeholder="Category (e.g. Products, Consultations, Specials)"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <input
                    type="number"
                    placeholder="Price in ₹"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Brief description or highlights"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </form>

              {/* Items List (Zero Mock Data: empty state if empty) */}
              {menuItems.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">No catalog items added yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Use the form above to add products, services, or dishes for this location.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{item.name}</span>
                          <span className="text-[10px] text-indigo-700 font-semibold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                            {item.category}
                          </span>
                        </div>
                        {item.description && <p className="text-[11px] text-slate-500">{item.description}</p>}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm font-bold text-slate-900">₹{item.price}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCatalogItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Catalog Updates</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 3: Page Routes */}
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
                          Active
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Plus className="w-4 h-4" />
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

            <form onSubmit={handleCreateMicrosite} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Subdomain Slug *</label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-indigo-600">
                  <input
                    type="text"
                    required
                    placeholder="e.g. velachery or tnagar"
                    value={newStoreSubdomain}
                    onChange={(e) => setNewStoreSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none"
                  />
                  <span className="px-3 py-2 text-xs text-slate-400 font-mono bg-slate-50 border-l border-slate-200">
                    .localbi.app
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Store / Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Velachery Express Store"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Industry Preset</label>
                  <IndustrySelect
                    value={newStoreIndustry}
                    onChange={setNewStoreIndustry}
                    size="sm"
                    align="right"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Custom Subdomain CNAME (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. velachery.brandname.com"
                  value={newStoreCustomDomain}
                  onChange={(e) => setNewStoreCustomDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Physical Address</label>
                <input
                  type="text"
                  placeholder="Store street address and city"
                  value={newStoreAddress}
                  onChange={(e) => setNewStoreAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Phone</label>
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
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isCreating ? 'Deploying Storefront...' : 'Deploy Storefront'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
