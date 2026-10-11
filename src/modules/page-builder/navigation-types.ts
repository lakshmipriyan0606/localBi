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
    { id: 'nav-home', label: 'Home', type: 'INTERNAL_PAGE', target: '/#home', order: 0 },
    { id: 'nav-about', label: 'About', type: 'INTERNAL_PAGE', target: '/#about', order: 1 },
    { id: 'nav-services', label: 'Services', type: 'INTERNAL_PAGE', target: '/#services', order: 2 },
    { id: 'nav-contact', label: 'Contact', type: 'INTERNAL_PAGE', target: '/#contact', order: 3 },
  ],
  footerItems: [
    { id: 'nav-foot-home', label: 'Home', type: 'INTERNAL_PAGE', target: '/#home', order: 0 },
    { id: 'nav-foot-about', label: 'About', type: 'INTERNAL_PAGE', target: '/#about', order: 1 },
    { id: 'nav-foot-services', label: 'Services', type: 'INTERNAL_PAGE', target: '/#services', order: 2 },
    { id: 'nav-foot-contact', label: 'Contact', type: 'INTERNAL_PAGE', target: '/#contact', order: 3 },
  ],
};
