'use client';

import { usePageContext } from '../page-context-react';
import {
  MapPin,
  Phone,
  Clock,
  Navigation,
  Star,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export interface StoreHeroProps {
  id?: string;
  badgeText?: string;
  headline?: string;
  subheading?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
}

export function StoreHero({
  badgeText = 'Verified Official Storefront',
  headline,
  subheading,
  primaryCtaText = 'Get Directions',
  secondaryCtaText = 'Call Store',
}: StoreHeroProps) {
  const { store, brand } = usePageContext();

  const title = headline || (store ? `${store.name}` : brand.name);
  const desc =
    subheading ||
    (store?.addressLine1
      ? `Located at ${store.addressLine1}, ${store.city || ''}. Visit us today for in-person service and authentic local offerings.`
      : `Visit our verified local storefront for personalized assistance and authentic catalog selections.`);

  const mapsUrl =
    store?.googleMapsUrl ||
    (store?.latitude && store?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${store?.name || brand.name} ${store?.city || ''}`
        )}`);

  return (
    <section className="relative rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-sm text-slate-900 space-y-6">
      <div className="max-w-3xl space-y-4">
        {/* Rating or Verified Badge */}
        {store?.rating && store.reviewCount && store.rating > 0 ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>
              {store.rating.toFixed(1)} Stars · {store.reviewCount} Google Patrons
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{badgeText}</span>
          </div>
        )}

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
          {title}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          {desc}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white rounded-xl shadow-sm hover:opacity-95 transition-opacity"
            style={{
              backgroundColor: 'var(--brand-primary, #4F46E5)',
              borderRadius: 'var(--brand-button-radius, 0.5rem)',
            }}
          >
            <Navigation className="w-4 h-4" />
            <span>{primaryCtaText}</span>
          </a>

          {store?.phone && (
            <a
              href={`tel:${store.phone}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              style={{
                borderRadius: 'var(--brand-button-radius, 0.5rem)',
              }}
            >
              <Phone className="w-4 h-4 text-slate-500" />
              <span>{secondaryCtaText}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export interface StoreInfoProps {
  id?: string;
  headline?: string;
  subheading?: string;
  showHours?: boolean;
  showAddress?: boolean;
}

export function StoreInfo({
  headline = 'Store Information',
  subheading = 'Visit us in person or get in touch directly.',
  showHours = true,
  showAddress = true,
}: StoreInfoProps) {
  const { store } = usePageContext();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {headline}
        </h2>
        {subheading && (
          <p className="text-xs sm:text-sm text-slate-500">{subheading}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showAddress && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
              <MapPin className="w-4 h-4" />
              <span>Location & Address</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {store?.addressLine1 ? `${store.addressLine1}, ` : ''}
              {store?.city ? `${store.city}, ` : ''}
              {store?.state ? `${store.state} ` : ''}
              {store?.postalCode || ''}
            </p>
            {store?.phone && (
              <p className="text-xs text-slate-500 pt-1">
                Phone: <a href={`tel:${store.phone}`} className="text-indigo-600 font-medium">{store.phone}</a>
              </p>
            )}
          </div>
        )}

        {showHours && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
              <Clock className="w-4 h-4" />
              <span>Operating Hours</span>
            </div>
            <div className="text-sm text-slate-700 space-y-1">
              <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
                <span className="font-medium">Monday – Saturday</span>
                <span className="text-slate-500">10:00 AM – 9:30 PM</span>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <span className="font-medium">Sunday</span>
                <span className="text-slate-500">11:00 AM – 8:00 PM</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export interface StoreMapProps {
  id?: string;
  zoomLevel?: number;
  showDirectionsButton?: boolean;
}

export function StoreMap({
  showDirectionsButton = true,
}: StoreMapProps) {
  const { store, brand } = usePageContext();

  const mapsUrl =
    store?.googleMapsUrl ||
    (store?.latitude && store?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${store?.name || brand.name} ${store?.city || ''}`
        )}`);

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
      <div className="p-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
          <MapPin className="w-4 h-4 text-indigo-600" />
          <span>Interactive Location & Directions</span>
        </div>
        {showDirectionsButton && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="p-8 text-center bg-slate-50 text-slate-500 text-xs space-y-3">
        <p className="font-medium text-slate-700">
          {store?.name || brand.name} — {store?.city || 'Local Store'}
        </p>
        <p>
          {store?.addressLine1 ? `${store.addressLine1}, ` : ''}{store?.city || ''}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium shadow-2xs text-xs hover:bg-indigo-700 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Navigate with Google Maps</span>
        </a>
      </div>
    </div>
  );
}

export interface NearbyStoresProps {
  id?: string;
  headline?: string;
}

export function NearbyStores({
  headline = 'Other Locations in this City',
}: NearbyStoresProps) {
  const { nearbyStores } = usePageContext();

  if (!nearbyStores || nearbyStores.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">{headline}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {nearbyStores.map((loc) => (
          <div
            key={loc.id}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors space-y-2 shadow-2xs"
          >
            <div className="font-semibold text-sm text-slate-900">
              {loc.name}
            </div>
            <p className="text-xs text-slate-500">
              {loc.addressLine1 ? `${loc.addressLine1}, ` : ''}{loc.city}
            </p>
            {loc.phone && (
              <a
                href={`tel:${loc.phone}`}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 font-medium pt-1"
              >
                <Phone className="w-3 h-3" />
                <span>{loc.phone}</span>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface OpeningHoursProps {
  id?: string;
  headline?: string;
  showTodayHighlight?: boolean;
}

export function OpeningHours({
  headline = 'Operating Hours',
  showTodayHighlight = true,
}: OpeningHoursProps) {
  const { store } = usePageContext();
  const currentDay = new Date().getDay(); // 0 is Sunday

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
      <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
        <Clock className="w-4 h-4" />
        <span>{headline}</span>
      </div>
      <div className="text-sm text-slate-700 space-y-1">
        <div className={`flex justify-between py-1 border-b border-slate-100 text-xs ${showTodayHighlight && currentDay !== 0 ? 'font-bold text-amber-700' : ''}`}>
          <span>Monday – Saturday</span>
          <span>10:00 AM – 9:30 PM</span>
        </div>
        <div className={`flex justify-between py-1 text-xs ${showTodayHighlight && currentDay === 0 ? 'font-bold text-amber-700' : ''}`}>
          <span>Sunday</span>
          <span>11:00 AM – 8:00 PM</span>
        </div>
      </div>
    </div>
  );
}
