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
} from 'lucide-react';

export interface SafeTenantNavDto {
  id: string;
  name: string;
  slug: string;
  plan: string;
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
  items: NavItem[];
}

export const getNavGroups = (slug: string): NavGroup[] => [
  {
    heading: 'Dashboard',
    items: [
      {
        label: 'Overview',
        href: `/client/${slug}`,
        icon: LayoutDashboard,
        exact: true,
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
    heading: 'Storefront Microsites',
    sourceBadge: 'SITES',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    items: [
      {
        label: 'Subdomain Sites & Builder',
        href: `/client/${slug}/microsites`,
        icon: Globe,
      },
      {
        label: 'Microsite Analytics & Leads',
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
  {
    heading: 'Administration',
    items: [
      {
        label: 'Brands & Businesses',
        href: `/client/${slug}/brands`,
        icon: Tag,
      },
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
  },
];
