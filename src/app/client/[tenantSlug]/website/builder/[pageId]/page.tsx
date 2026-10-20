'use client';

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Eye,
  History,
  ExternalLink,
  Layers,
  LayoutGrid,
  Image as ImageIcon,
  Folder,
  Plus,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Sliders,
  Palette,
  Settings,
  Sparkles,
  Globe,
  Undo2,
  Redo2,
  Edit3,
  Save,
  Check,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  ShieldCheck,
  MapPin,
  ShoppingBag,
  HelpCircle,
  Compass,
  MessageSquare,
  PhoneCall,
  Clock,
  Star,
  Users,
  Award,
  CreditCard,
  ListOrdered,
  Layout,
  Columns,
  Maximize,
  Pin,
  Video,
  Grid,
  Wand2,
  Coffee,
  RotateCcw,
} from 'lucide-react';
import type { Data } from '@measured/puck';
import { Puck, Drawer, usePuck } from '@measured/puck';
import '@measured/puck/puck.css';
import './puck-light-theme.css';
import { siteStudioPuckConfig } from '@/modules/page-builder/site-studio-puck-config';
import { LANDING_PAGE_STARTER_TEMPLATES } from '@/modules/page-builder/landing-page-templates';
import { PageContextProvider } from '@/modules/page-builder/page-context-react';
import { PageContext } from '@/modules/page-builder/page-context-service';
import {
  BrandThemeDto,
  ThemeService,
  DEFAULT_THEME_VALUES,
} from '@/modules/page-builder/theme-service';
import { extractErrorMessage } from '@/lib/notify';

// Component Catalog Metadata for Left Sidebar Explorer
interface ComponentMeta {
  type: string;
  name: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COMPONENT_METADATA: ComponentMeta[] = [
  // ── 1. Hero & Conversion (Primary Landing Page Sections)
  { type: 'HeroBanner', name: 'Hero Banner', category: 'hero', description: 'High-impact full hero with headline, badges, and dual action buttons', icon: Sparkles },
  { type: 'HeroWithImage', name: 'Hero with Photo', category: 'hero', description: 'Split headline with featured visual photo showcase and CTA', icon: ImageIcon },
  { type: 'CenteredHero', name: 'Centered Hero', category: 'hero', description: 'Focused center-aligned hero with trust badges & subtitle', icon: Sparkles },
  { type: 'CTABanner', name: 'Callout CTA Banner', category: 'hero', description: 'High-conversion headline banner with immediate action button', icon: Send },
  { type: 'DualCTASection', name: 'Dual Action Section', category: 'hero', description: 'Two targeted conversion pathways side-by-side', icon: Send },
  { type: 'PromoBanner', name: 'Promotional Banner', category: 'hero', description: 'Highlight offers, discount codes, or seasonal events', icon: Sparkles },
  { type: 'NewsletterSignup', name: 'Newsletter Signup', category: 'hero', description: 'Email capture input with incentive copy', icon: MessageSquare },

  // ── 2. Services & Features
  { type: 'ServicesGrid', name: 'Services 3-Grid', category: 'services', description: 'Grid of service offerings with icons, badges, and details', icon: LayoutGrid },
  { type: 'WhyChooseUs', name: 'Why Choose Us', category: 'services', description: 'Key competitive differentiators and trust highlights', icon: ShieldCheck },
  { type: 'ProcessSteps', name: 'Process Steps (1-2-3-4)', category: 'services', description: 'Numbered step-by-step customer workflow guide', icon: ListOrdered },
  { type: 'PricingCards', name: 'Pricing Table', category: 'services', description: 'Tiered pricing cards with recommended plan highlight', icon: CreditCard },
  { type: 'TeamGrid', name: 'Team Members', category: 'services', description: 'Staff profiles with photos, roles, and bios', icon: Users },

  // ── 3. Products & Catalog
  { type: 'ProductGrid', name: 'Product Catalog Grid', category: 'catalog', description: 'Tenant catalog product grid with prices and order buttons', icon: ShoppingBag },
  { type: 'FeaturedProduct', name: 'Featured Product Spotlight', category: 'catalog', description: 'Hero spotlight showcase for bestselling product', icon: Star },
  { type: 'ProductCard', name: 'Product Card', category: 'catalog', description: 'Single product showcase card with price and stock badge', icon: ShoppingBag },
  { type: 'ProductDetail', name: 'Product Detail Block', category: 'catalog', description: 'Comprehensive product view with SKU and specs', icon: ShoppingBag },
  { type: 'ProductCarousel', name: 'Product Carousel', category: 'catalog', description: 'Scrollable row of featured catalog items', icon: ShoppingBag },
  { type: 'ProductSearch', name: 'Product Search Filter', category: 'catalog', description: 'Interactive search filter for store inventory', icon: Search },

  // ── 4. Store & Location
  { type: 'StoreLocator', name: 'Store Branch Locator', category: 'store', description: 'Branch info, address, hours, and direction actions', icon: MapPin },
  { type: 'LocationMap', name: 'Interactive Location Map', category: 'store', description: 'Google Maps embed for physical store branch', icon: MapPin },
  { type: 'BusinessHours', name: 'Business Hours Schedule', category: 'store', description: 'Weekly operating schedule with Open/Closed badges', icon: Clock },
  { type: 'LocationCard', name: 'Location Card', category: 'store', description: 'Branch details card with phone, address, and rating', icon: MapPin },
  { type: 'AddressBlock', name: 'Address Block', category: 'store', description: 'Formatted physical business location address', icon: MapPin },

  // ── 5. Social Proof & Trust
  { type: 'ReviewCarousel', name: 'Customer Reviews Carousel', category: 'trust', description: '5-star customer review quotes with reviewer avatar', icon: Star },
  { type: 'TestimonialQuote', name: 'Featured Review Quote', category: 'trust', description: 'Large customer testimonial quote with star rating', icon: Star },
  { type: 'TrustBadges', name: 'Trust & Guarantee Badges', category: 'trust', description: 'Security, certification, and satisfaction badges', icon: ShieldCheck },
  { type: 'StatisticsCounter', name: 'Statistics & KPI Counter', category: 'trust', description: 'Animated KPI metric numbers showcase', icon: Award },
  { type: 'PartnerLogos', name: 'Partner / Client Logos', category: 'trust', description: 'Brand partner logo strip', icon: Users },

  // ── 6. Forms & Conversion
  { type: 'LeadCaptureForm', name: 'Lead Capture Form', category: 'forms', description: 'High-conversion opt-in form with privacy notice', icon: Send },
  { type: 'CallbackRequest', name: 'Instant Callback Request', category: 'forms', description: 'Quick phone callback request form', icon: PhoneCall },
  { type: 'ContactForm', name: 'Full Contact Form', category: 'forms', description: 'Full enquiry form with name, email, and message', icon: MessageSquare },
  { type: 'ContactButton', name: 'Direct Contact Button', category: 'forms', description: 'Action button linking to phone, email, or modal', icon: PhoneCall },
  { type: 'CallButton', name: 'Click-to-Call Button', category: 'forms', description: 'Click-to-call direct contact button', icon: PhoneCall },

  // ── 7. Content & Media
  { type: 'FAQAccordion', name: 'FAQ Accordion', category: 'content', description: 'Expandable question and answer accordion list', icon: HelpCircle },
  { type: 'IconGrid', name: 'Value Proposition Icon Grid', category: 'content', description: 'Feature highlights with colorful icons', icon: Grid },
  { type: 'Image', name: 'Photo / Image Showcase', category: 'content', description: 'Optimized responsive image with aspect ratio control', icon: ImageIcon },
  { type: 'ImageGallery', name: 'Image Gallery Grid', category: 'content', description: 'Responsive multi-image showcase grid', icon: Grid },
  { type: 'VideoEmbed', name: 'Video Embed Player', category: 'content', description: 'Responsive YouTube, Vimeo, or MP4 player', icon: Video },
  { type: 'Heading', name: 'Section Heading', category: 'content', description: 'Semantic H1-H6 typography with subtitle', icon: FileText },
  { type: 'Paragraph', name: 'Text Paragraph', category: 'content', description: 'Body text block with size and alignment controls', icon: FileText },
  { type: 'RichText', name: 'Rich Text Box', category: 'content', description: 'Formatted HTML content container', icon: FileText },
  { type: 'Tabs', name: 'Interactive Content Tabs', category: 'content', description: 'Interactive multi-tab content switcher', icon: Layout },

  // ── 8. Navigation & Header
  { type: 'AnnouncementBar', name: 'Announcement Promo Bar', category: 'brand', description: 'Top promo alert banner for special offers and updates', icon: Sparkles },
  { type: 'BrandHeader', name: 'Brand Navbar Header', category: 'brand', description: 'Top navbar with logo, menu links, and action button', icon: Compass },
  { type: 'Logo', name: 'Logo Block', category: 'brand', description: 'Brand emblem image or typographic logo', icon: Sparkles },
  { type: 'SiteNavigation', name: 'Site Navigation Menu', category: 'brand', description: 'Horizontal menu navigation bar with links', icon: Compass },
  { type: 'Breadcrumbs', name: 'Breadcrumbs Navigation', category: 'brand', description: 'SEO-rich navigation pathway indicator', icon: FileText },
  { type: 'SearchBar', name: 'Search Bar', category: 'brand', description: 'Storefront and product search input', icon: Search },

  // ── 9. Footer & Utilities
  { type: 'MultiColumnFooter', name: 'Multi-Column Footer', category: 'footer', description: 'Comprehensive site footer with columns, social links, copyright', icon: Layout },
  { type: 'FloatingWhatsApp', name: 'Floating WhatsApp Button', category: 'footer', description: 'Fixed corner WhatsApp chat trigger button', icon: MessageSquare },
  { type: 'BackToTop', name: 'Back To Top Button', category: 'footer', description: 'Smooth scroll floating back-to-top button', icon: MoveUp },

  // ── 10. SEO & Marketing
  { type: 'SEOLandingSection', name: 'SEO Content Section', category: 'seo', description: 'Search-optimized content section with local schema keywords', icon: Globe },
  { type: 'BreadcrumbSection', name: 'Breadcrumb Section', category: 'seo', description: 'Breadcrumbs with JSON-LD schema integration', icon: Globe },

  // ── 11. Wireframe Containers (Advanced / Raw Layout)
  { type: 'SectionContainer', name: 'Section Container', category: 'layout', description: 'Empty full-width or boxed container slot', icon: Layout },
  { type: 'RowAndColumns', name: 'Row & Columns Grid', category: 'layout', description: 'Multi-column empty grid layout slots', icon: Columns },
  { type: 'StandardContainer', name: 'Standard Container', category: 'layout', description: 'Centered container with max-width containment', icon: Layout },
  { type: 'ContentCard', name: 'Content Card / Box', category: 'layout', description: 'Styled surface container with border & shadow', icon: Layout },
  { type: 'MultiColumnGrid', name: 'Multi-Column Grid', category: 'layout', description: '2 to 4 column responsive flex grid', icon: Grid },
  { type: 'FlexLayout', name: 'Flex Layout', category: 'layout', description: 'Flexible flexbox with direction controls', icon: Columns },
  { type: 'InnerContainer', name: 'Inner Container', category: 'layout', description: 'Nested child container slot', icon: Layout },
  { type: 'Spacer', name: 'Spacer / Gap', category: 'layout', description: 'Adjustable vertical whitespace block', icon: Maximize },
  { type: 'Divider', name: 'Divider Line', category: 'layout', description: 'Horizontal separator line', icon: Layout },
  { type: 'StackLayout', name: 'Stack Layout', category: 'layout', description: 'Vertical or horizontal element stack', icon: Layout },
  { type: 'TwoColumnLayout', name: 'Two-Column Layout', category: 'layout', description: 'Side-by-side 50/50 or 60/40 layout', icon: Columns },
  { type: 'ThreeColumnLayout', name: 'Three-Column Layout', category: 'layout', description: 'Three equal column distribution', icon: Columns },
  { type: 'FourColumnLayout', name: 'Four-Column Layout', category: 'layout', description: 'Four column showcase grid', icon: Columns },
  { type: 'SidebarLayout', name: 'Sidebar Layout', category: 'layout', description: 'Main content area with sticky sidebar column', icon: Columns },
  { type: 'FullWidthSection', name: 'Full-Width Section', category: 'layout', description: 'Edge-to-edge section with optional overlay', icon: Maximize },
  { type: 'StickySection', name: 'Sticky Section', category: 'layout', description: 'Viewport-docked sticky container block', icon: Pin },
  { type: 'ResponsiveGrid', name: 'Responsive Grid', category: 'layout', description: 'Fluid auto-fitting responsive grid', icon: Grid },
  { type: 'BackgroundSection', name: 'Background Section', category: 'layout', description: 'Section with backdrop image or gradient', icon: Palette },
];

const CATEGORIES = [
  { id: 'all', label: 'All Sections', icon: LayoutGrid },
  { id: 'hero', label: 'Hero & Intros', icon: Sparkles },
  { id: 'services', label: 'Services & Features', icon: ShieldCheck },
  { id: 'catalog', label: 'Products & Catalog', icon: ShoppingBag },
  { id: 'store', label: 'Store & Location', icon: MapPin },
  { id: 'trust', label: 'Reviews & Trust', icon: Award },
  { id: 'forms', label: 'Contact & Forms', icon: MessageSquare },
  { id: 'content', label: 'Content & Media', icon: FileText },
  { id: 'brand', label: 'Navbar & Header', icon: Compass },
  { id: 'footer', label: 'Footer & Utility', icon: Layout },
  { id: 'seo', label: 'SEO & Marketing', icon: Globe },
  { id: 'layout', label: 'Wireframe Containers (Advanced)', icon: Columns },
];

// Context to connect Studio UI with page-level state
interface BuilderUIContextType {
  tenantSlug: string;
  brandId: string | null;
  pageInfo: any;
  currentVersion: number;
  publishedVersion: number | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  openPublishModal: () => void;
  openRollbackModal: () => void;
  onManualSave: () => void;
}

const BuilderUIContext = createContext<BuilderUIContextType | null>(null);

function useBuilderUI() {
  const ctx = useContext(BuilderUIContext);
  if (!ctx) throw new Error('useBuilderUI must be used within BuilderUIContext.Provider');
  return ctx;
}

// Media assets library for tenant
const SAMPLE_ASSETS = [
  { id: 'a1', name: 'Brand Hero Wallpaper', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop&q=80', type: 'image/jpeg', size: '420 KB', dims: '1920x1080' },
  { id: 'a2', name: 'Luxury Storefront Facade', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80', type: 'image/jpeg', size: '280 KB', dims: '1200x800' },
  { id: 'a3', name: 'Royal Oudh Bottle Specimen', url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&auto=format&fit=crop&q=80', type: 'image/jpeg', size: '195 KB', dims: '1000x1000' },
  { id: 'a4', name: 'Artisan Essence Workshop', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80', type: 'image/jpeg', size: '310 KB', dims: '1200x800' },
  { id: 'a5', name: 'Golden Brand Emblem Icon', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', type: 'image/png', size: '115 KB', dims: '512x512' },
  { id: 'a6', name: 'Modern Minimalist Interior', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80', type: 'image/jpeg', size: '350 KB', dims: '1600x1066' },
];

function sanitizeBlockItem(item: any, idx: number, prefix = 'block'): any {
  if (!item || typeof item !== 'object') return item;
  const registeredComponents = (siteStudioPuckConfig.components || {}) as Record<string, any>;
  let itemType = typeof item.type === 'string' ? item.type : 'Section';
  if (!registeredComponents[itemType]) {
    itemType = 'Section';
  }
  const props = { ...(item.props || {}) };
  const id = props.id || `${itemType || prefix}-${idx}`;
  props.id = id;

  for (const [key, val] of Object.entries(props)) {
    if (Array.isArray(val)) {
      props[key] = val.map((child, cIdx) => sanitizeBlockItem(child, cIdx, `${id}-${key}`));
    }
  }

  return {
    ...item,
    type: itemType,
    props,
  };
}

function sanitizeClientPuckData(raw: any): Data {
  if (!raw) return { content: [], root: { props: { title: '' } } };
  const content = (raw.content || []).map((item: any, idx: number) => sanitizeBlockItem(item, idx));
  const zones: Record<string, any[]> = {};
  if (raw.zones && typeof raw.zones === 'object') {
    for (const [zKey, zItems] of Object.entries(raw.zones)) {
      if (Array.isArray(zItems)) {
        zones[zKey] = zItems.map((child, cIdx) => sanitizeBlockItem(child, cIdx, zKey));
      }
    }
  }
  return {
    ...raw,
    content,
    ...(Object.keys(zones).length > 0 ? { zones } : {}),
  };
}

// ─────────────────────────────────────────────────────────────
// 1. TOP TOOLBAR OVERRIDE (Webflow / Wix Studio Header)
// ─────────────────────────────────────────────────────────────
function StudioTopToolbar({ actions }: { actions?: React.ReactNode }) {
  const {
    tenantSlug,
    brandId,
    pageInfo,
    currentVersion,
    publishedVersion,
    saveStatus,
    zoomLevel,
    setZoomLevel,
    openPublishModal,
    openRollbackModal,
    onManualSave,
  } = useBuilderUI();

  const { appState, dispatch, history } = usePuck();
  const currentViewport = appState.ui.viewports?.current?.width || 1280;
  const isPreviewMode = appState.ui.previewMode === 'interactive';

  const canUndo = Boolean(history.hasPast);
  const canRedo = Boolean(history.hasFuture);

  const handleSetViewport = (width: number) => {
    dispatch({
      type: 'setUi',
      ui: {
        viewports: {
          ...appState.ui.viewports,
          current: {
            width,
            height: 'auto',
          },
        },
      },
    });
  };

  const handleTogglePreview = () => {
    dispatch({
      type: 'setUi',
      ui: {
        previewMode: isPreviewMode ? 'edit' : 'interactive',
      },
    });
  };

  return (
    <header className="sticky top-0 z-50 bg-white text-slate-800 border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between select-none shadow-xs">
      {/* ── Left Group: Back, Breadcrumb & Save Status ── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/client/${tenantSlug}/website/pages${brandId ? `?brandId=${brandId}` : ''}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all border border-slate-200"
          title="Back to Pages list"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pages</span>
        </Link>

        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

        {/* Page Identity & Version */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-slate-900">
              {pageInfo?.pageType || 'Page'}
            </span>
            <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 border border-slate-200 font-semibold">
              {pageInfo?.slug || '/'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              v{currentVersion}
            </span>
          </div>

          {/* Status Badge */}
          {publishedVersion ? (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live v{publishedVersion}
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Draft Only
            </span>
          )}
        </div>

        {/* Autosave Status */}
        <div className="hidden lg:flex items-center text-xs ml-2">
          {saveStatus === 'saving' && (
            <span className="text-slate-500 flex items-center gap-1.5 text-[11px]">
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
              <span>Saving draft...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-emerald-600 flex items-center gap-1.5 text-[11px] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>All changes saved</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-rose-600 flex items-center gap-1.5 text-[11px] font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Save failed</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Center Group: Viewport, Zoom & Undo/Redo ── */}
      <div className="flex items-center gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => history.back()}
            disabled={!canUndo}
            className={`p-1.5 rounded-md transition-colors ${
              canUndo ? 'text-slate-700 hover:text-slate-900 hover:bg-white' : 'text-slate-300 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => history.forward()}
            disabled={!canRedo}
            className={`p-1.5 rounded-md transition-colors ${
              canRedo ? 'text-slate-700 hover:text-slate-900 hover:bg-white' : 'text-slate-300 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Viewport Switcher */}
        <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => handleSetViewport(1280)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              currentViewport >= 1024
                ? 'bg-white text-indigo-700 shadow-2xs font-bold border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Desktop Viewport (1280px)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px]">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetViewport(768)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              currentViewport === 768
                ? 'bg-white text-indigo-700 shadow-2xs font-bold border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Tablet Viewport (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px]">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetViewport(390)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              currentViewport === 390
                ? 'bg-white text-indigo-700 shadow-2xs font-bold border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="Mobile Viewport (390px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px]">Mobile</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden md:flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(100)}
            className="px-2 text-[11px] font-mono text-slate-700 hover:text-slate-900 font-semibold"
            title="Reset Zoom to 100%"
          >
            {zoomLevel}%
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(Math.min(150, zoomLevel + 25))}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Right Group: Starters, Preview Toggle, History, Save & Publish ── */}
      <div className="flex items-center gap-2">
        {/* Quick Starters Button */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('site-studio-switch-tab', { detail: 'templates' }));
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 text-xs font-bold transition-all border border-indigo-200 shadow-2xs"
          title="1-Click Landing Page Starter Templates"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Starters</span>
        </button>

        {/* Clear Canvas Quick Reset */}
        {appState.data.content?.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear all blocks on this page to start fresh? You can load a ready-made starter template.')) {
                dispatch({
                  type: 'setData',
                  data: { content: [], root: { props: { title: 'Storefront' } } },
                });
                window.dispatchEvent(new CustomEvent('site-studio-switch-tab', { detail: 'templates' }));
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
            title="Clear all blocks to start fresh"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Interactive Preview Mode Toggle */}
        <button
          type="button"
          onClick={handleTogglePreview}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            isPreviewMode
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs font-bold'
              : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border-slate-200'
          }`}
          title={isPreviewMode ? 'Exit Interactive Preview' : 'Interactive Preview Mode'}
        >
          {isPreviewMode ? <Edit3 className="w-3.5 h-3.5 text-emerald-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
          <span className="hidden sm:inline">{isPreviewMode ? 'Editing' : 'Preview'}</span>
        </button>

        {/* Version History Modal Trigger */}
        <button
          type="button"
          onClick={openRollbackModal}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all border border-slate-200 flex items-center gap-1.5"
          title="Version History & Rollbacks"
        >
          <History className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">History</span>
        </button>

        {/* Manual Save Draft Trigger */}
        <button
          type="button"
          onClick={onManualSave}
          disabled={saveStatus === 'saving'}
          className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 hover:text-slate-900 text-xs font-semibold transition-all border border-slate-200 flex items-center gap-1.5 disabled:opacity-50"
          title="Save draft immediately"
        >
          <Save className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden md:inline">Save Draft</span>
        </button>

        {/* Publish Live Button */}
        <button
          type="button"
          onClick={openPublishModal}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/30 active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Publish</span>
        </button>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. LEFT SIDEBAR OVERRIDE (Components, Layers & Assets)
// ─────────────────────────────────────────────────────────────
function StudioLeftSidebar({ children }: { children?: React.ReactNode }) {
  const { tenantSlug, pageInfo } = useBuilderUI();
  const { appState, dispatch } = usePuck();

  // Start on Starters tab if page is empty to guide the user
  const [activeTab, setActiveTab] = useState<'templates' | 'components' | 'layers' | 'assets'>(
    !appState.data.content || appState.data.content.length <= 1 ? 'templates' : 'components'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    hero: true,
    services: true,
    catalog: true,
    store: true,
    trust: false,
    forms: false,
    content: false,
    brand: false,
    footer: false,
    seo: false,
    layout: false, // Wireframes collapsed at bottom
  });

  const [assetSearch, setAssetSearch] = useState('');
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);

  // Listen to tab switch events from top toolbar
  useEffect(() => {
    const handleSwitch = (e: any) => {
      if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener('site-studio-switch-tab', handleSwitch);
    return () => window.removeEventListener('site-studio-switch-tab', handleSwitch);
  }, []);

  // Filter components based on query & category
  const filteredComponents = COMPONENT_METADATA.filter((c) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered components by category
  const componentsByCategory = CATEGORIES.filter((cat) => cat.id !== 'all').map((cat) => ({
    ...cat,
    items: filteredComponents.filter((c) => c.category === cat.id),
  }));

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // 1-Click Apply Complete Landing Page Template
  const handleApplyStarterTemplate = (templateId: string, mode: 'replace' | 'append') => {
    const template = LANDING_PAGE_STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const brandName = pageInfo?.brand?.name || 'Local Storefront';
    const rawBlocks = template.generateBlocks(brandName, '+1 (555) 234-5678');

    if (mode === 'replace') {
      const sanitized = rawBlocks.map((b, i) => sanitizeBlockItem(b, i));
      dispatch({
        type: 'setData',
        data: {
          content: sanitized,
          root: { props: { title: `${brandName} - ${template.title}` } },
        },
      });
      setAppliedNotification(`Applied "${template.title}"! All sections are ready to edit.`);
      setTimeout(() => setAppliedNotification(null), 4000);
      setActiveTab('components');
    } else {
      const existing = appState.data.content || [];
      const sanitized = rawBlocks.map((b, i) => sanitizeBlockItem(b, existing.length + i));
      dispatch({
        type: 'setData',
        data: (prev: any) => ({
          ...prev,
          content: [...(prev.content || []), ...sanitized],
        }),
      });
      setAppliedNotification(`Appended "${template.title}" sections to page!`);
      setTimeout(() => setAppliedNotification(null), 4000);
      setActiveTab('layers');
    }
  };

  // Clear canvas handler
  const handleClearCanvas = () => {
    if (confirm('Clear all blocks on this page to start fresh? You can immediately choose a starter template.')) {
      dispatch({
        type: 'setData',
        data: {
          content: [],
          root: { props: { title: 'Storefront' } },
        },
      });
      setActiveTab('templates');
    }
  };

  // Click-to-add action
  const handleInsertComponent = (compType: string) => {
    const components = (siteStudioPuckConfig.components || {}) as Record<string, any>;
    const targetType = components[compType] ? compType : 'Section';
    const nextIdx = appState.data.content?.length || 0;
    dispatch({
      type: 'insert',
      componentType: targetType,
      destinationIndex: nextIdx,
      destinationZone: 'root:default-zone',
    });
  };

  // Copy asset URL
  const handleCopyAsset = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedAssetId(id);
    setTimeout(() => setCopiedAssetId(null), 2000);
  };

  // Insert asset as image block
  const handleInsertAssetAsImage = (url: string) => {
    const components = (siteStudioPuckConfig.components || {}) as Record<string, any>;
    const targetType = components['Image'] ? 'Image' : components['ImageBlock'] ? 'ImageBlock' : 'Section';
    const nextIdx = appState.data.content?.length || 0;
    dispatch({
      type: 'insert',
      componentType: targetType,
      destinationIndex: nextIdx,
      destinationZone: 'root:default-zone',
    });
  };

  return (
    <aside className="w-[320px] h-[calc(100vh-49px)] bg-white border-r border-slate-200 flex flex-col select-none text-slate-700">
      {/* ── Tab Switcher Header (4 tabs: Starters, Sections, Layers, Assets) ── */}
      <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/90 p-1.5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'templates'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="1-Click Complete Landing Page Starters"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>Starters</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('components')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'components'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Add Pre-Built Section Blocks"
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
          <span>Sections</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('layers')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
            activeTab === 'layers'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Inspect and reorder page sections"
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>Layers</span>
          {appState.data.content?.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
              {appState.data.content.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'assets'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Media library assets"
        >
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Assets</span>
        </button>
      </div>

      {/* ── Notification Banner if template applied ── */}
      {appliedNotification && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-2 flex items-center justify-between text-xs text-emerald-800 font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] leading-tight">{appliedNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setAppliedNotification(null)}
            className="text-emerald-600 hover:text-emerald-900 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── TAB 1: 1-CLICK STARTER TEMPLATES ── */}
      {activeTab === 'templates' && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/40 overflow-y-auto">
          {/* Header Banner */}
          <div className="p-3.5 border-b border-slate-200 bg-white space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>1-Click Landing Pages</span>
              </span>
              {appState.data.content?.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCanvas}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold hover:underline flex items-center gap-1"
                  title="Clear all blocks to start fresh"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear canvas</span>
                </button>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900">Choose a Starter Template</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instantly generate a complete, high-converting landing page with 1 click.
            </p>
          </div>

          {/* Template Cards */}
          <div className="p-3 space-y-3.5">
            {LANDING_PAGE_STARTER_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all overflow-hidden flex flex-col group"
              >
                {/* Accent Top Bar */}
                <div className={`h-1.5 bg-gradient-to-r ${tmpl.accentColor}`} />

                <div className="p-3.5 space-y-2.5 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-indigo-950">
                      {tmpl.title}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
                      {tmpl.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {tmpl.tagline}
                  </p>

                  {/* Section Breakdown Pills */}
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Includes {tmpl.sectionsList.length} Sections:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {tmpl.sectionsList.slice(0, 5).map((sec, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-medium"
                        >
                          {sec}
                        </span>
                      ))}
                      {tmpl.sectionsList.length > 5 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-700 font-bold">
                          +{tmpl.sectionsList.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyStarterTemplate(tmpl.id, 'replace')}
                    className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5"
                    title="Replace page with this complete landing page"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Use Page</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyStarterTemplate(tmpl.id, 'append')}
                    className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1"
                    title="Append sections to current page"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Below</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: SECTIONS / COMPONENTS ── */}
      {activeTab === 'components' && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
          {/* Quick Starter Banner */}
          <div className="p-2.5 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-indigo-950 truncate flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Want a complete landing page?</span>
              </p>
              <p className="text-[10px] text-indigo-700 truncate">1-click starter templates are ready.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-2xs shrink-0 transition-colors"
            >
              Starters
            </button>
          </div>

          {/* Search Input */}
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 45+ section blocks..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Quick Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 no-scrollbar">
              {CATEGORIES.slice(0, 9).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Component Accordion Categories */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            <Drawer>
              {componentsByCategory.map((category) => {
                if (category.items.length === 0) return null;
                const isExpanded = expandedCategories[category.id] ?? true;
                const CategoryIcon = category.icon;

                return (
                  <div key={category.id} className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                    {/* Category Header */}
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpand(category.id)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">{category.label}</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full text-slate-600 font-semibold border border-slate-200/60">
                          {category.items.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {/* Component Items */}
                    {isExpanded && (
                      <div className="p-1.5 space-y-1.5 border-t border-slate-100 bg-slate-50/50">
                        {category.items.map((comp) => {
                          const isRegistered = Boolean((siteStudioPuckConfig.components as Record<string, any>)?.[comp.type]);
                          if (!isRegistered) return null;
                          const CompIcon = comp.icon;
                          return (
                            <div
                              key={comp.type}
                              className="group relative flex items-center justify-between p-2 rounded-lg bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing shadow-2xs hover:shadow-xs"
                            >
                              {/* Drag handle wrapping native Puck Drawer.Item */}
                              <Drawer.Item name={comp.type}>
                                {() => (
                                  <div className="flex items-start gap-2.5 flex-1 pr-2">
                                    <div className="w-7 h-7 rounded-md bg-slate-100 group-hover:bg-indigo-100/70 group-hover:border-indigo-300 border border-slate-200 flex items-center justify-center shrink-0 transition-colors">
                                      <CompIcon className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-950 truncate">
                                        {comp.name}
                                      </p>
                                      <p className="text-[10px] text-slate-500 line-clamp-1">
                                        {comp.description}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </Drawer.Item>

                              {/* Quick Click-to-Add Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInsertComponent(comp.type);
                                }}
                                className="w-6 h-6 rounded-md bg-slate-100 hover:bg-indigo-600 text-slate-600 hover:text-white border border-slate-200 hover:border-indigo-600 flex items-center justify-center transition-colors shrink-0 shadow-2xs"
                                title={`Add ${comp.name} to canvas`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </Drawer>

            {filteredComponents.length === 0 && (
              <div className="text-center py-12 px-4 space-y-3">
                <Search className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No components matched &quot;{searchQuery}&quot;</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 shadow-sm"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: LAYERS TREE ── */}
      {activeTab === 'layers' && (
        <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2 bg-slate-50/30">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800">Page Layers</span>
              <span className="text-[10px] text-slate-400 ml-1.5 font-semibold">
                ({appState.data.content?.length || 0})
              </span>
            </div>
            {appState.data.content?.length > 0 && (
              <button
                type="button"
                onClick={handleClearCanvas}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline"
                title="Clear all layers on page"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear all</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {(!appState.data.content || appState.data.content.length === 0) ? (
              <div className="text-center py-16 px-4 space-y-3">
                <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Page Canvas is Empty</p>
                <p className="text-[11px] text-slate-500">Pick a complete starter landing page or add individual sections.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('templates')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 shadow-sm"
                >
                  🚀 Choose a Starter Template
                </button>
              </div>
            ) : (
              appState.data.content.map((block: any, idx: number) => {
                const isSelected = appState.ui.itemSelector?.index === idx;
                const meta = COMPONENT_METADATA.find((m) => m.type === block.type);
                const BlockIcon = meta?.icon || Layout;

                return (
                  <div
                    key={block.props?.id || `${block.type}-${idx}`}
                    onClick={() => {
                      dispatch({
                        type: 'setUi',
                        ui: { itemSelector: { index: idx, zone: 'root:default-zone' } },
                      });
                    }}
                    className={`group flex items-center justify-between p-2 rounded-xl border text-xs transition-all cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <BlockIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                      <div className="min-w-0">
                        <p className="font-semibold truncate leading-tight text-slate-900">
                          {meta?.name || block.type}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate font-mono">
                          #{block.props?.id || block.type}
                        </p>
                      </div>
                    </div>

                    {/* Quick Layer Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({
                              type: 'reorder',
                              sourceIndex: idx,
                              destinationIndex: idx - 1,
                              destinationZone: 'root:default-zone',
                            });
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                          title="Move Up"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                      )}
                      {idx < appState.data.content.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch({
                              type: 'reorder',
                              sourceIndex: idx,
                              destinationIndex: idx + 1,
                              destinationZone: 'root:default-zone',
                            });
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                          title="Move Down"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({
                            type: 'duplicate',
                            sourceIndex: idx,
                            sourceZone: 'root:default-zone',
                          });
                        }}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({
                            type: 'remove',
                            index: idx,
                            zone: 'root:default-zone',
                          });
                        }}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: MEDIA ASSETS ── */}
      {activeTab === 'assets' && (
        <div className="flex-1 flex flex-col min-h-0 p-3 space-y-3 bg-slate-50/30">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              placeholder="Search tenant media..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {SAMPLE_ASSETS.filter((a) => a.name.toLowerCase().includes(assetSearch.toLowerCase())).map((asset) => (
              <div
                key={asset.id}
                className="group p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 space-y-2 transition-all shadow-2xs"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleCopyAsset(asset.url, asset.id)}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-semibold flex items-center gap-1 shadow-sm"
                    >
                      {copiedAssetId === asset.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedAssetId === asset.id ? 'Copied' : 'Copy URL'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertAssetAsImage(asset.url)}
                      className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Insert</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-800 truncate">{asset.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{asset.dims}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. RIGHT PROPERTIES PANEL OVERRIDE (Inspector Panel)
// ─────────────────────────────────────────────────────────────
function StudioPropertiesPanel({
  children,
  isLoading,
  itemSelector,
}: {
  children?: React.ReactNode;
  isLoading?: boolean;
  itemSelector?: any;
}) {
  const { pageInfo, currentVersion, publishedVersion } = useBuilderUI();
  const { appState, dispatch, selectedItem } = usePuck();

  // If a block is currently selected on the canvas
  if (selectedItem) {
    const meta = COMPONENT_METADATA.find((m) => m.type === selectedItem.type);
    const CompIcon = meta?.icon || Layout;

    return (
      <aside className="w-[340px] h-[calc(100vh-49px)] bg-white border-l border-slate-200 flex flex-col select-none text-slate-800">
        {/* Component Header Banner */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
              <CompIcon className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {meta?.name || selectedItem.type}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate">
                #{selectedItem.props?.id || selectedItem.type}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {itemSelector && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({
                      type: 'duplicate',
                      sourceIndex: itemSelector.index,
                      sourceZone: itemSelector.zone || 'root:default-zone',
                    });
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                  title="Duplicate Component"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({
                      type: 'remove',
                      index: itemSelector.index,
                      zone: itemSelector.zone || 'root:default-zone',
                    });
                  }}
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Delete Component"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                dispatch({
                  type: 'setUi',
                  ui: { itemSelector: null },
                });
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              title="Deselect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Component Properties Fields */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          <div className="space-y-3">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Component Properties & Content
            </span>
            <div className="puck-fields-container text-xs space-y-3">
              {children}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Fallback: Global Page & Theme Inspector when no component is selected
  return (
    <aside className="w-[340px] h-[calc(100vh-49px)] bg-white border-l border-slate-200 flex flex-col select-none text-slate-800">
      <div className="p-3 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-900">Page Settings & Brand</span>
        </div>
        <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">
          v{currentVersion}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/30">
        {/* Page Identity */}
        <div className="space-y-2 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Page Information</span>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Route Slug:</span>
              <span className="font-mono font-semibold text-slate-800">{pageInfo?.slug || '/'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Page Type:</span>
              <span className="font-semibold text-indigo-600">{pageInfo?.pageType || 'HOME'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Live Status:</span>
              <span className={`font-semibold ${publishedVersion ? 'text-emerald-600' : 'text-amber-600'}`}>
                {publishedVersion ? `Published (v${publishedVersion})` : 'Draft Only'}
              </span>
            </div>
          </div>
        </div>

        {/* Brand Theme Tokens */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Brand Palette</span>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <div className="w-full h-5 rounded-md bg-indigo-600 mx-auto shadow-2xs" />
              <span className="text-[10px] text-slate-600 block font-medium">Primary</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <div className="w-full h-5 rounded-md bg-white mx-auto border border-slate-300 shadow-2xs" />
              <span className="text-[10px] text-slate-600 block font-medium">Surface</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <div className="w-full h-5 rounded-md bg-amber-500 mx-auto shadow-2xs" />
              <span className="text-[10px] text-slate-600 block font-medium">Accent Gold</span>
            </div>
          </div>
        </div>

        {/* Helpful Tip */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-indigo-900 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Interactive Editing</span>
          </div>
          <p className="text-[11px] text-indigo-800/80 leading-relaxed">
            Click any section on the canvas to inspect its properties, typography, alignment, and styling controls here.
          </p>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN SITE STUDIO BUILDER PAGE COMPONENT
// ─────────────────────────────────────────────────────────────
function SiteStudioBuilderContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const pageId = params.pageId as string;
  const brandId = searchParams.get('brandId');

  // Page & Version State
  const [pageInfo, setPageInfo] = useState<any | null>(null);
  const [templateInfo, setTemplateInfo] = useState<any | null>(null);
  const [brandInfo, setBrandInfo] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [domainInfo, setDomainInfo] = useState<{ id: string; hostname: string; isPrimary: boolean } | null>(null);
  const [theme, setTheme] = useState<BrandThemeDto | null>(null);
  const [puckData, setPuckData] = useState<Data | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [historicalVersions, setHistoricalVersions] = useState<any[]>([]);

  // Editor UI State
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // Debounced autosave ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial page and puckData
  const loadPageData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages/${pageId}/puck`);
      const data = await res.json();
      if (data.success && data.puckData) {
        setPageInfo(data.page);
        setTemplateInfo(data.template);
        if (data.brand) setBrandInfo(data.brand);
        if (data.domain) setDomainInfo(data.domain);
        setPuckData(sanitizeClientPuckData(data.puckData));
        setCurrentVersion(data.currentVersion);
        setPublishedVersion(data.publishedVersion);
        setHistoricalVersions(data.historicalVersions || []);

        const targetBrandId = data.brand?.id || brandId;
        if (targetBrandId) {
          try {
            const themeRes = await fetch(`/api/tenants/${tenantSlug}/website/design?brandId=${targetBrandId}`);
            const themeData = await themeRes.json();
            if (themeData.success && themeData.theme) {
              setTheme(themeData.theme);
            }
          } catch {
            // Non-fatal, deterministic defaults apply
          }
        }
      } else {
        setLoadError(extractErrorMessage(data?.error, 'Failed to load page layout template.'));
      }
    } catch (err) {
      console.error('Failed to load page builder data', err);
      setLoadError('Network error connecting to tenant page service.');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, pageId, brandId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Handle puck change with debounced save
  const handlePuckChange = (newData: Data) => {
    setPuckData(newData);
    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tenants/${tenantSlug}/website/pages/${pageId}/puck`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puckData: newData }),
        });
        const json = await res.json();
        if (json.success) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2500);
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        setSaveStatus('error');
      }
    }, 1200); // 1.2s debounce
  };

  // Immediate manual save
  const handleManualSave = async () => {
    if (!puckData) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages/${pageId}/puck`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puckData }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    }
  };

  // Publish latest draft
  const handlePublish = async () => {
    try {
      setPublishing(true);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages/${pageId}/publish`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setPublishSuccess(true);
        setPublishedVersion(data.version);
        setTimeout(() => {
          setPublishSuccess(false);
          setPublishModalOpen(false);
          loadPageData();
        }, 1500);
      } else {
        alert(data.error || 'Failed to publish page.');
      }
    } catch (err) {
      alert('Network error publishing page.');
    } finally {
      setPublishing(false);
    }
  };

  // Rollback to historical version
  const handleRollback = async (targetVersion: number) => {
    if (!templateInfo?.id) return;
    try {
      setRollingBack(true);
      const res = await fetch(`/api/tenants/${tenantSlug}/website/pages/${pageId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: templateInfo.id,
          targetVersionNumber: targetVersion,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRollbackModalOpen(false);
        loadPageData();
      } else {
        alert(data.error || 'Failed to rollback version.');
      }
    } catch (err) {
      alert('Error rolling back version.');
    } finally {
      setRollingBack(false);
    }
  };

  // Dynamic PageContext for visual builder preview
  const effectiveTheme: BrandThemeDto = theme || {
    id: `theme-builder-${brandInfo?.id || brandId || 'default'}`,
    tenantId: 't1',
    brandId: brandInfo?.id || brandId || 'b1',
    ...DEFAULT_THEME_VALUES,
    customCss: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const cssBlock = ThemeService.generateCssBlock(effectiveTheme);

  const previewContext: PageContext = {
    tenant: { id: 't1', name: 'Organization', slug: tenantSlug },
    brand: brandInfo || { id: brandId || 'b1', name: 'Local Brand', slug: 'brand' },
    webSurface: {
      id: 'ws1',
      tenantId: 't1',
      brandId: brandInfo?.id || brandId || 'b1',
      type: 'LOCALBI',
      name: `${brandInfo?.name || 'Local Brand'} Website`,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    domain: domainInfo
      ? {
          id: domainInfo.id,
          tenantId: 't1',
          brandId: brandInfo?.id || brandId || 'b1',
          webSurfaceId: 'ws1',
          hostname: domainInfo.hostname,
          isPrimary: domainInfo.isPrimary,
          isVerified: true,
          sslStatus: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      : {
          id: 'd1',
          tenantId: 't1',
          brandId: brandInfo?.id || brandId || 'b1',
          webSurfaceId: 'ws1',
          hostname: `${tenantSlug}.localbi.app`,
          isPrimary: true,
          isVerified: true,
          sslStatus: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
    theme: effectiveTheme,
    cssBlock,
    navigation: (puckData?.root?.props as any)?.navigation || {
      headerItems: [
        { id: '1', label: 'Home', type: 'INTERNAL_PAGE', target: '/#home', order: 0 },
        { id: '2', label: 'About', type: 'INTERNAL_PAGE', target: '/#about', order: 1 },
        { id: '3', label: 'Services', type: 'INTERNAL_PAGE', target: '/#services', order: 2 },
        { id: '4', label: 'Contact', type: 'INTERNAL_PAGE', target: '/#contact', order: 3 },
      ],
      footerItems: [
        { id: 'f1', label: 'Privacy Policy', type: 'INTERNAL_PAGE', target: '/privacy', order: 0 },
      ],
    },
    pageType: pageInfo?.pageType || 'HOME',
    path: pageInfo?.slug || '/',
    store: null,
    products: [],
    nearbyStores: [],
    reviews: [],
    faqs: [],
    seo: {
      title: `${brandInfo?.name || 'Storefront'} | Official Website`,
      description: `Official website for ${brandInfo?.name || 'our business'}.`,
      canonicalUrl: `${pageInfo?.slug || '/'}`,
      robots: 'index, follow',
      openGraph: { title: brandInfo?.name || 'Storefront', description: '', url: '', siteName: brandInfo?.name || '', type: 'website' },
      twitter: { card: 'summary', title: brandInfo?.name || 'Storefront', description: '' },
    },
    structuredData: [],
    breadcrumbs: [{ name: 'Home', url: '/' }],
    trackingContext: {
      tenantSlug,
      brandId: brandInfo?.id || brandId || 'b1',
      webSurfaceId: 'ws1',
      pageType: pageInfo?.pageType || 'HOME',
    },
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50 text-slate-600 p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-xs">
          <AlertCircle className="w-6 h-6 text-rose-600" />
        </div>
        <div className="space-y-1 max-w-md">
          <p className="text-sm font-bold text-slate-900 tracking-wide">Unable to Load Page Builder</p>
          <p className="text-xs text-rose-600">{loadError}</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={loadPageData}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href={`/client/${tenantSlug}/website/pages${brandId ? `?brandId=${brandId}` : ''}`}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs"
          >
            Back to Pages
          </Link>
        </div>
      </div>
    );
  }

  if (!isMounted || loading || !puckData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50 text-slate-600">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center animate-pulse shadow-xs">
            <Sparkles className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-slate-900 tracking-wide">Loading Site Studio Visual Canvas</p>
          <p className="text-xs text-slate-500">Connecting to tenant database & page templates...</p>
        </div>
      </div>
    );
  }

  const builderUIValue: BuilderUIContextType = {
    tenantSlug,
    brandId,
    pageInfo,
    currentVersion,
    publishedVersion,
    saveStatus,
    zoomLevel,
    setZoomLevel,
    openPublishModal: () => setPublishModalOpen(true),
    openRollbackModal: () => setRollbackModalOpen(true),
    onManualSave: handleManualSave,
  };

  return (
    <PageContextProvider value={previewContext}>
      <BuilderUIContext.Provider value={builderUIValue}>
        <div className="site-studio-builder-root fixed inset-0 z-40 bg-slate-100 overflow-hidden flex flex-col" style={{ '--puck-canvas-zoom': zoomLevel / 100 } as React.CSSProperties}>
          {/* Safe Brand Custom CSS Variables & Dynamic Rules */}
          <style dangerouslySetInnerHTML={{ __html: previewContext.cssBlock }} />

          <Puck
            config={siteStudioPuckConfig}
            data={puckData}
            onChange={handlePuckChange}
            viewports={[
              { width: 1280, height: 'auto', label: 'Desktop', icon: 'Monitor' },
              { width: 768, height: 'auto', label: 'Tablet', icon: 'Tablet' },
              { width: 390, height: 'auto', label: 'Mobile', icon: 'Smartphone' },
            ]}
            iframe={{ enabled: false }}
            overrides={{
              header: ({ actions }) => <StudioTopToolbar actions={actions} />,
              drawer: ({ children }) => <StudioLeftSidebar>{children}</StudioLeftSidebar>,
              outline: () => <></>,
              fields: ({ children, isLoading, itemSelector }) => (
                <StudioPropertiesPanel isLoading={isLoading} itemSelector={itemSelector}>
                  {children}
                </StudioPropertiesPanel>
              ),
            }}
          />

          {/* ── Publish Dialog Modal ── */}
          {publishModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-slate-900">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                      <Send className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Publish Page to Live Website</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    This will atomically promote your current draft layout (v{currentVersion}) to your live storefront domain.
                  </p>
                </div>

                {publishSuccess ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-sm">Published Successfully!</p>
                      <p className="text-[11px] text-emerald-700">Version v{currentVersion} is now live.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Route Slug:</span>
                        <span className="font-mono font-semibold text-slate-900">{pageInfo?.slug}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">New Published Version:</span>
                        <span className="font-bold text-indigo-600">v{currentVersion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Live Version:</span>
                        <span className="text-slate-700">{publishedVersion ? `v${publishedVersion}` : 'None (Draft only)'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setPublishModalOpen(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={publishing}
                        onClick={handlePublish}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-md flex items-center gap-2"
                      >
                        {publishing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Publishing atomically...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Confirm & Publish</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Rollback History Modal ── */}
          {rollbackModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-slate-900">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                      <History className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Version History & Rollback</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Select any historical version to restore safely. Restoring creates an immutable new draft version.
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {historicalVersions.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Version {v.version}</span>
                          {v.status === 'PUBLISHED' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Current Live
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {new Date(v.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {v.version !== currentVersion && (
                        <button
                          type="button"
                          disabled={rollingBack}
                          onClick={() => handleRollback(v.version)}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 rounded-lg transition-colors disabled:opacity-50 shadow-2xs"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setRollbackModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </BuilderUIContext.Provider>
    </PageContextProvider>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORT DEFAULT WITH SUSPENSE BOUNDARY
// ─────────────────────────────────────────────────────────────
export default function SiteStudioBuilderPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50 text-slate-600">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-900 tracking-wide">Initializing Site Studio Editor</p>
            <p className="text-xs text-slate-500">Preparing component registry & styling...</p>
          </div>
        </div>
      }
    >
      <SiteStudioBuilderContent />
    </React.Suspense>
  );
}
