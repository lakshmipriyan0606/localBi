import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FileText,
  PenTool,
  LayoutTemplate,
  Palette,
  Compass,
  MapPin,
  ShoppingBag,
  Briefcase,
  MousePointerClick,
  Search,
  Sparkles,
  Network,
  Globe,
  Send,
  History,
  BarChart3,
  TrendingUp,
  BarChart2,
  Link2,
  Users,
  Settings,
} from 'lucide-react';

export interface StudioNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  matchPrefix?: string;
  badge?: string;
  badgeVariant?: 'indigo' | 'emerald' | 'amber' | 'slate' | 'violet';
  isExternalPortal?: boolean;
  isAction?: boolean;
  onClick?: () => void;
}

export interface StudioNavGroup {
  id: string;
  heading: string;
  items: StudioNavItem[];
}

export function getWebsiteStudioNavGroups(
  tenantSlug: string,
  brandId?: string,
  onOpenPublishModal?: () => void
): StudioNavGroup[] {
  const brandQuery = brandId ? `?brandId=${encodeURIComponent(brandId)}` : '';
  const appendBrand = (path: string, extraQuery?: string) => {
    if (extraQuery) {
      return brandId ? `${path}?${extraQuery}&brandId=${encodeURIComponent(brandId)}` : `${path}?${extraQuery}`;
    }
    return `${path}${brandQuery}`;
  };

  return [
    {
      id: 'workspace',
      heading: 'WORKSPACE',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          href: appendBrand(`/client/${tenantSlug}/website`),
          icon: LayoutDashboard,
          exact: true,
        },
        {
          id: 'pages',
          label: 'Pages',
          href: appendBrand(`/client/${tenantSlug}/website/pages`),
          icon: FileText,
          matchPrefix: `/client/${tenantSlug}/website/pages`,
        },
      ],
    },
    {
      id: 'site-builder',
      heading: 'SITE BUILDER',
      items: [
        {
          id: 'builder',
          label: 'Visual Editor',
          href: appendBrand(`/client/${tenantSlug}/website/builder`),
          icon: PenTool,
          matchPrefix: `/client/${tenantSlug}/website/builder`,
        },
        {
          id: 'templates',
          label: 'Templates',
          href: appendBrand(`/client/${tenantSlug}/website/templates`),
          icon: LayoutTemplate,
          matchPrefix: `/client/${tenantSlug}/website/templates`,
        },
        {
          id: 'design',
          label: 'Design & Branding',
          href: appendBrand(`/client/${tenantSlug}/website/design`),
          icon: Palette,
          matchPrefix: `/client/${tenantSlug}/website/design`,
        },
        {
          id: 'navigation',
          label: 'Navigation Menus',
          href: appendBrand(`/client/${tenantSlug}/website/navigation`),
          icon: Compass,
          matchPrefix: `/client/${tenantSlug}/website/navigation`,
        },
      ],
    },
    {
      id: 'business-content',
      heading: 'BUSINESS CONTENT',
      items: [
        {
          id: 'stores',
          label: 'Stores & Locations',
          href: appendBrand(`/client/${tenantSlug}/website/stores`),
          icon: MapPin,
          matchPrefix: `/client/${tenantSlug}/website/stores`,
        },
        {
          id: 'products',
          label: 'Products & Catalog',
          href: appendBrand(`/client/${tenantSlug}/website/products`),
          icon: ShoppingBag,
          matchPrefix: `/client/${tenantSlug}/website/products`,
        },
        {
          id: 'services',
          label: 'Services & Offerings',
          href: appendBrand(`/client/${tenantSlug}/catalog`, 'tab=categories'),
          icon: Briefcase,
          isExternalPortal: true,
        },
        {
          id: 'leads',
          label: 'Forms & Leads',
          href: `/client/${tenantSlug}/leads`,
          icon: MousePointerClick,
          isExternalPortal: true,
          badge: 'Live',
          badgeVariant: 'indigo',
        },
      ],
    },
    {
      id: 'seo-discoverability',
      heading: 'SEO & DISCOVERABILITY',
      items: [
        {
          id: 'seo-settings',
          label: 'SEO Settings',
          href: appendBrand(`/client/${tenantSlug}/website/seo`),
          icon: Search,
          exact: true,
        },
        {
          id: 'seo-intelligence',
          label: 'SEO Intelligence',
          href: appendBrand(`/client/${tenantSlug}/website/seo/intelligence`),
          icon: Sparkles,
          matchPrefix: `/client/${tenantSlug}/website/seo/intelligence`,
          badge: 'AI',
          badgeVariant: 'violet',
        },
        {
          id: 'sitemap-indexing',
          label: 'Sitemap & Indexing',
          href: appendBrand(`/client/${tenantSlug}/website/seo`, 'tab=indexing'),
          icon: Network,
        },
      ],
    },
    {
      id: 'domains-publishing',
      heading: 'DOMAINS & PUBLISHING',
      items: [
        {
          id: 'domains',
          label: 'Domains & DNS',
          href: appendBrand(`/client/${tenantSlug}/website/domains`),
          icon: Globe,
          matchPrefix: `/client/${tenantSlug}/website/domains`,
        },
        {
          id: 'publishing',
          label: 'Publishing & Deployments',
          href: appendBrand(`/client/${tenantSlug}/website/publishing`),
          icon: Send,
          matchPrefix: `/client/${tenantSlug}/website/publishing`,
        },
        {
          id: 'version-history',
          label: 'Version History',
          href: appendBrand(`/client/${tenantSlug}/website/builder`, 'view=history'),
          icon: History,
        },
      ],
    },
    {
      id: 'performance',
      heading: 'PERFORMANCE',
      items: [
        {
          id: 'analytics',
          label: 'Website Analytics',
          href: appendBrand(`/client/${tenantSlug}/website/analytics`),
          icon: BarChart3,
          exact: true,
        },
        {
          id: 'conversions',
          label: 'Conversion Tracking',
          href: appendBrand(`/client/${tenantSlug}/website/analytics`, 'tab=conversions'),
          icon: TrendingUp,
        },
        {
          id: 'reports',
          label: 'Reports',
          href: `/client/${tenantSlug}/reports`,
          icon: BarChart2,
          isExternalPortal: true,
        },
      ],
    },
    {
      id: 'configuration',
      heading: 'CONFIGURATION',
      items: [
        {
          id: 'integrations',
          label: 'Integrations',
          href: `/client/${tenantSlug}/integrations`,
          icon: Link2,
          isExternalPortal: true,
        },
        {
          id: 'team',
          label: 'Team & Permissions',
          href: `/client/${tenantSlug}/team`,
          icon: Users,
          isExternalPortal: true,
        },
        {
          id: 'website-settings',
          label: 'Website Settings',
          href: appendBrand(`/client/${tenantSlug}/website/settings`),
          icon: Settings,
          matchPrefix: `/client/${tenantSlug}/website/settings`,
        },
      ],
    },
  ];
}
