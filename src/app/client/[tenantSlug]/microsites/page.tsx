'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import {
  Globe,
  Plus,
  Search,
  ExternalLink,
  Edit3,
  CheckCircle2,
  MapPin,
  Sparkles,
  Store,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Utensils,
  Briefcase,
  ShoppingBag,
  Sliders,
} from 'lucide-react';
import { MicrositeConfig, TemplateId } from '@/modules/microsites/microsite-service';

export default function MicrositesDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const resolvedParams = use(params);
  const { tenantSlug } = resolvedParams;

  const [microsites, setMicrosites] = useState<MicrositeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'DRAFT'>('ALL');

  // Modals state
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [activeSiteForDomain, setActiveSiteForDomain] = useState<MicrositeConfig | null>(null);
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [domainVerified, setDomainVerified] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardBrandName, setWizardBrandName] = useState('');
  const [wizardLocationName, setWizardLocationName] = useState('');
  const [wizardAddress, setWizardAddress] = useState('');
  const [wizardCity, setWizardCity] = useState('');
  const [wizardPhone, setWizardPhone] = useState('');
  const [wizardWhatsapp, setWizardWhatsapp] = useState('');
  const [wizardHours, setWizardHours] = useState('9:00 AM - 9:00 PM');
  const [wizardTagline, setWizardTagline] = useState('');
  const [wizardSubdomain, setWizardSubdomain] = useState('');
  const [wizardTemplate, setWizardTemplate] = useState<TemplateId>('restaurant');
  const [wizardPrimaryColor, setWizardPrimaryColor] = useState('#4F46E5');
  const [wizardSecondaryColor, setWizardSecondaryColor] = useState('#059669');
  const [isSubmittingWizard, setIsSubmittingWizard] = useState(false);

  // Fetch real brands & locations for pre-fill
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string; addressLine1: string; city: string; brandId: string }>>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sitesRes, brandsRes, locsRes] = await Promise.all([
        fetch(`/api/microsites?tenantSlug=${tenantSlug}`).then((r) => (r.ok ? r.json() : { microsites: [] })),
        fetch(`/api/tenants/${tenantSlug}/brands`).then((r) => (r.ok ? r.json() : { brands: [] })),
        fetch(`/api/tenants/${tenantSlug}/locations`).then((r) => (r.ok ? r.json() : { locations: [] })),
      ]);

      const loadedSites = sitesRes.microsites || [];
      setMicrosites(loadedSites);
      setBrands(brandsRes.brands || []);
      setLocations(locsRes.locations || []);

      // Pre-fill wizard default if real data exists
      if (brandsRes.brands?.[0]) {
        const b = brandsRes.brands[0];
        setWizardBrandName(b.name);
        setWizardSubdomain(b.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
      }
      if (locsRes.locations?.[0]) {
        const l = locsRes.locations[0];
        setWizardLocationName(l.name);
        setWizardAddress(l.addressLine1 || '');
        setWizardCity(l.city || '');
      }
    } catch (err) {
      console.error('Failed to load microsites data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantSlug]);

  // Filtered microsites
  const filteredSites = useMemo(() => {
    return microsites.filter((site) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        site.brandName.toLowerCase().includes(q) ||
        site.subdomain.toLowerCase().includes(q) ||
        (site.customDomain && site.customDomain.toLowerCase().includes(q)) ||
        site.city.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'LIVE' && site.status === 'PUBLISHED') ||
        (statusFilter === 'DRAFT' && site.status !== 'PUBLISHED');

      return matchesSearch && matchesStatus;
    });
  }, [microsites, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const live = microsites.filter((s) => s.status === 'PUBLISHED').length;
    const drafts = microsites.filter((s) => s.status !== 'PUBLISHED').length;
    const withDomain = microsites.filter((s) => s.customDomain).length;
    return { total: microsites.length, live, drafts, withDomain };
  }, [microsites]);

  // Auto-slug handler
  const handleBrandNameChange = (val: string) => {
    setWizardBrandName(val);
    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setWizardSubdomain(slug);
  };

  // Create wizard submission
  const handleCreateMicrosite = async (publishImmediately: boolean) => {
    if (!wizardSubdomain || !wizardBrandName) return;
    setIsSubmittingWizard(true);

    try {
      const payload = {
        tenantSlug,
        subdomain: wizardSubdomain,
        brandName: wizardBrandName,
        locationName: wizardLocationName || wizardBrandName,
        address: wizardAddress,
        city: wizardCity,
        phone: wizardPhone,
        whatsapp: wizardWhatsapp,
        hours: wizardHours,
        tagline: wizardTagline || 'Authentic Quality & Dedicated Local Hospitality',
        templateId: wizardTemplate,
        primaryColor: wizardPrimaryColor,
        secondaryColor: wizardSecondaryColor,
        published: publishImmediately,
        status: publishImmediately ? 'PUBLISHED' : 'DRAFT',
      };

      const res = await fetch('/api/microsites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowCreateWizard(false);
        setWizardStep(1);
        loadData();
      }
    } catch (err) {
      console.error('Failed to create microsite:', err);
    } finally {
      setIsSubmittingWizard(false);
    }
  };

  // Toggle publish / unpublish
  const handleTogglePublish = async (site: MicrositeConfig) => {
    const action = site.status === 'PUBLISHED' ? 'unpublish' : 'publish';
    try {
      await fetch(`/api/microsites/${site.subdomain}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    }
  };

  // Delete site
  const handleDeleteSite = async (subdomain: string) => {
    if (!confirm(`Are you sure you want to delete the microsite "${subdomain}"?`)) return;
    try {
      await fetch(`/api/microsites/${subdomain}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('Failed to delete microsite:', err);
    }
  };

  // Connect custom domain
  const handleSaveDomain = async () => {
    if (!activeSiteForDomain || !customDomainInput) return;
    try {
      await fetch(`/api/microsites/${activeSiteForDomain.subdomain}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connectDomain',
          customDomain: customDomainInput,
        }),
      });
      setDomainVerified(true);
      setTimeout(() => {
        setShowDomainModal(false);
        setActiveSiteForDomain(null);
        setDomainVerified(false);
        loadData();
      }, 1500);
    } catch (err) {
      console.error('Failed to connect domain:', err);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16 font-sans text-slate-900">
      {/* ── Top Header & Stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Storefront Microsites
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Create, customize, and publish high-converting local websites for every location.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/client/${tenantSlug}/reports?tab=gsc`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <span>Website Analytics</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={() => setShowCreateWizard(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Microsite</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Sites</p>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Live & Published</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-black text-emerald-700">{stats.live}</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Drafts</p>
          <p className="text-2xl font-black text-amber-700">{stats.drafts}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Custom Domains</p>
          <p className="text-2xl font-black text-indigo-700">{stats.withDomain}</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by site name, subdomain, city or domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/70 border border-slate-200/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All ({microsites.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('LIVE')}
            className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'LIVE' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Live ({stats.live})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DRAFT')}
            className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === 'DRAFT' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Drafts ({stats.drafts})
          </button>
        </div>
      </div>

      {/* ── Microsites Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-white border border-slate-200/80 animate-pulse p-6 space-y-4">
              <div className="h-6 w-32 bg-slate-100 rounded-lg" />
              <div className="h-4 w-48 bg-slate-100 rounded-lg" />
              <div className="h-24 bg-slate-50 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4 p-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <Store className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900">No storefront microsites found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Launch dedicated, high-converting branch storefronts for your store locations in under 2 minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateWizard(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Storefront</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSites.map((site) => {
            const isLive = site.status === 'PUBLISHED';
            const liveUrl = site.customDomain ? `https://${site.customDomain}` : `/site/${site.subdomain}`;

            return (
              <div
                key={site.subdomain}
                className="group flex flex-col justify-between rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Card Header & Status */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-xs shrink-0"
                        style={{ backgroundColor: site.primaryColor || '#4F46E5' }}
                      >
                        {site.brandName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {site.brandName}
                        </h3>
                        <p className="font-mono text-[11px] text-slate-500 truncate mt-0.5">
                          {site.subdomain}.localbi.app
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                        isLive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      <span>{isLive ? 'Live' : 'Draft'}</span>
                    </div>
                  </div>

                  {/* Custom Domain Badge */}
                  {site.customDomain ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
                      <div className="flex items-center gap-1.5 text-indigo-900 font-mono text-[11px] truncate">
                        <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{site.customDomain}</span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded">Active</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSiteForDomain(site);
                        setCustomDomainInput('');
                        setShowDomainModal(true);
                      }}
                      className="w-full text-left flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/60 text-xs text-slate-600 transition-colors cursor-pointer group/dom"
                    >
                      <span className="text-[11px] flex items-center gap-1.5 text-slate-500">
                        <Globe className="w-3.5 h-3.5 text-slate-400 group-hover/dom:text-indigo-600" />
                        Connect custom domain
                      </span>
                      <span className="text-[10px] font-semibold text-indigo-600 hover:underline">+ Connect</span>
                    </button>
                  )}

                  {/* Metadata Chips */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 truncate text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{site.address || site.city || 'Store Location'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="capitalize">{site.industry?.toLowerCase() || 'Retail'} Theme</span>
                      <span>4 Pages</span>
                      <span>v{site.version || 1}.0</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Link
                      href={`/client/${tenantSlug}/microsites/${site.subdomain}/builder`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-colors text-center"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Site</span>
                    </Link>

                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs shadow-2xs transition-colors"
                      title="View live site in new window"
                    >
                      <span>Live</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>

                  {/* Quick Action Dropdown Trigger */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(site)}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        isLive
                          ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      title={isLive ? 'Unpublish website (set to draft)' : 'Publish website live'}
                    >
                      {isLive ? 'Draft' : 'Publish'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSite(site.subdomain)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete microsite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* "Add Another Location" Action Card */}
          <button
            type="button"
            onClick={() => setShowCreateWizard(true)}
            className="flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 text-slate-500 hover:text-indigo-600 transition-all cursor-pointer space-y-3 min-h-[260px] group"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-100/70 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-colors shadow-2xs">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-center space-y-0.5">
              <p className="font-bold text-sm text-slate-800 group-hover:text-indigo-600">Add Another Location Website</p>
              <p className="text-xs text-slate-400">Launch in under 2 minutes with auto-filled business details</p>
            </div>
          </button>
        </div>
      )}

      {/* ── CREATE MICROSITE WIZARD MODAL ── */}
      {showCreateWizard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Wizard Header & Progress */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px]">
                    Step {wizardStep} of 4
                  </span>
                  <h3 className="font-bold text-base text-slate-900">
                    {wizardStep === 1 && 'Business & Location Details'}
                    {wizardStep === 2 && 'Choose Website Address'}
                    {wizardStep === 3 && 'Style & Visual Template'}
                    {wizardStep === 4 && 'Review & Instant Launch'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {wizardStep === 1 && 'Select your store location or enter details to pre-fill the storefront.'}
                  {wizardStep === 2 && 'Pick your unique localbi.app subdomain address.'}
                  {wizardStep === 3 && 'Choose a tailored industry design theme and brand color.'}
                  {wizardStep === 4 && 'Check your settings and launch your website.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateWizard(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Wizard Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* STEP 1: BUSINESS DETAILS */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  {/* Brand Selector if brands exist */}
                  {brands.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Select Brand</label>
                      <select
                        value={wizardBrandName}
                        onChange={(e) => {
                          setWizardBrandName(e.target.value);
                          setWizardSubdomain(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]/g, '-')
                              .replace(/-+/g, '-')
                          );
                        }}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-indigo-600"
                      >
                        {brands.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Location Selector if locations exist */}
                  {locations.length > 0 && (
                    <div className="space-y-1.5 p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                      <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Quick-Fill from Existing Store Location:
                      </label>
                      <select
                        onChange={(e) => {
                          const loc = locations.find((l) => l.id === e.target.value);
                          if (loc) {
                            setWizardLocationName(loc.name);
                            setWizardAddress(loc.addressLine1 || '');
                            setWizardCity(loc.city || '');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-indigo-200 text-slate-900 font-semibold focus:outline-none focus:border-indigo-600"
                      >
                        <option value="">Select a location to auto-fill...</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} - {loc.city} ({loc.addressLine1})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Business / Store Name *</label>
                      <input
                        type="text"
                        required
                        value={wizardBrandName}
                        onChange={(e) => handleBrandNameChange(e.target.value)}
                        placeholder="e.g. Downtown Flagship Store"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Operating City *</label>
                      <input
                        type="text"
                        value={wizardCity}
                        onChange={(e) => setWizardCity(e.target.value)}
                        placeholder="e.g. Chennai"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Street Address</label>
                    <input
                      type="text"
                      value={wizardAddress}
                      onChange={(e) => setWizardAddress(e.target.value)}
                      placeholder="e.g. 14, 2nd Avenue, Downtown"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                      <input
                        type="text"
                        value={wizardPhone}
                        onChange={(e) => setWizardPhone(e.target.value)}
                        placeholder="+91..."
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">WhatsApp Order Number</label>
                      <input
                        type="text"
                        value={wizardWhatsapp}
                        onChange={(e) => setWizardWhatsapp(e.target.value)}
                        placeholder="+91..."
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Daily Hours</label>
                      <input
                        type="text"
                        value={wizardHours}
                        onChange={(e) => setWizardHours(e.target.value)}
                        placeholder="e.g. 8:00 AM - 10:00 PM"
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Headline / Tagline</label>
                    <input
                      type="text"
                      value={wizardTagline}
                      onChange={(e) => setWizardTagline(e.target.value)}
                      placeholder="e.g. Authentic Flavors & Dedicated Local Service"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: WEBSITE ADDRESS */}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-900">Choose your website subdomain</label>
                    <div className="flex items-center rounded-2xl border-2 border-indigo-200 bg-white overflow-hidden p-1 focus-within:border-indigo-600 shadow-2xs">
                      <span className="px-3 text-slate-400 font-mono text-xs">https://</span>
                      <input
                        type="text"
                        required
                        value={wizardSubdomain}
                        onChange={(e) => setWizardSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        placeholder="store-name"
                        className="flex-1 px-2 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none"
                      />
                      <span className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 font-mono text-xs font-bold">
                        .localbi.app
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Address is valid and available for instant publishing.</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Globe className="w-4 h-4 text-indigo-600" />
                      <span>Want to use your own domain (e.g. store.yourbrand.com)?</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      You can connect any custom domain after launching with a simple CNAME record. No technical setup required now.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: STYLE & TEMPLATE */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-900">Select Industry Design Theme</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'restaurant' as TemplateId, label: 'Restaurant & Cafe', icon: Utensils, desc: 'Menu cards, food specials & WhatsApp ordering' },
                        { id: 'retail' as TemplateId, label: 'Retail & Storefront', icon: ShoppingBag, desc: 'Product showcase, catalogs & store visits' },
                        { id: 'services' as TemplateId, label: 'Services & Clinic', icon: Briefcase, desc: 'Appointment booking, services & testimonials' },
                        { id: 'modern' as TemplateId, label: 'Modern & Clean', icon: Sparkles, desc: 'Bold hero, trust badges & fast contact' },
                        { id: 'minimal' as TemplateId, label: 'Minimalist', icon: Sliders, desc: 'Streamlined typography & essential details' },
                        { id: 'professional' as TemplateId, label: 'Enterprise Local', icon: ShieldCheck, desc: 'High-trust multi-branch presentation' },
                      ].map((tmpl) => {
                        const Icon = tmpl.icon;
                        const isSelected = wizardTemplate === tmpl.id;
                        return (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => setWizardTemplate(tmpl.id)}
                            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-600/20'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <p className="font-bold text-xs text-slate-900">{tmpl.label}</p>
                              <p className="text-[11px] text-slate-500 leading-snug">{tmpl.desc}</p>
                            </div>
                            {isSelected && <span className="text-[10px] font-bold text-indigo-600 mt-2">✓ Selected</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Primary Brand Color</label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-white">
                        <input
                          type="color"
                          value={wizardPrimaryColor}
                          onChange={(e) => setWizardPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0"
                        />
                        <span className="font-mono text-xs font-bold text-slate-700">{wizardPrimaryColor}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Accent Color</label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-white">
                        <input
                          type="color"
                          value={wizardSecondaryColor}
                          onChange={(e) => setWizardSecondaryColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0"
                        />
                        <span className="font-mono text-xs font-bold text-slate-700">{wizardSecondaryColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & LAUNCH */}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                    <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
                      Storefront Summary
                    </h4>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Store Name:</span>
                        <p className="font-bold text-slate-900 mt-0.5">{wizardBrandName}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Website Address:</span>
                        <p className="font-mono font-bold text-indigo-600 mt-0.5">{wizardSubdomain}.localbi.app</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Location:</span>
                        <p className="font-medium text-slate-800 mt-0.5">{wizardAddress || wizardCity}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Theme:</span>
                        <p className="font-medium text-slate-800 mt-0.5 capitalize">{wizardTemplate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 space-y-1">
                      <p className="font-bold">Ready for instant publishing</p>
                      <p className="text-emerald-700 leading-relaxed">
                        Click "Create & Publish" to go live immediately, or "Save as Draft" to customize blocks first in the visual studio.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Navigation Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((s) => (s - 1) as any)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!wizardBrandName && wizardStep === 1) return alert('Please enter a business name');
                      setWizardStep((s) => (s + 1) as any);
                    }}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    Continue →
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isSubmittingWizard}
                      onClick={() => handleCreateMicrosite(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingWizard}
                      onClick={() => handleCreateMicrosite(true)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingWizard ? 'Launching...' : '🚀 Create & Publish Live'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FRIENDLY CUSTOM DOMAIN MODAL ── */}
      {showDomainModal && activeSiteForDomain && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Connect Custom Domain</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDomainModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Enter your custom domain or subdomain</label>
                <input
                  type="text"
                  placeholder="e.g. store.yourbrand.com or www.yourbrand.com"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value.toLowerCase().trim())}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Simple Plain-Language DNS Record */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-800">
                  Add this CNAME record in your domain provider (GoDaddy, Cloudflare, Namecheap):
                </p>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Record Type:</span>
                      <span className="font-bold text-slate-800">CNAME</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Host / Name:</span>
                      <span className="font-bold text-slate-800">{customDomainInput.split('.')[0] || 'store'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(customDomainInput.split('.')[0] || 'store', 'host')}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
                    >
                      {copiedKey === 'host' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Value / Target:</span>
                      <span className="font-bold text-indigo-600">domains.localbi.app</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('domains.localbi.app', 'target')}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer"
                    >
                      {copiedKey === 'target' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {domainVerified && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Domain verified and connected! SSL provisioned.</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDomainModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDomain}
                disabled={!customDomainInput}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                Verify & Connect Domain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
