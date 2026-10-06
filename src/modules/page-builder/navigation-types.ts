export type NavItemType = 'INTERNAL_PAGE' | 'STORE' | 'CATEGORY' | 'PRODUCT' | 'EXTERNAL_URL';

export interface NavItem {
  id: string;
  label: string;
  type: NavItemType;
  target: string;
  order: number;
  openInNewTab?: boolean | undefined;
}

export interface SiteNavigationDto {
  headerItems: NavItem[];
  footerItems: NavItem[];
}

export const DEFAULT_SITE_NAVIGATION: SiteNavigationDto = {
  headerItems: [
    { id: 'nav-home', label: 'Home', type: 'INTERNAL_PAGE', target: '/', order: 0 },
    { id: 'nav-stores', label: 'Locations', type: 'INTERNAL_PAGE', target: '/locations', order: 1 },
    { id: 'nav-products', label: 'Catalog', type: 'INTERNAL_PAGE', target: '/products', order: 2 },
    { id: 'nav-contact', label: 'Contact', type: 'INTERNAL_PAGE', target: '/contact', order: 3 },
  ],
  footerItems: [
    { id: 'nav-foot-home', label: 'Overview', type: 'INTERNAL_PAGE', target: '/', order: 0 },
    { id: 'nav-foot-stores', label: 'Store Finder', type: 'INTERNAL_PAGE', target: '/locations', order: 1 },
    { id: 'nav-foot-privacy', label: 'Privacy Policy', type: 'INTERNAL_PAGE', target: '/privacy', order: 2 },
    { id: 'nav-foot-terms', label: 'Terms & Conditions', type: 'INTERNAL_PAGE', target: '/terms', order: 3 },
  ],
};
