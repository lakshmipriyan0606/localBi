import type { ReactNode } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import {
  UtensilsCrossed,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Star,
  ExternalLink,
} from 'lucide-react';
import { MicrositeService } from '@/modules/microsites/microsite-service';
import { PuckService } from '@/modules/microsites/puck-service';

export default async function MicrositeLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const [site, puckData] = await Promise.all([
    MicrositeService.getMicrositeBySubdomain(subdomain),
    PuckService.getPuckData(subdomain),
  ]);

  if (!site) {
    notFound();
  }

  const hasCustomLayout = Boolean(puckData?.content && puckData.content.length > 0);
  const hasCustomHeader = Boolean(
    puckData?.content?.some((c: any) => c.type === 'Header' || c.type === 'HeroBanner')
  );
  const hasCustomFooter = Boolean(
    puckData?.content?.some((c: any) => c.type === 'Footer')
  );

  const navLinks = [
    { label: 'Overview', href: `/site/${subdomain}` },
    { label: 'Menu & Specials', href: `/site/${subdomain}/menu` },
    { label: 'Our Story', href: `/site/${subdomain}/about` },
    { label: 'Location & Hours', href: `/site/${subdomain}/contact` },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Banner Notice (Only if not using custom header/announcement) */}
      {!hasCustomHeader && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold text-center flex items-center justify-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950" />
          </span>
          <span>Open for Orders · Operating Hours: {site.hours}</span>
        </div>
      )}

      {/* Navigation Header (Only if canvas doesn't already have one) */}
      {!hasCustomHeader && (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Logo / Brand Name */}
            <Link href={`/site/${subdomain}`} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-base tracking-tight text-slate-900 leading-tight">
                  {site.brandName}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-600" />
                  {site.city}
                </div>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              {site.phone && (
                <a
                  href={`tel:${site.phone}`}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  Call Store
                </a>
              )}

              {site.whatsapp && (
                <a
                  href={`https://wa.me/${(site.whatsapp || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${site.brandName}, I would like to place an order / inquire.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Mobile Sub-Navigation Bar */}
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-2 flex items-center justify-between overflow-x-auto gap-4 text-xs font-medium text-slate-600">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap hover:text-indigo-600 py-1"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </header>
      )}

      {/* Main Page Content */}
      <main className={hasCustomLayout ? 'flex-1 w-full' : 'flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8'}>
        {children}
      </main>

      {/* Store Footer (Only if canvas doesn't already have one) */}
      {!hasCustomFooter && (
        <footer className="border-t border-slate-200 bg-white mt-12 py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                <UtensilsCrossed className="w-5 h-5 text-indigo-600" />
                {site.brandName}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                {site.tagline}
              </p>
              {site.googleRating > 0 && site.reviewCount > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  {site.googleRating} Google Rating ({site.reviewCount.toLocaleString()} Verified Reviews)
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Verified Official Storefront
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
                Location & Timings
              </h4>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>{site.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{site.hours}</span>
              </div>
              <div className="pt-2">
                <a
                  href={site.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold"
                >
                  Get Directions on Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
                Fast Contact
              </h4>
              {site.phone && <p>Direct phone: {site.phone}</p>}
              {site.whatsapp && <p>WhatsApp orders: {site.whatsapp}</p>}
              {!site.phone && !site.whatsapp && <p>Direct inquiries: Open Daily</p>}
              <div className="pt-2">
                <span className="text-[11px] text-slate-400">
                  Official Multi-Page Storefront hosted on LocalBi Subdomain Engine.
                </span>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Real Cookieless Identity Tracking Pixel */}
      <Script
        id="localbi-visitor-pixel"
        src="/localbi-pixel.js"
        data-tenant={subdomain}
        strategy="afterInteractive"
      />
    </div>
  );
}
