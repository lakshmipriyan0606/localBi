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
  Activity,
  Share2,
  Link2,
  Tag,
  Users,
  Mail,
  Settings,
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
  badgeVariant?: 'purple' | 'slate' | 'emerald' | 'amber';
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
        href: `/t/${slug}`,
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
        label: 'Performance Hub',
        href: `/t/${slug}/reports?tab=gbp`,
        icon: Store,
      },
      {
        label: 'Location Matrix',
        href: `/t/${slug}/reports/gbp/locations`,
        icon: Layers,
      },
      {
        label: 'Monthly Search Terms',
        href: `/t/${slug}/reports/gbp/search-terms`,
        icon: SearchCode,
      },
      {
        label: 'Storefront Directory',
        href: `/t/${slug}/locations`,
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
        label: 'Search Performance',
        href: `/t/${slug}/reports?tab=gsc`,
        icon: TrendingUp,
      },
      {
        label: 'Search Queries',
        href: `/t/${slug}/reports/gsc/queries`,
        icon: Search,
      },
      {
        label: 'Landing Pages',
        href: `/t/${slug}/reports/gsc/pages`,
        icon: FileText,
      },
      {
        label: 'Country Distribution',
        href: `/t/${slug}/reports/gsc/countries`,
        icon: Globe,
      },
      {
        label: 'Device Platforms',
        href: `/t/${slug}/reports/gsc/devices`,
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
        label: 'Traffic & Web Sessions',
        href: `/t/${slug}/reports/ga4`,
        icon: Activity,
        pillBadge: 'PREVIEW',
        badgeVariant: 'purple',
      },
      {
        label: 'Acquisition Channels',
        href: `/t/${slug}/reports/ga4?view=channels`,
        icon: Share2,
        pillBadge: 'SOON',
        badgeVariant: 'slate',
      },
    ],
  },
  {
    heading: 'Connections',
    items: [
      {
        label: 'Google Accounts & Mapping',
        href: `/t/${slug}/integrations`,
        icon: Link2,
      },
    ],
  },
  {
    heading: 'Administration',
    items: [
      {
        label: 'Client Brands',
        href: `/t/${slug}/brands`,
        icon: Tag,
      },
      {
        label: 'Team Members',
        href: `/t/${slug}/team`,
        icon: Users,
      },
      {
        label: 'Invitations',
        href: `/t/${slug}/invitations`,
        icon: Mail,
      },
      {
        label: 'Workspace Settings',
        href: `/t/${slug}/settings`,
        icon: Settings,
      },
    ],
  },
];
