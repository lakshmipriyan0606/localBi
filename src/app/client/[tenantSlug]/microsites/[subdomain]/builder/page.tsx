'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  Save,
  Check,
  Clock,
  MapPin,
  Sparkles,
  Trash2,
  Copy,
  ShieldCheck,
  Smartphone,
  Monitor,
  Tablet,
  Eye,
  EyeOff,
  ArrowRight,
  UtensilsCrossed,
  RotateCcw,
  RotateCw,
  MoreVertical,
  Layers,
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  MessageSquareQuote,
  MessageCircle,
  Mail,
  Star,
  Share2,
  Globe,
  Plus,
  ChevronUp,
  ChevronDown,
  Search,
  AlertCircle,
  X,
  GripVertical,
  CheckCircle,
} from 'lucide-react';
import { MicrositeConfig } from '@/modules/microsites/microsite-service';
import type { Data } from '@measured/puck';
import { PuckComponentProps } from '@/modules/microsites/puck-config';

// ── Types for Builder Section Blocks ──────────────────────────────────────────
export interface BuilderSection {
  id: string;
  type: string;
  title: string;
  category: 'BASIC' | 'BUSINESS' | 'CONTACT';
  hidden?: boolean;
  props: Record<string, any>;
}

export default function StorefrontBuilderStudio({
  params,
}: {
  params: Promise<{ tenantSlug: string; subdomain: string }>;
}) {
  const resolvedParams = use(params);
  const { tenantSlug, subdomain } = resolvedParams;

  // Site Configuration & Sections
  const [site, setSite] = useState<MicrositeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Editor Workspace State
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeLeftTab, setActiveLeftTab] = useState<'components' | 'sections' | 'theme'>('components');
  const [activeRightTab, setActiveRightTab] = useState<'settings' | 'seo' | 'domain'>('settings');
  const [componentSearch, setComponentSearch] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Live Sections on Canvas
  const [sections, setSections] = useState<BuilderSection[]>([]);
  // History for Undo / Redo
  const [history, setHistory] = useState<BuilderSection[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Form State for Page/Global Settings (Right Inspector)
  const [pageTitle, setPageTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#D97706');
  const [secondaryColor, setSecondaryColor] = useState('#059669');
  const [fontFamily, setFontFamily] = useState('Inter (Modern)');
  const [showLogo, setShowLogo] = useState(true);
  const [navItems, setNavItems] = useState([
    { id: 'home', label: 'Home', enabled: true },
    { id: 'menu', label: 'Menu', enabled: true },
    { id: 'about', label: 'About', enabled: true },
    { id: 'gallery', label: 'Gallery', enabled: true },
    { id: 'contact', label: 'Contact', enabled: true },
  ]);

  // Saving / Publishing State
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // ── Load Microsite & Initial Sections ─────────────────────────────────────
  useEffect(() => {
    async function loadSiteData() {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await fetch(`/api/microsites/${subdomain}`);
        if (!res.ok) {
          throw new Error('Failed to load microsite');
        }
        const json = await res.json();
        const siteData: MicrositeConfig = json.microsite;
        setSite(siteData);

        // Pre-fill Right Inspector Page Settings
        setPageTitle(siteData.brandName || 'Storefront');
        setTagline(siteData.tagline || 'Authentic Specialties & Fresh Delicacies');
        setDescription(
          siteData.aboutStory ||
            'Enjoy freshly prepared traditional dishes made with high-quality ingredients.'
        );
        setPrimaryColor(siteData.primaryColor || '#D97706');
        setSecondaryColor(siteData.secondaryColor || '#059669');
        setFontFamily(siteData.font || 'Inter (Modern)');

        // Convert existing puckData or synthesize default builder sections
        let initialSections: BuilderSection[] = [];
        const puckRes = await fetch(`/api/microsites/${subdomain}/puck`);
        if (puckRes.ok) {
          const puckJson = await puckRes.json();
          if (puckJson.data?.content && puckJson.data.content.length > 0) {
            initialSections = puckJson.data.content.map((item: any, idx: number) => ({
              id: item.props?.id || `sec-${idx}-${Date.now()}`,
              type: item.type,
              title: getSectionHumanTitle(item.type),
              category: getSectionCategory(item.type),
              props: { ...item.props },
            }));
          }
        }

        // If no sections in puck, construct rich default layout based on real location data
        if (initialSections.length === 0) {
          initialSections = createDefaultSections(siteData);
        }

        setSections(initialSections);
        setHistory([initialSections]);
        setHistoryIndex(0);
      } catch (err: any) {
        console.error('Failed to load microsite builder:', err);
        setLoadError(err.message || 'Unable to load site builder');
      } finally {
        setLoading(false);
      }
    }

    loadSiteData();
  }, [subdomain]);

  // Push new state to history for Undo/Redo
  const updateSectionsWithHistory = (newSections: BuilderSection[]) => {
    setSections(newSections);
    setHasUnsavedChanges(true);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSections);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = historyIndex - 1;
      setHistoryIndex(prev);
      setSections(history[prev] || []);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setSections(history[next] || []);
      setHasUnsavedChanges(true);
    }
  };

  // Convert builder sections to Puck Data format for live renderer
  const buildPuckData = (): Data<PuckComponentProps> => {
    return {
      root: {
        props: {
          title: pageTitle || site?.brandName || 'Storefront',
        },
      },
      content: sections
        .filter((sec) => !sec.hidden)
        .map((sec) => ({
          type: sec.type as any,
          props: {
            ...sec.props,
            id: sec.id,
          },
        })),
    };
  };

  // ── Save Draft / Changes ──────────────────────────────────────────────────
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const puckPayload = buildPuckData();

      // 1. Save visual layout to Puck endpoint
      await fetch(`/api/microsites/${subdomain}/puck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: puckPayload }),
      });

      // 2. Save site metadata and theme
      await fetch(`/api/microsites/${subdomain}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: pageTitle,
          tagline,
          aboutStory: description,
          primaryColor,
          secondaryColor,
          font: fontFamily,
          draftData: puckPayload,
          status: 'UNPUBLISHED_CHANGES',
        }),
      });

      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Publish Live ──────────────────────────────────────────────────────────
  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishSuccess(false);
    try {
      const puckPayload = buildPuckData();

      // 1. Save visual layout
      await fetch(`/api/microsites/${subdomain}/puck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: puckPayload }),
      });

      // 2. Publish site
      const res = await fetch(`/api/microsites/${subdomain}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish',
          brandName: pageTitle,
          tagline,
          aboutStory: description,
          primaryColor,
          secondaryColor,
          font: fontFamily,
          publishedData: puckPayload,
        }),
      });

      if (res.ok) {
        setPublishSuccess(true);
        setHasUnsavedChanges(false);
        if (site) {
          setSite({ ...site, published: true, status: 'PUBLISHED' });
        }
        setTimeout(() => setPublishSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Publish failed:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Section Manipulation Handlers ─────────────────────────────────────────
  const handleAddSection = (type: string) => {
    const newSection: BuilderSection = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title: getSectionHumanTitle(type),
      category: getSectionCategory(type),
      props: getDefaultPropsForType(type, site, pageTitle, primaryColor, secondaryColor),
    };

    const updated = [...sections, newSection];
    updateSectionsWithHistory(updated);
    setSelectedSectionId(newSection.id);
    setActiveRightTab('settings');
    setShowAddSectionModal(false);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...sections];
    const item = updated.splice(index, 1)[0];
    if (item) {
      updated.splice(index - 1, 0, item);
      updateSectionsWithHistory(updated);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const updated = [...sections];
    const item = updated.splice(index, 1)[0];
    if (item) {
      updated.splice(index + 1, 0, item);
      updateSectionsWithHistory(updated);
    }
  };

  const handleDuplicate = (index: number) => {
    const original = sections[index];
    if (!original) return;
    const duplicated: BuilderSection = {
      ...original,
      id: `sec-${Date.now()}`,
      title: `${original.title} (Copy)`,
      props: { ...original.props },
    };
    const updated = [...sections];
    updated.splice(index + 1, 0, duplicated);
    updateSectionsWithHistory(updated);
    setSelectedSectionId(duplicated.id);
  };

  const handleDelete = (index: number) => {
    const target = sections[index];
    if (!target) return;
    const updated = sections.filter((_, i) => i !== index);
    updateSectionsWithHistory(updated);
    if (selectedSectionId === target.id) {
      setSelectedSectionId(null);
    }
  };

  const handleToggleHidden = (index: number) => {
    const updated = [...sections];
    const s = updated[index];
    if (s) {
      s.hidden = !s.hidden;
      updateSectionsWithHistory(updated);
    }
  };

  // Find currently selected section
  const selectedSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId) || null;
  }, [sections, selectedSectionId]);

  const updateSelectedSectionProps = (field: string, value: any) => {
    if (!selectedSectionId) return;
    const updated = sections.map((s) => {
      if (s.id === selectedSectionId) {
        return {
          ...s,
          props: {
            ...s.props,
            [field]: value,
          },
        };
      }
      return s;
    });
    updateSectionsWithHistory(updated);
  };

  // Filter components by search query
  const filteredComponents = useMemo(() => {
    const query = componentSearch.toLowerCase().trim();
    if (!query) return ALL_COMPONENT_REGISTRY;
    return ALL_COMPONENT_REGISTRY.filter(
      (c) =>
        c.label.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query) ||
        c.desc.toLowerCase().includes(query)
    );
  }, [componentSearch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto shadow-md" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Opening Storefront Builder...</h3>
            <p className="text-xs text-slate-500 font-mono">{subdomain}.localbi.app</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Website Builder Failed to Load</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{loadError}</p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href={`/client/${tenantSlug}/microsites`}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              Back to Microsites
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans text-slate-900 select-none overflow-hidden h-screen">
      {/* ══════════════════════════════════════════════════════════════════════
          TOP BAR (Matches Screenshot Header & Controls)
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-50 shrink-0 shadow-2xs">
        {/* Left: Breadcrumbs & Live Status */}
        <div className="flex items-center gap-3">
          <Link
            href={`/client/${tenantSlug}/microsites`}
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors"
            title="Back to Microsites"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-sm text-slate-900">Storefront Builder</span>
              <span className="text-slate-400 font-medium text-xs">&gt;</span>
              <span className="font-semibold text-xs text-slate-800">
                {pageTitle || site?.brandName} ({subdomain}.localbi.app)
              </span>
            </div>

            {/* Status Badge */}
            {site?.status === 'PUBLISHED' && !hasUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live & Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {hasUnsavedChanges ? 'Unpublished Changes' : 'Draft'}
              </span>
            )}
          </div>
        </div>

        {/* Center: Device Viewport Switcher & Undo/Redo */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewport === 'desktop'
                  ? 'bg-white shadow-xs text-indigo-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Desktop View (Full Screen)"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewport === 'tablet'
                  ? 'bg-white shadow-xs text-indigo-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewport === 'mobile'
                  ? 'bg-white shadow-xs text-indigo-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Mobile View (390px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {/* History Controls */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Preview</span>
          </button>

          <a
            href={`/site/${subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <span>View Live</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          {/* Primary Save / Publish Button */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPublishing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Publishing Live...</span>
              </>
            ) : publishSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Published Live!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>

          {/* More Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveChanges();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-slate-400" />
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://${subdomain}.localbi.app`);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  {copiedUrl ? 'Copied Link!' : 'Copy Public URL'}
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Reset canvas to default restaurant layout? Current visual changes will be reset.')) {
                      if (site) {
                        const def = createDefaultSections(site);
                        updateSectionsWithHistory(def);
                      }
                    }
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Default
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN BODY (3-Column Layout: Left Sidebar, Live Canvas, Right Inspector)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT SIDEBAR (Width: 320px) ─────────────────────────────────── */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
          {/* Sidebar Top Tabs */}
          <div className="grid grid-cols-3 border-b border-slate-200 text-xs font-semibold text-center">
            <button
              type="button"
              onClick={() => setActiveLeftTab('components')}
              className={`py-3 transition-colors cursor-pointer border-b-2 ${
                activeLeftTab === 'components'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Components
            </button>
            <button
              type="button"
              onClick={() => setActiveLeftTab('sections')}
              className={`py-3 transition-colors cursor-pointer border-b-2 ${
                activeLeftTab === 'sections'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Sections ({sections.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveLeftTab('theme')}
              className={`py-3 transition-colors cursor-pointer border-b-2 ${
                activeLeftTab === 'theme'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Theme
            </button>
          </div>

          {/* TAB 1: COMPONENTS (Palette with Basic, Business, Contact Cards) */}
          {activeLeftTab === 'components' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search Bar */}
              <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search components..."
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Click any component to add to your page</p>
              </div>

              {/* Component Categories Grid */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
                {componentSearch.trim() ? (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Search Results ({filteredComponents.length})
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {filteredComponents.map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => handleAddSection(item.type)}
                          className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-center group cursor-pointer flex flex-col items-center gap-1.5 shadow-2xs hover:shadow-xs"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-indigo-100/60 text-slate-600 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                            <item.icon className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700 group-hover:text-indigo-900 leading-tight">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Category 1: BASIC */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Basic
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {BASIC_COMPONENTS.map((item) => (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => handleAddSection(item.type)}
                            className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-center group cursor-pointer flex flex-col items-center gap-1.5 shadow-2xs hover:shadow-xs"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-indigo-100/60 text-slate-600 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                              <item.icon className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-700 group-hover:text-indigo-900 leading-tight">
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                {/* Category 2: BUSINESS */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Business
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {BUSINESS_COMPONENTS.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleAddSection(item.type)}
                        className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-center group cursor-pointer flex flex-col items-center gap-1.5 shadow-2xs hover:shadow-xs"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-indigo-100/60 text-slate-600 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 group-hover:text-indigo-900 leading-tight">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category 3: CONTACT & ACTION */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Contact & Action
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {CONTACT_COMPONENTS.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleAddSection(item.type)}
                        className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-center group cursor-pointer flex flex-col items-center gap-1.5 shadow-2xs hover:shadow-xs"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-indigo-100/60 text-slate-600 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 group-hover:text-indigo-900 leading-tight">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

          {/* TAB 2: SECTIONS (List of active sections with reorder & delete) */}
          {activeLeftTab === 'sections' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Page Structure</span>
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Section
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    onClick={() => {
                      setSelectedSectionId(sec.id);
                      setActiveRightTab('settings');
                    }}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                      selectedSectionId === sec.id
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{sec.title}</span>
                          {sec.hidden && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-medium">
                              Hidden
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">{sec.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveUp(idx);
                        }}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveDown(idx);
                        }}
                        disabled={idx === sections.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleHidden(idx);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title={sec.hidden ? 'Show Section' : 'Hide Section'}
                      >
                        {sec.hidden ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(idx);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(idx);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: THEME */}
          {activeLeftTab === 'theme' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs">Brand Colors</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1">
                      Primary Accent
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 font-medium block mb-1">
                      Secondary Accent
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => {
                          setSecondaryColor(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => {
                          setSecondaryColor(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs">Typography</h4>
                <select
                  value={fontFamily}
                  onChange={(e) => {
                    setFontFamily(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="Inter (Modern)">Inter (Modern & Clean)</option>
                  <option value="Outfit">Outfit (Crisp & Contemporary)</option>
                  <option value="Playfair Display">Playfair Display (Luxury & Dining)</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans (Tech)</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs">Curated Color Palettes</h4>
                <div className="grid grid-cols-2 gap-2">
                  {PALETTE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(p.primary);
                        setSecondaryColor(p.secondary);
                        setHasUnsavedChanges(true);
                      }}
                      className="p-2 rounded-xl border border-slate-200 hover:border-indigo-400 bg-white text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.primary }} />
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: p.secondary }} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ── CENTER WORKSPACE: REAL WYSIWYG LIVE CANVAS ───────────────────── */}
        <main className="flex-1 bg-slate-100/70 p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
          {/* Viewport Frame */}
          <div
            className={`w-full transition-all duration-300 ${
              viewport === 'desktop'
                ? 'max-w-5xl'
                : viewport === 'tablet'
                ? 'max-w-[768px]'
                : 'max-w-[390px]'
            }`}
          >
            {/* Storefront Window Shell */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
              {/* Canvas Browser Header Bar (Cosmetic simulated browser) */}
              <div className="h-8 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                </div>
                <div className="font-mono text-[10px] text-slate-400 bg-white px-3 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                  https://{subdomain}.localbi.app
                </div>
                <div className="text-[10px] text-slate-400">Interactive Canvas</div>
              </div>

              {/* Render All Canvas Sections */}
              <div className="divide-y divide-transparent">
                {sections.map((section, idx) => {
                  if (section.hidden) return null;
                  const isSelected = selectedSectionId === section.id;

                  return (
                    <div
                      key={section.id}
                      onClick={() => {
                        setSelectedSectionId(section.id);
                        setActiveRightTab('settings');
                      }}
                      className={`relative group transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-indigo-600 ring-offset-1 z-10'
                          : 'hover:outline hover:outline-2 hover:outline-indigo-300 hover:outline-dashed'
                      }`}
                    >
                      {/* Floating Mini Action Toolbar on Active/Hover */}
                      <div
                        className={`absolute -top-3.5 right-4 z-20 flex items-center gap-1 bg-indigo-600 text-white px-2 py-0.5 rounded-lg shadow-md text-[10px] font-semibold transition-opacity ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <span className="pr-1">{section.title}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveUp(idx);
                          }}
                          disabled={idx === 0}
                          className="hover:bg-indigo-700 p-0.5 rounded disabled:opacity-30"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveDown(idx);
                          }}
                          disabled={idx === sections.length - 1}
                          className="hover:bg-indigo-700 p-0.5 rounded disabled:opacity-30"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(idx);
                          }}
                          className="hover:bg-indigo-700 p-0.5 rounded"
                          title="Duplicate"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(idx);
                          }}
                          className="hover:bg-rose-600 p-0.5 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Render Visual Section Preview */}
                      <CanvasSectionRenderer
                        section={section}
                        site={site}
                        primaryColor={primaryColor}
                        secondaryColor={secondaryColor}
                        fontFamily={fontFamily}
                        pageTitle={pageTitle}
                        tagline={tagline}
                        showLogo={showLogo}
                        navItems={navItems}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Add Section Button at Canvas Bottom */}
            <div className="py-6 text-center">
              <button
                type="button"
                onClick={() => setShowAddSectionModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-dashed border-indigo-300 hover:border-indigo-600 text-indigo-600 font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Section to Page</span>
              </button>
            </div>
          </div>
        </main>

        {/* ── RIGHT SIDEBAR: CONTEXT-SENSITIVE INSPECTOR (Width: 320px) ───── */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
          {/* Inspector Tabs */}
          <div className="grid grid-cols-3 border-b border-slate-200 text-xs font-semibold text-center">
            <button
              type="button"
              onClick={() => setActiveRightTab('settings')}
              className={`py-3 transition-colors cursor-pointer border-b-2 ${
                activeRightTab === 'settings'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Page Settings
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('seo')}
              className={`py-3 transition-colors cursor-pointer border-b-2 ${
                activeRightTab === 'seo'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              SEO
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('domain')}
              className={`py-3 transition-colors cursor-pointer border-b-2 ${
                activeRightTab === 'domain'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Domain
            </button>
          </div>

          {/* TAB 1: PAGE SETTINGS / CONTEXT SECTION INSPECTOR */}
          {activeRightTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {/* Context Header: If a specific section is selected */}
              {selectedSection ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                        Edit Section
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{selectedSection.title}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSectionId(null)}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Clear Selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dynamic Form for Selected Section */}
                  <SectionPropertiesForm
                    section={selectedSection}
                    onChange={(field, value) => updateSelectedSectionProps(field, value)}
                  />
                </div>
              ) : (
                /* Global Storefront / Page Settings (Matches Screenshot) */
                <div className="space-y-5">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs">Basic Info</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-slate-500 font-medium block mb-1">
                          Page Title
                        </label>
                        <input
                          type="text"
                          value={pageTitle}
                          onChange={(e) => {
                            setPageTitle(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:ring-1 focus:ring-indigo-600"
                          placeholder="Store or Business Name"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-500 font-medium block mb-1">
                          Tagline / Headline
                        </label>
                        <input
                          type="text"
                          value={tagline}
                          onChange={(e) => {
                            setTagline(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:ring-1 focus:ring-indigo-600"
                          placeholder="Authentic Specialties & Fresh Delicacies"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-500 font-medium block mb-1">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => {
                            setDescription(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs leading-relaxed focus:ring-1 focus:ring-indigo-600"
                          placeholder="Enjoy freshly prepared traditional dishes..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Brand & Appearance */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="font-bold text-slate-900 text-xs">Brand & Appearance</h4>
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-medium block mb-1">
                            Primary Color
                          </label>
                          <div className="flex items-center gap-1.5 p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => {
                                setPrimaryColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-6 h-6 rounded-md border-0 cursor-pointer p-0"
                            />
                            <span className="font-mono text-[11px] font-semibold text-slate-700">
                              {primaryColor}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 font-medium block mb-1">
                            Secondary Color
                          </label>
                          <div className="flex items-center gap-1.5 p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                            <input
                              type="color"
                              value={secondaryColor}
                              onChange={(e) => {
                                setSecondaryColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-6 h-6 rounded-md border-0 cursor-pointer p-0"
                            />
                            <span className="font-mono text-[11px] font-semibold text-slate-700">
                              {secondaryColor}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-500 font-medium block mb-1">
                          Font
                        </label>
                        <select
                          value={fontFamily}
                          onChange={(e) => {
                            setFontFamily(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-medium"
                        >
                          <option value="Inter (Modern)">Inter (Modern)</option>
                          <option value="Outfit">Outfit (Crisp)</option>
                          <option value="Playfair Display">Playfair Display (Serif)</option>
                          <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Header Options */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="font-bold text-slate-900 text-xs">Header</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-700 font-medium">Show Logo</span>
                        <input
                          type="checkbox"
                          checked={showLogo}
                          onChange={(e) => {
                            setShowLogo(e.target.checked);
                            setHasUnsavedChanges(true);
                          }}
                          className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                            🍲
                          </div>
                          <span className="text-[11px] font-semibold text-slate-700">Store Logo</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => alert('Logo can be uploaded or synced directly from your Google Business Profile.')}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                        >
                          Change Logo
                        </button>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] text-slate-500 font-medium block">
                          Navigation Menu
                        </span>
                        {navItems.map((nav, idx) => (
                          <div key={nav.id} className="flex items-center justify-between py-1">
                            <span className="text-xs text-slate-700">{nav.label}</span>
                            <input
                              type="checkbox"
                              checked={nav.enabled}
                              onChange={(e) => {
                                const updated = [...navItems];
                                const currentNav = updated[idx];
                                if (currentNav) {
                                  currentNav.enabled = e.target.checked;
                                  setNavItems(updated);
                                  setHasUnsavedChanges(true);
                                }
                              }}
                              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEO INSPECTOR */}
          {activeRightTab === 'seo' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <h4 className="font-bold text-slate-900 text-xs">Search Engine Optimization</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Control how this local storefront appears on Google Search and social media previews.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={`${pageTitle || site?.brandName} | Official Storefront`}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs leading-relaxed"
                  />
                </div>
              </div>

              {/* Google SERP Preview Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Google Preview
                </span>
                <div className="text-[11px] text-emerald-700 truncate">
                  https://{subdomain}.localbi.app
                </div>
                <div className="font-medium text-xs text-blue-700 line-clamp-1 hover:underline">
                  {pageTitle || site?.brandName} | Official Storefront & Menu
                </div>
                <div className="text-[11px] text-slate-600 line-clamp-2">
                  {description || 'Enjoy freshly prepared dishes with high-quality ingredients.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOMAIN INSPECTOR */}
          {activeRightTab === 'domain' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <h4 className="font-bold text-slate-900 text-xs">Domains & Routing</h4>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    LocalBi Subdomain
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                    <CheckCircle className="w-3 h-3" />
                    ACTIVE
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-indigo-600">
                  {subdomain}.localbi.app
                </div>
                <p className="text-[11px] text-slate-500">
                  Instantly active, with automatic SSL and multi-location SEO schema.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Custom Domain
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Connect your own brand domain (e.g. <span className="font-mono">www.lakshmifood.com</span>).
                </p>
                <Link
                  href={`/client/${tenantSlug}/microsites`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Configure in Domains</span>
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM BAR: 5-STEP PROGRESS GUIDE (Matches Screenshot Bottom Strip)
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0 z-40 shadow-2xs">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-bold text-slate-900 text-xs">
            Create Your Microsite in 5 Simple Steps
          </span>
        </div>

        {/* 5 Step Indicator Strip */}
        <div className="hidden lg:flex items-center gap-6 text-xs">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
              1
            </span>
            <div>
              <div className="font-semibold text-slate-700 text-[11px]">Add Business Details</div>
              <div className="text-[10px] text-slate-400">Name, category, contact, hours</div>
            </div>
          </div>
          <span className="text-slate-300">&gt;</span>

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
              2
            </span>
            <div>
              <div className="font-semibold text-slate-700 text-[11px]">Choose a Template</div>
              <div className="text-[10px] text-slate-400">Modern, restaurant, cafe, retail</div>
            </div>
          </div>
          <span className="text-slate-300">&gt;</span>

          {/* Step 3 (Active Step) */}
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
              3
            </span>
            <div>
              <div className="font-bold text-indigo-600 text-[11px]">Customize with Components</div>
              <div className="text-[10px] text-indigo-500 font-medium">Drag & drop, no coding</div>
            </div>
          </div>
          <span className="text-slate-300">&gt;</span>

          {/* Step 4 */}
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
              4
            </span>
            <div>
              <div className="font-semibold text-slate-700 text-[11px]">Configure Subdomain</div>
              <div className="text-[10px] text-slate-400">e.g. {subdomain}.localbi.app</div>
            </div>
          </div>
          <span className="text-slate-300">&gt;</span>

          {/* Step 5 */}
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
              5
            </span>
            <div>
              <div className="font-semibold text-slate-700 text-[11px]">Publish & Share</div>
              <div className="text-[10px] text-slate-400">Live instantly with WhatsApp ordering</div>
            </div>
          </div>
        </div>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-2 text-xs">
          {saveSuccess && (
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Saved!
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ADD SECTION GALLERY
      ══════════════════════════════════════════════════════════════════════ */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Section to Page</h3>
                <p className="text-xs text-slate-500">
                  Select a professionally pre-styled section for your local business storefront.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSectionModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1">
              {ALL_COMPONENT_REGISTRY.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleAddSection(item.type)}
                  className="p-4 rounded-2xl border border-slate-200/90 hover:border-indigo-500 hover:bg-indigo-50/20 text-left transition-all group cursor-pointer flex flex-col justify-between space-y-3 shadow-2xs hover:shadow-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 block">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: FULL PREVIEW OVERLAY
      ══════════════════════════════════════════════════════════════════════ */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col">
          {/* Preview Header */}
          <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-slate-900">Live Preview:</span>
              <span className="font-mono text-xs text-indigo-600 font-semibold">
                https://{subdomain}.localbi.app
              </span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`/site/${subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Exit Preview
              </button>
            </div>
          </div>

          {/* Preview Canvas Container */}
          <div className="flex-1 overflow-y-auto bg-slate-100 p-6 flex justify-center">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-auto">
              {sections.map((section) => {
                if (section.hidden) return null;
                return (
                  <CanvasSectionRenderer
                    key={section.id}
                    section={section}
                    site={site}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    fontFamily={fontFamily}
                    pageTitle={pageTitle}
                    tagline={tagline}
                    showLogo={showLogo}
                    navItems={navItems}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT REGISTRY & CATEGORY DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════
const BASIC_COMPONENTS = [
  { type: 'Header', label: 'Header', icon: LayoutTemplate, category: 'BASIC', desc: 'Logo, store title, navigation, and WhatsApp button' },
  { type: 'Hero', label: 'Hero', icon: ImageIcon, category: 'BASIC', desc: 'Eye-catching headline, rating badge, and photo showcase' },
  { type: 'About', label: 'About', icon: ShieldCheck, category: 'BASIC', desc: 'Store heritage, quality standards, and craftsmanship story' },
  { type: 'Text', label: 'Text', icon: Type, category: 'BASIC', desc: 'Custom announcement or rich formatted paragraph' },
  { type: 'Image', label: 'Image', icon: ImageIcon, category: 'BASIC', desc: 'Full-bleed high-resolution showcase photo' },
  { type: 'Button', label: 'Button', icon: MousePointerClick, category: 'BASIC', desc: 'Direct call to action or phone dialer' },
];

const BUSINESS_COMPONENTS = [
  { type: 'CardGrid', label: 'Menu / Catalog', icon: UtensilsCrossed, category: 'BUSINESS', desc: 'Food items or retail products with prices and ordering' },
  { type: 'FeatureCards', label: 'Food Category', icon: Layers, category: 'BUSINESS', desc: 'Categories with badges and dish highlights' },
  { type: 'Bento', label: 'Featured Items', icon: Sparkles, category: 'BUSINESS', desc: 'High-converting 3-card bento grid with offers' },
  { type: 'Gallery', label: 'Gallery', icon: ImageIcon, category: 'BUSINESS', desc: 'Store ambiance, dishes, and kitchen photos' },
  { type: 'GoogleReviews', label: 'Testimonials', icon: MessageSquareQuote, category: 'BUSINESS', desc: 'Verified customer ratings and testimonials' },
  { type: 'LocationMapCard', label: 'Location Map', icon: MapPin, category: 'BUSINESS', desc: 'Store address, Google Maps link, and timings' },
];

const CONTACT_COMPONENTS = [
  { type: 'WhatsAppCTA', label: 'WhatsApp CTA', icon: MessageCircle, category: 'CONTACT', desc: 'One-click chat and direct order placement' },
  { type: 'ContactForm', label: 'Contact Form', icon: Mail, category: 'CONTACT', desc: 'Simple customer inquiries and order request' },
  { type: 'OpeningHours', label: 'Opening Hours', icon: Clock, category: 'CONTACT', desc: 'Weekly schedule and operating timings' },
  { type: 'GoogleReviewsWall', label: 'Google Reviews', icon: Star, category: 'CONTACT', desc: 'Google business rating wall with stars' },
  { type: 'SocialLinks', label: 'Social Links', icon: Share2, category: 'CONTACT', desc: 'Instagram, WhatsApp, and Google Maps' },
  { type: 'Footer', label: 'Footer', icon: LayoutTemplate, category: 'CONTACT', desc: 'Copyright, quick links, and store information' },
];

const ALL_COMPONENT_REGISTRY = [
  ...BASIC_COMPONENTS,
  ...BUSINESS_COMPONENTS,
  ...CONTACT_COMPONENTS,
];

const PALETTE_PRESETS = [
  { name: 'Warm Amber & Emerald', primary: '#D97706', secondary: '#059669' },
  { name: 'Royal Indigo & Amber', primary: '#4F46E5', secondary: '#F59E0B' },
  { name: 'Classic Slate & Blue', primary: '#0F172A', secondary: '#2563EB' },
  { name: 'Vibrant Crimson & Gold', primary: '#DC2626', secondary: '#D97706' },
];

function getSectionHumanTitle(type: string): string {
  switch (type) {
    case 'Header':
      return 'Header';
    case 'Hero':
    case 'HeroBanner':
      return 'Hero';
    case 'FeatureCards':
      return 'Feature Badges';
    case 'CardGrid':
    case 'MenuCatalog':
      return 'Menu / Catalog';
    case 'Bento':
      return 'Featured Bento';
    case 'LocationMapCard':
      return 'Location & Hours';
    case 'WhatsAppCTA':
    case 'WhatsAppFloatingCTA':
      return 'WhatsApp CTA';
    case 'GoogleReviews':
    case 'GoogleReviewsWall':
      return 'Customer Reviews';
    case 'Footer':
      return 'Footer';
    case 'About':
      return 'Our Story';
    default:
      return type;
  }
}

function getSectionCategory(type: string): 'BASIC' | 'BUSINESS' | 'CONTACT' {
  if (['Header', 'Hero', 'HeroBanner', 'About', 'Text', 'Image', 'Button'].includes(type)) {
    return 'BASIC';
  }
  if (['CardGrid', 'MenuCatalog', 'FeatureCards', 'Bento', 'Gallery'].includes(type)) {
    return 'BUSINESS';
  }
  return 'CONTACT';
}

function getDefaultPropsForType(
  type: string,
  site: MicrositeConfig | null,
  pageTitle: string,
  _primaryColor?: string,
  _secondaryColor?: string
): Record<string, any> {
  const brandName = pageTitle || site?.brandName || 'Storefront';
  const phone = site?.phone || '';
  const whatsapp = site?.whatsapp || '';
  const address = site?.address || 'Main Street';
  const hours = site?.hours || '9:00 AM - 9:00 PM';

  switch (type) {
    case 'Header':
      return {
        brandName,
        tagline: 'Authentic Specialties & Fresh Delicacies',
        link1: 'Home',
        link2: 'Menu',
        link3: 'About',
        ctaText: 'Order on WhatsApp',
        whatsappNumber: whatsapp,
      };
    case 'Hero':
    case 'HeroBanner':
      return {
        badge: 'Traditional Taste, Modern Convenience',
        heading: 'Authentic Specialties & Fresh Delicacies',
        description:
          'Enjoy freshly prepared traditional dishes made with high-quality ingredients.',
        primaryCtaText: 'Order on WhatsApp',
        secondaryCtaText: 'View Menu',
        phone,
        whatsappNumber: whatsapp,
        hours,
        address,
        rating: 4.8,
        reviewsCount: 120,
      };
    case 'FeatureCards':
      return {
        heading: 'Why Customers Love Us',
        subheading: 'Dedicated to freshness, authentic preparation, and community trust.',
        feat1Title: 'Fresh Ingredients',
        feat1Desc: 'Sourced Daily',
        feat2Title: 'Traditional Recipes',
        feat2Desc: 'Authentic Taste',
        feat3Title: 'Hygienic Preparation',
        feat3Desc: 'Clean & Safe',
        feat4Title: 'Quick Ordering',
        feat4Desc: 'Via WhatsApp',
      };
    case 'CardGrid':
      return {
        heading: 'Popular Items',
        subheading: 'Explore our most loved traditional South Indian dishes.',
        whatsappNumber: whatsapp,
        item1Name: 'Idli Sambar',
        item1Category: 'Breakfast',
        item1Price: 40,
        item1Desc: 'Soft & fluffy idlis with authentic sambar',
        item2Name: 'Masala Dosa',
        item2Category: 'Tiffin',
        item2Price: 70,
        item2Desc: 'Crispy dosa with spiced potato filling',
        item3Name: 'Pongal',
        item3Category: 'Breakfast',
        item3Price: 50,
        item3Desc: 'Traditional ven pongal with chutney',
        item4Name: 'Medu Vada',
        item4Category: 'Snacks',
        item4Price: 40,
        item4Desc: 'Crispy medu vada with sambar',
      };
    case 'LocationMapCard':
      return {
        storeName: brandName,
        address,
        hours,
        phone,
        googleMapsUrl: site?.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(address)}`,
      };
    case 'WhatsAppCTA':
      return {
        headline: `Order Directly from ${brandName}`,
        subheading: 'Fast response and priority preparation directly on WhatsApp.',
        buttonLabel: 'Chat on WhatsApp',
        whatsappNumber: whatsapp,
        prefilledMessage: `Hi ${brandName}, I would like to place an order.`,
      };
    case 'GoogleReviews':
      return {
        heading: 'What Our Customers Say',
        overallRating: 4.8,
        totalReviews: 120,
        review1Author: 'Karthik Raman',
        review1Text: 'Crispy dosas and authentic filter coffee! One of the best South Indian spots.',
        review1Stars: 5,
        review2Author: 'Priya Sundaram',
        review2Text: 'Super fast WhatsApp ordering and fresh, steaming hot food. Highly recommended!',
        review2Stars: 5,
      };
    case 'Footer':
      return {
        brandName,
        tagline: 'Authentic Specialties & Dedicated Service',
        address,
        phone,
        hours,
        copyright: `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`,
      };
    default:
      return {
        heading: getSectionHumanTitle(type),
        description: 'Custom content block',
      };
  }
}

function createDefaultSections(site: MicrositeConfig): BuilderSection[] {
  const brandName = site.brandName || 'Storefront';
  const whatsapp = site.whatsapp || '';
  const phone = site.phone || '';
  const address = site.address || '';
  const hours = site.hours || '9:00 AM - 9:00 PM';

  return [
    {
      id: 'sec-header',
      type: 'Header',
      title: 'Header',
      category: 'BASIC',
      props: {
        brandName,
        tagline: site.tagline || 'Authentic South Indian Specialties',
        link1: 'Home',
        link2: 'Menu',
        link3: 'About',
        ctaText: 'Order on WhatsApp',
        whatsappNumber: whatsapp,
      },
    },
    {
      id: 'sec-hero',
      type: 'Hero',
      title: 'Hero',
      category: 'BASIC',
      props: {
        badge: 'Traditional Taste, Modern Convenience',
        heading: 'Authentic South Indian Specialties & Fresh Delicacies',
        description:
          'Enjoy freshly prepared traditional dishes made with high-quality ingredients.',
        primaryCtaText: 'Order on WhatsApp',
        secondaryCtaText: 'View Menu',
        phone,
        whatsappNumber: whatsapp,
        hours,
        address,
        rating: 4.8,
        reviewsCount: 120,
      },
    },
    {
      id: 'sec-features',
      type: 'FeatureCards',
      title: 'Feature Badges',
      category: 'BUSINESS',
      props: {
        heading: 'Why Customers Love Us',
        subheading: 'Dedicated to freshness, authentic preparation, and community trust.',
        feat1Title: 'Fresh Ingredients',
        feat1Desc: 'Sourced Daily',
        feat2Title: 'Traditional Recipes',
        feat2Desc: 'Authentic Taste',
        feat3Title: 'Hygienic Preparation',
        feat3Desc: 'Clean & Safe',
        feat4Title: 'Quick Ordering',
        feat4Desc: 'Via WhatsApp',
      },
    },
    {
      id: 'sec-menu',
      type: 'CardGrid',
      title: 'Menu / Catalog',
      category: 'BUSINESS',
      props: {
        heading: 'Popular Items',
        subheading: 'Explore our most loved traditional South Indian dishes.',
        whatsappNumber: whatsapp,
        item1Name: 'Idli Sambar',
        item1Category: 'Breakfast',
        item1Price: 40,
        item1Desc: 'Soft & fluffy idlis with authentic sambar',
        item2Name: 'Masala Dosa',
        item2Category: 'Tiffin',
        item2Price: 70,
        item2Desc: 'Crispy dosa with spiced potato filling',
        item3Name: 'Pongal',
        item3Category: 'Breakfast',
        item3Price: 50,
        item3Desc: 'Traditional ven pongal with chutney',
        item4Name: 'Medu Vada',
        item4Category: 'Snacks',
        item4Price: 40,
        item4Desc: 'Crispy medu vada with sambar',
      },
    },
    {
      id: 'sec-location',
      type: 'LocationMapCard',
      title: 'Location & Hours',
      category: 'BUSINESS',
      props: {
        storeName: brandName,
        address,
        hours,
        phone,
        googleMapsUrl: site.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(address)}`,
      },
    },
    {
      id: 'sec-whatsapp',
      type: 'WhatsAppCTA',
      title: 'WhatsApp CTA',
      category: 'CONTACT',
      props: {
        headline: `Order Directly from ${brandName}`,
        subheading: 'Fast response and priority preparation directly on WhatsApp.',
        buttonLabel: 'Chat on WhatsApp',
        whatsappNumber: whatsapp,
        prefilledMessage: `Hi ${brandName}, I would like to place an order.`,
      },
    },
    {
      id: 'sec-footer',
      type: 'Footer',
      title: 'Footer',
      category: 'BASIC',
      props: {
        brandName,
        tagline: site.tagline || 'Authentic Specialties & Dedicated Service',
        address,
        phone,
        hours,
        copyright: `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`,
      },
    },
  ];
}

// ═════════════════════════════════════════════════════════════════════════════
// CANVAs SECTION RENDERER (Accurately reproduces screenshot UI)
// ═════════════════════════════════════════════════════════════════════════════
function CanvasSectionRenderer({
  section,
  site,
  primaryColor,
  secondaryColor,
  fontFamily: _fontFamily,
  pageTitle,
  tagline,
  showLogo,
  navItems,
}: {
  section: BuilderSection;
  site: MicrositeConfig | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  pageTitle: string;
  tagline: string;
  showLogo: boolean;
  navItems: Array<{ id: string; label: string; enabled: boolean }>;
}) {
  const p: any = section.props;
  const brand = pageTitle || p.brandName || site?.brandName || 'Storefront';

  switch (section.type) {
    case 'Header':
      return (
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showLogo && (
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold text-lg">
                🍲
              </div>
            )}
            <div>
              <div className="font-extrabold text-base text-slate-900 leading-tight">
                {brand}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {p.tagline || tagline}
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-600">
            {navItems
              .filter((n) => n.enabled)
              .map((n) => (
                <span key={n.id} className="hover:text-slate-900 cursor-pointer">
                  {n.label}
                </span>
              ))}
          </nav>

          <div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-white text-xs font-bold shadow-xs cursor-pointer"
              style={{ backgroundColor: secondaryColor }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{p.ctaText || 'Order on WhatsApp'}</span>
            </button>
          </div>
        </header>
      );

    case 'Hero':
    case 'HeroBanner':
      return (
        <section className="bg-slate-900 text-white p-8 sm:p-12 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ backgroundColor: primaryColor }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
            <div className="space-y-4">
              <span
                className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
                style={{ backgroundColor: `${primaryColor}25`, color: primaryColor }}
              >
                {p.badge || 'Traditional Taste, Modern Convenience'}
              </span>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
                {p.heading || 'Authentic South Indian Specialties & Fresh Delicacies'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
                {p.description ||
                  'Enjoy freshly prepared traditional dishes made with high-quality ingredients.'}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-200">
                <span className="flex items-center gap-1 font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {p.rating || 4.8}/5 ({p.reviewsCount || 120}+ Reviews)
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 font-semibold text-[11px]">
                  ● Pure Veg
                </span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md text-[11px]">
                  Hygienic
                </span>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md text-[11px]">
                  Fresh Daily
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-xs shadow-md transition-transform hover:scale-105 cursor-pointer"
                  style={{ backgroundColor: secondaryColor }}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{p.primaryCtaText || 'Order on WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-800/80 hover:bg-slate-800 text-white font-semibold text-xs border border-slate-700 cursor-pointer"
                >
                  <span>{p.secondaryCtaText || 'View Menu'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Food Platter Showcase */}
            <div className="relative flex justify-center">
              <div className="w-full max-w-sm aspect-4/3 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-800 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80"
                  alt="Delicious Traditional Food"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      );

    case 'FeatureCards':
      return (
        <section className="bg-white py-6 px-6 sm:px-8 border-b border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                🌾
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900">{p.feat1Title || 'Fresh Ingredients'}</div>
                <div className="text-[10px] text-slate-500">{p.feat1Desc || 'Sourced Daily'}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                🍲
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900">{p.feat2Title || 'Traditional Recipes'}</div>
                <div className="text-[10px] text-slate-500">{p.feat2Desc || 'Authentic Taste'}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                🛡️
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900">{p.feat3Title || 'Hygienic Preparation'}</div>
                <div className="text-[10px] text-slate-500">{p.feat3Desc || 'Clean & Safe'}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                ⚡
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900">{p.feat4Title || 'Quick Ordering'}</div>
                <div className="text-[10px] text-slate-500">{p.feat4Desc || 'Via WhatsApp'}</div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'CardGrid':
    case 'MenuCatalog':
      return (
        <section className="bg-slate-50/60 p-6 sm:p-10 space-y-6">
          <div className="text-center space-y-1.5 max-w-md mx-auto">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              Our Menu
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {p.heading || 'Popular Items'}
            </h2>
            <p className="text-xs text-slate-500">
              {p.subheading || 'Explore our most loved traditional South Indian dishes.'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
            {['All', 'Breakfast', 'Tiffin', 'Meals', 'Snacks', 'Beverages'].map((cat, i) => (
              <span
                key={cat}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                  i === 0
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Food Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                name: p.item1Name || 'Idli Sambar',
                desc: p.item1Desc || 'Soft & fluffy idlis with authentic sambar',
                price: p.item1Price || 40,
                img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
              },
              {
                name: p.item2Name || 'Masala Dosa',
                desc: p.item2Desc || 'Crispy dosa with spiced potato filling',
                price: p.item2Price || 70,
                img: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=400&q=80',
              },
              {
                name: p.item3Name || 'Pongal',
                desc: p.item3Desc || 'Traditional ven pongal with chutney',
                price: p.item3Price || 50,
                img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
              },
              {
                name: p.item4Name || 'Medu Vada',
                desc: p.item4Desc || 'Crispy medu vada with sambar',
                price: p.item4Price || 40,
                img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
              },
            ].map((dish, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm transition-all"
              >
                <div className="aspect-4/3 w-full bg-slate-100 overflow-hidden">
                  <img src={dish.img} alt={dish.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 line-clamp-1">{dish.name}</h3>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {dish.desc}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="font-extrabold text-xs text-slate-900 font-mono">
                      ₹{dish.price}
                    </span>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      <MessageCircle className="w-3 h-3" />
                      Order
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'LocationMapCard':
      return (
        <section className="bg-white p-6 sm:p-8 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <span
                className="text-[10px] font-bold uppercase tracking-wider block"
                style={{ color: primaryColor }}
              >
                Visit Our Location
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">{p.storeName || brand}</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{p.address || site?.address || 'Main Street, City Center'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{p.hours || site?.hours || '9:00 AM - 9:00 PM'}</span>
                </div>
              </div>
              <div className="pt-2">
                <a
                  href={p.googleMapsUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>Get Directions on Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="h-44 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-medium">
              <div className="text-center space-y-1">
                <MapPin className="w-6 h-6 mx-auto text-indigo-600" />
                <div>Interactive Google Maps View</div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'WhatsAppCTA':
      return (
        <section className="bg-emerald-600 text-white p-8 text-center space-y-3">
          <h3 className="text-xl font-extrabold tracking-tight">
            {p.headline || `Connect Directly with ${brand}`}
          </h3>
          <p className="text-xs text-emerald-100 max-w-md mx-auto">
            {p.subheading ||
              'Place custom orders, catering inquiries, or ask questions directly on WhatsApp.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-emerald-800 font-bold text-xs shadow-md cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>{p.buttonLabel || 'Chat on WhatsApp'}</span>
            </button>
          </div>
        </section>
      );

    case 'Footer':
      return (
        <footer className="bg-slate-900 text-slate-400 p-8 text-xs border-t border-slate-800">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <div className="font-bold text-white text-sm">{brand}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{p.address || site?.address}</div>
            </div>
            <div className="text-[11px] text-slate-500">
              {p.copyright || `© ${new Date().getFullYear()} ${brand}. All rights reserved.`}
            </div>
          </div>
        </footer>
      );

    default:
      return (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
          <div className="font-bold text-slate-800">{section.title}</div>
          <div className="text-[11px] mt-1">Configured Component Block</div>
        </div>
      );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION PROPERTIES FORM (Context-Sensitive Right Inspector)
// ═════════════════════════════════════════════════════════════════════════════
function SectionPropertiesForm({
  section,
  onChange,
}: {
  section: BuilderSection;
  onChange: (field: string, value: any) => void;
}) {
  const p: any = section.props;

  return (
    <div className="space-y-4">
      {/* Title / Heading */}
      {p.heading !== undefined && (
        <div>
          <label className="text-[11px] text-slate-500 font-medium block mb-1">Heading</label>
          <input
            type="text"
            value={p.heading}
            onChange={(e) => onChange('heading', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-semibold"
          />
        </div>
      )}

      {/* Badge / Pill */}
      {p.badge !== undefined && (
        <div>
          <label className="text-[11px] text-slate-500 font-medium block mb-1">Badge Text</label>
          <input
            type="text"
            value={p.badge}
            onChange={(e) => onChange('badge', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
          />
        </div>
      )}

      {/* Subheading / Description */}
      {(p.description !== undefined || p.subheading !== undefined) && (
        <div>
          <label className="text-[11px] text-slate-500 font-medium block mb-1">Description</label>
          <textarea
            rows={3}
            value={p.description ?? p.subheading ?? ''}
            onChange={(e) => onChange(p.description !== undefined ? 'description' : 'subheading', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs leading-relaxed"
          />
        </div>
      )}

      {/* Primary CTA */}
      {p.primaryCtaText !== undefined && (
        <div>
          <label className="text-[11px] text-slate-500 font-medium block mb-1">
            Primary Button Label
          </label>
          <input
            type="text"
            value={p.primaryCtaText}
            onChange={(e) => onChange('primaryCtaText', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
          />
        </div>
      )}

      {/* Secondary CTA */}
      {p.secondaryCtaText !== undefined && (
        <div>
          <label className="text-[11px] text-slate-500 font-medium block mb-1">
            Secondary Button Label
          </label>
          <input
            type="text"
            value={p.secondaryCtaText}
            onChange={(e) => onChange('secondaryCtaText', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
          />
        </div>
      )}

      {/* WhatsApp Number */}
      {p.whatsappNumber !== undefined && (
        <div>
          <label className="text-[11px] text-slate-500 font-medium block mb-1">
            WhatsApp Number
          </label>
          <input
            type="text"
            value={p.whatsappNumber}
            onChange={(e) => onChange('whatsappNumber', e.target.value)}
            placeholder="+91 98400 12345"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono"
          />
        </div>
      )}

      {/* Address */}
      {p.address !== undefined && (
        <div>
          <label className="text-[11px] text-slate-500 font-medium block mb-1">Store Address</label>
          <input
            type="text"
            value={p.address}
            onChange={(e) => onChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
          />
        </div>
      )}

      {/* Hours */}
      {p.hours !== undefined && (
        <div>
          <label className="text-[11px] text-slate-500 font-medium block mb-1">Opening Hours</label>
          <input
            type="text"
            value={p.hours}
            onChange={(e) => onChange('hours', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
          />
        </div>
      )}
    </div>
  );
}
