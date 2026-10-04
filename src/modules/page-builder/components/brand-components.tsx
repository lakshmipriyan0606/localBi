'use client';

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
  showCta = true,
  ctaLabel = 'Contact Us',
  link1Label = 'Overview',
  link1Url = '/',
  link2Label = 'Products',
  link2Url = '/products',
}: BrandHeaderProps) {
  const { brand, store, navigation } = usePageContext();
  const headerLinks = navigation?.headerItems?.length
    ? navigation.headerItems
    : [
        { id: '1', label: link1Label, target: link1Url, openInNewTab: false },
        { id: '2', label: link2Label, target: link2Url, openInNewTab: false },
      ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
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
              target={item.openInNewTab ? '_blank' : undefined}
              rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
              className="hover:text-slate-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {showCta && store?.phone && (
          <a
            href={`tel:${store.phone}`}
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
    </header>
  );
}

export interface AnnouncementBarProps {
  id?: string;
  badgeText?: string;
  message?: string;
}

export function AnnouncementBar({
  badgeText = 'Special Update',
  message = 'Official verified multi-location storefront.',
}: AnnouncementBarProps) {
  return (
    <div
      className="text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 text-center"
      style={{ backgroundColor: 'var(--brand-secondary, #0F172A)' }}
    >
      <span
        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-900"
        style={{ backgroundColor: 'var(--brand-accent, #F59E0B)' }}
      >
        {badgeText}
      </span>
      <span>{message}</span>
    </div>
  );
}

export interface BrandHeroProps {
  id?: string;
  badge?: string;
  headline?: string;
  subheading?: string;
}

export function BrandHero({
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
    <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
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
