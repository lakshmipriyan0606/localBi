'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePageContext } from '../page-context-react';
import {
  MapPin,
  ChevronRight,
  ArrowUp,
  MessageCircle,
  Phone,
  Mail,
  ShieldCheck,
  Globe,
  ExternalLink,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 1. SEO LANDING SECTION (Local Authority & City Targeting)
// ─────────────────────────────────────────────────────────────────────────────

export interface SEOLandingSectionProps {
  id?: string;
  badge?: string;
  headline?: string;
  content?: string;
  showLocationKeywords?: boolean;
}

export function SEOLandingSection({
  badge = 'Local SEO Authority',
  headline = '',
  content = '',
  showLocationKeywords = true,
}: SEOLandingSectionProps) {
  const { brand, store } = usePageContext();

  const title =
    headline ||
    (store?.city
      ? `Premium Offerings & Storefront in ${store.city}`
      : `${brand?.name || 'Local'} Official Storefront & Search Authority`);

  const body =
    content ||
    `Welcome to the official online destination for ${brand?.name || 'our business'}${
      store?.city ? ` in ${store.city}, ${store.state || ''}` : ''
    }. We are committed to authentic quality, verified physical presence, and personalized customer care.`;

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-4">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>{badge}</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
        {title}
      </h2>

      <p className="text-sm text-slate-600 leading-relaxed">
        {body}
      </p>

      {showLocationKeywords && store?.city && (
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Locality Coverage:</span>
          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium">
            {store.city}
          </span>
          {store.state && (
            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium">
              {store.state}
            </span>
          )}
          {store.postalCode && (
            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium">
              PIN: {store.postalCode}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BREADCRUMB SECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface BreadcrumbSectionProps {
  id?: string;
  currentPageTitle?: string;
  parentLabel?: string;
  parentUrl?: string;
}

export function BreadcrumbSection({
  currentPageTitle = '',
  parentLabel = 'Storefront',
  parentUrl = '/',
}: BreadcrumbSectionProps) {
  const { pageType, path } = usePageContext();

  const label = currentPageTitle || (pageType === 'HOME' ? 'Home' : pageType);

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
      <ol className="flex items-center gap-2 text-xs text-slate-500">
        <li>
          <Link href="/" className="hover:text-indigo-600 font-medium transition-colors">
            Home
          </Link>
        </li>
        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
        {pageType !== 'HOME' && (
          <>
            <li>
              <Link href={parentUrl} className="hover:text-indigo-600 font-medium transition-colors">
                {parentLabel}
              </Link>
            </li>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          </>
        )}
        <li className="font-semibold text-slate-900 truncate" aria-current="page">
          {label}
        </li>
      </ol>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MULTI-COLUMN FOOTER
// ─────────────────────────────────────────────────────────────────────────────

export interface MultiColumnFooterProps {
  id?: string;
  aboutText?: string;
  showStoreAddress?: boolean;
  column2Title?: string;
  column3Title?: string;
  copyrightText?: string;
}

export function MultiColumnFooter({
  aboutText = '',
  showStoreAddress = true,
  column2Title = 'Quick Links',
  column3Title = 'Store Hours & Contact',
  copyrightText = '',
}: MultiColumnFooterProps) {
  const { brand, store, navigation } = usePageContext();

  const currentYear = new Date().getFullYear();
  const desc =
    aboutText ||
    `${brand?.name || 'Our brand'} operates verified store locations connected to our digital local presence.`;

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="font-black text-lg text-white tracking-tight">{brand?.name || 'Local Store'}</div>
            <p className="text-slate-400 leading-relaxed">{desc}</p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">{column2Title}</div>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  Product Catalog
                </Link>
              </li>
              <li>
                <Link href="/locations" className="hover:text-white transition-colors">
                  All Locations
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact & Hours */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">{column3Title}</div>
            <div className="space-y-2 text-slate-400">
              {store?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{store.phone}</span>
                </div>
              )}
              {store?.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{store.addressLine1 || store.city}</span>
                </div>
              )}
              <div>Mon - Sat: 9:30 AM - 9:00 PM</div>
            </div>
          </div>

          {/* Col 4: Trust & Verification */}
          <div className="space-y-3">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Security & Status</div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SSL Encrypted</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Verified LocalBi Surface with live sync.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <div>
            {copyrightText || `© ${currentYear} ${brand?.name || 'LocalBi'}. All rights reserved.`}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-slate-300">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-slate-300">
              Privacy Notice
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FLOATING WHATSAPP BUTTON
// ─────────────────────────────────────────────────────────────────────────────

export interface FloatingWhatsAppProps {
  id?: string;
  phoneNumber?: string;
  message?: string;
  tooltipText?: string;
}

export function FloatingWhatsApp({
  phoneNumber = '',
  message = 'Hello! I am inquiring about your storefront products.',
  tooltipText = 'Chat with us',
}: FloatingWhatsAppProps) {
  const { store } = usePageContext();
  const phone = phoneNumber || store?.phone || '+919840012345';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group">
      <span className="hidden group-hover:inline-block px-3 py-1 text-xs font-semibold bg-slate-900 text-white rounded-lg shadow-lg animate-in fade-in">
        {tooltipText}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
      >
        <MessageCircle className="w-6 h-6 fill-current" />
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BACK TO TOP BUTTON
// ─────────────────────────────────────────────────────────────────────────────

export interface BackToTopProps {
  id?: string;
  label?: string;
}

export function BackToTop({ label = 'Back to top' }: BackToTopProps) {
  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-6">
      <button
        type="button"
        onClick={scrollToTop}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
      >
        <ArrowUp className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>
    </div>
  );
}
