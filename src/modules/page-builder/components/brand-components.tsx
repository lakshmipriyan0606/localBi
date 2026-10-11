'use client';

import React from 'react';
import Link from 'next/link';
import { usePageContext } from '../page-context-react';
import { Sparkles, Phone } from 'lucide-react';

export interface BrandHeaderProps {
  id?: string;
  showCta?: boolean;
  ctaLabel?: string;
  link1Label?: string;
  link1Url?: string;
  link2Label?: string;
  link2Url?: string;
}

export function BrandHeader({
  id = 'header',
  showCta = true,
  ctaLabel = 'Contact Us',
  link1Label = 'Home',
  link1Url = '/#home',
  link2Label = 'About',
  link2Url = '/#about',
}: BrandHeaderProps) {
  const { brand, store, navigation } = usePageContext();
  const headerLinks = navigation?.headerItems?.length
    ? navigation.headerItems
    : [
        { id: '1', label: link1Label, target: link1Url, openInNewTab: false },
        { id: '2', label: link2Label, target: link2Url, openInNewTab: false },
        { id: '3', label: 'Services', target: '/#services', openInNewTab: false },
        { id: '4', label: 'Contact', target: '/#contact', openInNewTab: false },
      ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    if (!target) return;
    const hash = target.includes('#') ? target.split('#')[1] : null;
    if (hash) {
      const el = document.getElementById(hash);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (typeof window !== 'undefined' && window.history?.pushState) {
          window.history.pushState(null, '', `#${hash}`);
        }
      }
    }
  };

  return (
    <header id={id || 'header'} className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          onClick={(e) => handleNavClick(e, '#home')}
          className="flex items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
            style={{ backgroundColor: 'var(--brand-primary, #4F46E5)' }}
          >
            {brand.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-slate-900 leading-none">
              {brand.name}
            </div>
            {store?.city && (
              <span className="text-[11px] text-slate-500 font-medium">
                {store.city}
              </span>
            )}
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {headerLinks.map((item) => (
            <Link
              key={item.id}
              href={item.target}
              onClick={(e) => handleNavClick(e, item.target)}
              target={item.openInNewTab ? '_blank' : undefined}
              rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
              className="hover:text-slate-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {showCta && (
          <a
            href={store?.phone ? `tel:${store.phone}` : '/#contact'}
            onClick={(e) => {
              if (!store?.phone) {
                handleNavClick(e, '#contact');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm hover:opacity-95 transition-opacity"
            style={{
              backgroundColor: 'var(--brand-primary, #4F46E5)',
              borderRadius: 'var(--brand-button-radius, 0.5rem)',
            }}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{ctaLabel}</span>
          </a>
        )}
      </div>

      {/* Mobile navigation bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-100 py-2 px-4 bg-slate-50/80 text-xs font-semibold text-slate-600">
        {headerLinks.map((item) => (
          <Link
            key={item.id}
            href={item.target}
            onClick={(e) => handleNavClick(e, item.target)}
            className="hover:text-slate-900 transition-colors px-2 py-1"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}


export interface BrandHeroProps {
  id?: string;
  badge?: string;
  headline?: string;
  subheading?: string;
  primaryCtaText?: string;
  primaryCtaUrl?: string;
}

export function BrandHero({
  id = 'home',
  badge = 'Local Excellence',
  headline,
  subheading,
}: BrandHeroProps) {
  const { brand } = usePageContext();

  const title = headline || `Welcome to ${brand.name}`;
  const desc =
    subheading ||
    `Experience premium quality, personalized local service, and verified store locations across the region.`;

  return (
    <section id={id || 'home'} className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{badge}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {title}
        </h1>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
          {desc}
        </p>
      </div>
    </section>
  );
}

export interface BrandFooterProps {
  id?: string;
  copyrightText?: string;
  showSocialLinks?: boolean;
}

export function BrandFooter({
  copyrightText,
  showSocialLinks = true,
}: BrandFooterProps) {
  const { brand, store, navigation } = usePageContext();
  const currentYear = new Date().getFullYear();
  const copy = copyrightText || `© ${currentYear} ${brand.name}. All rights reserved.`;

  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-8">
          <div>
            <div className="text-white font-bold text-lg tracking-tight">
              {brand.name}
            </div>
            {store && (
              <p className="text-xs text-slate-400 mt-1">
                {store.addressLine1 ? `${store.addressLine1}, ` : ''}{store.city}
              </p>
            )}
          </div>
          {navigation?.footerItems && navigation.footerItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-5 text-xs">
              {navigation.footerItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.target}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
          {showSocialLinks && store?.phone && (
            <div className="flex items-center gap-3">
              <a
                href={`tel:${store.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Store</span>
              </a>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>{copy}</div>
          <div className="text-[11px]">
            Powered by LocalBi Omnichannel Engine
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SITE NAVIGATION (Full responsive header with drawer)
// ─────────────────────────────────────────────────────────────────────────────

export interface SiteNavigationProps {
  id?: string;
  sticky?: boolean;
  showSearch?: boolean;
  showPhone?: boolean;
  ctaButtonText?: string;
  ctaButtonUrl?: string;
}

export function SiteNavigation({
  sticky = true,
  showSearch = true,
  showPhone = true,
  ctaButtonText = 'Contact Store',
  ctaButtonUrl = '/contact',
}: SiteNavigationProps) {
  const { brand, store, navigation } = usePageContext();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const links = navigation?.headerItems?.length
    ? navigation.headerItems
    : [
        { id: '1', label: 'Overview', target: '/' },
        { id: '2', label: 'Products', target: '/products' },
        { id: '3', label: 'Locations', target: '/locations' },
      ];

  return (
    <header className={`${sticky ? 'sticky top-0 z-40' : 'relative'} bg-white/95 backdrop-blur-md border-b border-slate-200/80`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
            {brand.name.charAt(0)}
          </div>
          <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight truncate max-w-[180px]">
            {brand.name}
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
          {links.map((l) => (
            <Link key={l.id} href={l.target} className="hover:text-indigo-600 transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {showPhone && store?.phone && (
            <a
              href={`tel:${store.phone}`}
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600"
            >
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              <span>{store.phone}</span>
            </a>
          )}

          {ctaButtonText && (
            <Link
              href={ctaButtonUrl}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              {ctaButtonText}
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Navigation Menu"
          >
            <div className="w-4 h-3 flex flex-col justify-between">
              <span className="w-full h-0.5 bg-current" />
              <span className="w-full h-0.5 bg-current" />
              <span className="w-full h-0.5 bg-current" />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          {links.map((l) => (
            <Link
              key={l.id}
              href={l.target}
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-semibold text-slate-700 hover:text-indigo-600"
            >
              {l.label}
            </Link>
          ))}
          {store?.phone && (
            <a
              href={`tel:${store.phone}`}
              className="block pt-2 text-xs font-bold text-indigo-600"
            >
              📞 Call: {store.phone}
            </a>
          )}
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ANNOUNCEMENT BAR
// ─────────────────────────────────────────────────────────────────────────────

export interface AnnouncementBarProps {
  id?: string;
  badge?: string;
  badgeText?: string;
  message?: string;
  linkText?: string;
  linkUrl?: string;
  bgColor?: 'indigo' | 'slate' | 'amber';
}

export function AnnouncementBar({
  badge,
  badgeText,
  message = 'Same-day delivery now available across all verified neighborhood store locations!',
  linkText = 'Shop Now',
  linkUrl = '/products',
  bgColor = 'indigo',
}: AnnouncementBarProps) {
  const displayBadge = badge || badgeText || 'NEW';
  const bg =
    bgColor === 'slate'
      ? 'bg-slate-900 text-white'
      : bgColor === 'amber'
      ? 'bg-amber-500 text-slate-950 font-medium'
      : 'bg-indigo-600 text-white';

  return (
    <div className={`w-full py-2 px-4 text-xs ${bg}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5 text-center flex-wrap">
        {displayBadge && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20">
            {displayBadge}
          </span>
        )}
        <span>{message}</span>
        {linkText && (
          <Link href={linkUrl} className="underline font-bold hover:opacity-80 transition-opacity">
            {linkText} →
          </Link>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. BREADCRUMBS
// ─────────────────────────────────────────────────────────────────────────────

export interface BreadcrumbsProps {
  id?: string;
  currentPageTitle?: string;
}

export function Breadcrumbs({ currentPageTitle = '' }: BreadcrumbsProps) {
  const { pageType } = usePageContext();
  const title = currentPageTitle || (pageType === 'HOME' ? 'Home' : pageType);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 text-xs text-slate-500">
      <Link href="/" className="hover:text-indigo-600">Home</Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="font-semibold text-slate-900">{title}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONTACT BUTTON
// ─────────────────────────────────────────────────────────────────────────────

export interface ContactButtonProps {
  id?: string;
  label?: string;
  url?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

export function ContactButton({
  label = 'Get in Touch',
  url = '/contact',
  variant = 'primary',
  size = 'medium',
}: ContactButtonProps) {
  const sizeClass =
    size === 'small' ? 'px-3 py-1.5 text-xs' : size === 'large' ? 'px-7 py-3.5 text-base' : 'px-5 py-2.5 text-sm';

  const variantClass =
    variant === 'secondary'
      ? 'bg-slate-900 text-white hover:bg-slate-800'
      : variant === 'outline'
      ? 'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50'
      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs';

  return (
    <div className="inline-block">
      <Link
        href={url}
        className={`inline-flex items-center justify-center font-bold rounded-xl transition-all ${sizeClass} ${variantClass}`}
      >
        <span>{label}</span>
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. CALL BUTTON
// ─────────────────────────────────────────────────────────────────────────────

export interface CallButtonProps {
  id?: string;
  label?: string;
  phoneNumber?: string;
}

export function CallButton({
  label = 'Call Storefront Now',
  phoneNumber = '',
}: CallButtonProps) {
  const { store } = usePageContext();
  const phone = phoneNumber || store?.phone || '+919840012345';

  return (
    <div className="inline-block">
      <a
        href={`tel:${phone}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
      >
        <Phone className="w-4 h-4" />
        <span>{label}</span>
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. SEARCH BAR
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchBarProps {
  id?: string;
  placeholder?: string;
  buttonText?: string;
}

export function SearchBar({
  placeholder = 'Search products, locations, or offerings...',
  buttonText = 'Search',
}: SearchBarProps) {
  return (
    <form className="max-w-xl mx-auto w-full flex items-center gap-2 my-4">
      <input
        type="search"
        placeholder={placeholder}
        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
      />
      <button
        type="submit"
        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
      >
        {buttonText}
      </button>
    </form>
  );
}

