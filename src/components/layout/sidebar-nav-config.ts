import {
  LayoutDashboard,
  Store,
  Layers,
  SearchCode,
  MapPin,
  TrendingUp,
  Search,
  FileText,
  Globe,
  MonitorSmartphone,
  BarChart2,
  Activity,
  MousePointerClick,
  Link2,
  Tag,
  Users,
  Mail,
  Settings,
  Fingerprint,
  Network,
  Star,
  Image,
  MessageSquare,
  Settings2,
  Folder,
  Package,
  Radar,
  ShoppingBag,
  PhoneCall,
  Lightbulb,
  BookOpen,
  Briefcase,
  ShieldCheck,
  Palette,
} from 'lucide-react';

export interface SafeTenantNavDto {
  id: string;
  name: string;
  slug: string;
  plan: string;
  tenantType?: string | undefined;
  timezone: string;
}

export interface SafeUserNavDto {
  id: string;
  email: string;
  fullName?: string | null | undefined;
  role: string;
}

export interface AuthorizedTenantDto {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  pillBadge?: string;
  badgeVariant?: 'purple' | 'slate' | 'emerald' | 'amber' | 'indigo';
}

export interface NavGroup {
  heading: string;
  sourceBadge?: string;
  badgeColor?: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

export interface GetNavGroupsOptions {
  role?: string | undefined;
  tenantType?: string | undefined;
  plan?: string | undefined;
}

export function isAgencyContext(options?: GetNavGroupsOptions): boolean {
  if (!options) return false;
  const role = (options.role || '').toUpperCase();
  const tenantType = (options.tenantType || '').toUpperCase();
  const plan = (options.plan || '').toUpperCase();

  // Direct clients should never see agency navigation
  if (tenantType === 'DIRECT_CLIENT' && !role.startsWith('AGENCY')) {
    return false;
  }

  // Only show for agency roles or explicit agency plans/tenant types
  return (
    role.startsWith('AGENCY') ||
    tenantType === 'AGENCY' ||
    plan === 'AGENCY' ||
    plan.includes('AGENCY')
  );
}

export const getNavGroups = (slug: string, options?: GetNavGroupsOptions): NavGroup[] => {
  const groups: NavGroup[] = [
  {
    heading: 'Dashboard',
    items: [
      {
        label: 'Overview',
        href: `/client/${slug}`,
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: 'Executive Report',
        href: `/client/${slug}/reports/executive`,
        icon: BarChart2,
        pillBadge: 'Cross-Module',
        badgeVariant: 'indigo',
      },
    ],
  },
  {
    heading: 'Google Business Profile',
    sourceBadge: 'GBP',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    items: [
      {
        label: 'Store Overview',
        href: `/client/${slug}/reports?tab=gbp`,
        icon: Store,
      },
      {
        label: 'All Store Locations',
        href: `/client/${slug}/reports/gbp/locations`,
        icon: Layers,
      },
      {
        label: 'Customer Search Keywords',
        href: `/client/${slug}/reports/gbp/search-terms`,
        icon: SearchCode,
      },
      {
        label: 'Reviews',
        href: `/client/${slug}/reports/gbp/reviews`,
        icon: Star,
      },
      {
        label: 'Profile Editor',
        href: `/client/${slug}/reports/gbp/profile`,
        icon: Settings2,
      },
      {
        label: 'Photos',
        href: `/client/${slug}/reports/gbp/photos`,
        icon: Image,
      },
      {
        label: 'Posts',
        href: `/client/${slug}/reports/gbp/posts`,
        icon: MessageSquare,
      },
      {
        label: 'Manage Store Locations',
        href: `/client/${slug}/locations`,
        icon: MapPin,
      },
    ],
  },
  {
    heading: 'SEO & Search Rankings',
    sourceBadge: 'SEO',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    items: [
      {
        label: 'Geo-Grid Rank Heatmap',
        href: `/client/${slug}/rank`,
        icon: Radar,
        pillBadge: 'Live',
        badgeVariant: 'emerald',
      },
      {
        label: 'SEO Opportunities',
        href: `/client/${slug}/opportunities`,
        icon: Lightbulb,
        pillBadge: 'Explainable',
        badgeVariant: 'amber',
      },
      {
        label: 'SEO Authority & Backlinks',
        href: `/client/${slug}/authority`,
        icon: Link2,
        pillBadge: 'Authority',
        badgeVariant: 'indigo',
      },
      {
        label: 'Directory Listings & Citations',
        href: `/client/${slug}/listings`,
        icon: Network,
        pillBadge: 'Sync',
        badgeVariant: 'indigo',
      },
      {
        label: 'Content & Blog CMS',
        href: `/client/${slug}/content`,
        icon: BookOpen,
        pillBadge: 'CMS',
        badgeVariant: 'indigo',
      },
    ],
  },
  {
    heading: 'Google Search Console',
    sourceBadge: 'GSC',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    items: [
      {
        label: 'Website Search Overview',
        href: `/client/${slug}/reports?tab=gsc`,
        icon: TrendingUp,
      },
      {
        label: 'Top Search Keywords',
        href: `/client/${slug}/reports/gsc/queries`,
        icon: Search,
      },
      {
        label: 'Page Indexing & Pages',
        href: `/client/${slug}/reports/gsc/pages`,
        icon: FileText,
      },
      {
        label: 'Sitemaps',
        href: `/client/${slug}/reports/gsc/sitemaps`,
        icon: Network,
      },
      {
        label: 'Visitor Countries',
        href: `/client/${slug}/reports/gsc/countries`,
        icon: Globe,
      },
      {
        label: 'Visitor Devices',
        href: `/client/${slug}/reports/gsc/devices`,
        icon: MonitorSmartphone,
      },
    ],
  },
  {
    heading: 'Google Analytics',
    sourceBadge: 'GA4',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    items: [
      {
        label: 'Website analytics',
        href: `/client/${slug}/reports/ga4`,
        icon: BarChart2,
        exact: true,
      },
      {
        label: 'User engagement & retention',
        href: `/client/${slug}/reports/ga4/engagement`,
        icon: Activity,
      },
      {
        label: 'Pages and screens',
        href: `/client/${slug}/reports/ga4/pages`,
        icon: FileText,
      },
      {
        label: 'Events',
        href: `/client/${slug}/reports/ga4/events`,
        icon: MousePointerClick,
      },
    ],
  },
  {
    heading: 'Google Merchant Center',
    sourceBadge: 'GMC',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    items: [
      {
        label: 'Local Products & Inventory',
        href: `/client/${slug}/merchant`,
        icon: ShoppingBag,
        pillBadge: 'Local Feed',
        badgeVariant: 'amber',
      },
    ],
  },
  {
    heading: 'Website & Conversions',
    sourceBadge: 'SITE',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: Folder,
    items: [
      {
        label: 'LocalBi Site Studio',
        href: `/client/${slug}/website`,
        icon: Globe,
        pillBadge: 'Studio',
        badgeVariant: 'indigo',
      },
      {
        label: 'Brand Management',
        href: `/client/${slug}/brands`,
        icon: Tag,
      },
      {
        label: 'Store Management',
        href: `/client/${slug}/locations`,
        icon: Store,
      },
      {
        label: 'Catalog & Products',
        href: `/client/${slug}/catalog`,
        icon: Package,
      },
      {
        label: 'Leads & Conversions',
        href: `/client/${slug}/leads`,
        icon: MousePointerClick,
        pillBadge: 'Live',
        badgeVariant: 'indigo',
      },
      {
        label: 'Call Tracking & Numbers',
        href: `/client/${slug}/telephony`,
        icon: PhoneCall,
        pillBadge: 'Voice',
        badgeVariant: 'emerald',
      },
      {
        label: 'Microsite Leads & Visitors',
        href: `/client/${slug}/visitors`,
        icon: Fingerprint,
      },
    ],
  },
  {
    heading: 'Connections',
    items: [
      {
        label: 'Connect Google Accounts',
        href: `/client/${slug}/integrations`,
        icon: Link2,
      },
    ],
  },
];

  if (isAgencyContext(options)) {
    groups.push({
      heading: 'Agency & White-Label',
      sourceBadge: 'AGENCY',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      items: [
        {
          label: 'Agency Portfolio',
          href: `/client/${slug}/agency`,
          icon: Briefcase,
          exact: true,
        },
        {
          label: 'Client Accounts',
          href: `/client/${slug}/agency/clients`,
          icon: Users,
        },
        {
          label: 'White-Label & Domains',
          href: `/client/${slug}/agency/branding`,
          icon: Palette,
        },
        {
          label: 'Feature Entitlements',
          href: `/client/${slug}/agency/entitlements`,
          icon: ShieldCheck,
        },
      ],
    });
  }

  groups.push({
    heading: 'Administration',
    items: [
      {
        label: 'Team Members',
        href: `/client/${slug}/team`,
        icon: Users,
      },
      {
        label: 'Invite Team Members',
        href: `/client/${slug}/invitations`,
        icon: Mail,
      },
      {
        label: 'General Settings',
        href: `/client/${slug}/settings`,
        icon: Settings,
      },
    ],
  });

  return groups;
};
