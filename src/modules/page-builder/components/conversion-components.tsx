'use client';

import { useState } from 'react';
import { usePageContext } from '../page-context-react';
import { Phone, MessageCircle, Navigation, CheckCircle2 } from 'lucide-react';
import { LocalBiTracker } from '@/modules/analytics/localbi-tracker';

export interface CallCTAProps {
  id?: string;
  headline?: string;
  subheading?: string;
  buttonLabel?: string;
}

export function CallCTA({
  headline = 'Speak with Our Store Team',
  subheading = 'Get immediate answers regarding product availability, store hours, and orders.',
  buttonLabel = 'Call Now',
}: CallCTAProps) {
  const { store, brand, webSurface, pageType } = usePageContext();
  const phone = store?.phone;

  if (!phone) return null;

  return (
    <div
      className="rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm"
      style={{ backgroundColor: 'var(--brand-secondary, #0F172A)' }}
    >
      <div className="space-y-1.5 max-w-xl">
        <h3 className="text-xl font-bold tracking-tight">{headline}</h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {subheading}
        </p>
      </div>

      <a
        href={`tel:${phone}`}
        onClick={() => {
          LocalBiTracker.track('click_call', {
            brand: brand.name,
            brandId: brand.id,
            surface: webSurface.type,
            webSurfaceId: webSurface.id,
            pageType,
            storeId: store?.id,
            storeName: store?.name,
          });
        }}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-xs shadow-md transition-opacity hover:opacity-95 whitespace-nowrap shrink-0 text-white"
        style={{
          backgroundColor: 'var(--brand-primary, #4F46E5)',
          borderRadius: 'var(--brand-button-radius, 0.5rem)',
        }}
      >
        <Phone className="w-4 h-4" />
        <span>{buttonLabel} ({phone})</span>
      </a>
    </div>
  );
}

export interface WhatsAppCTAProps {
  id?: string;
  headline?: string;
  subheading?: string;
  buttonLabel?: string;
  prefilledMessage?: string;
}

export function WhatsAppCTA({
  headline = 'Chat Directly on WhatsApp',
  subheading = 'Quick local service, custom inquiries, and effortless shopping assistance.',
  buttonLabel = 'Open WhatsApp Chat',
  prefilledMessage,
}: WhatsAppCTAProps) {
  const { store, brand, webSurface, pageType, product } = usePageContext();

  const phone = store?.phone || '+919876543210';
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  const msg =
    prefilledMessage ||
    (product
      ? `Hi ${brand.name}, I am interested in ${product.name} at your ${store?.name || 'store'}.`
      : `Hi ${brand.name}, I would like to inquire about your store offerings.`);

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xs">
      <div className="space-y-1.5 max-w-xl">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          <span>Instant Messaging</span>
        </div>
        <h3 className="text-xl font-bold tracking-tight text-slate-900">{headline}</h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {subheading}
        </p>
      </div>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          LocalBiTracker.track('whatsapp_click', {
            brand: brand.name,
            brandId: brand.id,
            surface: webSurface.type,
            webSurfaceId: webSurface.id,
            pageType,
            storeId: store?.id,
            storeName: store?.name,
            productId: product?.id,
            productName: product?.name,
          });
        }}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-sm hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
        style={{
          borderRadius: 'var(--brand-button-radius, 0.5rem)',
        }}
      >
        <MessageCircle className="w-4 h-4" />
        <span>{buttonLabel}</span>
      </a>
    </div>
  );
}

export interface DirectionsCTAProps {
  id?: string;
  headline?: string;
  buttonLabel?: string;
}

export function DirectionsCTA({
  headline = 'Need In-Person Navigation?',
  buttonLabel = 'Get Directions on Google Maps',
}: DirectionsCTAProps) {
  const { store, brand, webSurface, pageType } = usePageContext();

  const mapsUrl =
    store?.googleMapsUrl ||
    (store?.latitude && store?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${store?.name || brand.name} ${store?.city || ''}`
        )}`);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
      <div>
        <h4 className="font-bold text-base text-slate-900">{headline}</h4>
        {store?.addressLine1 && (
          <p className="text-xs text-slate-500 mt-0.5">
            {store.addressLine1}, {store.city}
          </p>
        )}
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          LocalBiTracker.track('directions_click', {
            brand: brand.name,
            brandId: brand.id,
            surface: webSurface.type,
            webSurfaceId: webSurface.id,
            pageType,
            storeId: store?.id,
            storeName: store?.name,
          });
        }}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors whitespace-nowrap"
      >
        <Navigation className="w-3.5 h-3.5 text-indigo-400" />
        <span>{buttonLabel}</span>
      </a>
    </div>
  );
}

export interface LeadFormProps {
  id?: string;
  headline?: string;
  subheading?: string;
  submitLabel?: string;
}

export function LeadForm({
  headline = 'Get in Touch with our Store Team',
  subheading = 'Leave your details and a store representative will connect with you shortly.',
  submitLabel = 'Submit Inquiry',
}: LeadFormProps) {
  const { store, brand, webSurface, pageType, product } = usePageContext();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Stable client idempotency key to prevent accidental duplicate lead creation
  const [idempotencyKey] = useState(() => {
    return 'ik_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || submitting) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);

      // Parse UTM parameters from URL if in browser
      const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const utmSource = searchParams.get('utm_source') || undefined;
      const utmMedium = searchParams.get('utm_medium') || undefined;
      const utmCampaign = searchParams.get('utm_campaign') || undefined;
      const utmContent = searchParams.get('utm_content') || undefined;
      const utmTerm = searchParams.get('utm_term') || undefined;
      const gclid = searchParams.get('gclid') || undefined;

      const visitorId = LocalBiTracker.getVisitorId();
      const sessionId = LocalBiTracker.getSessionId();

      const response = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          message: notes,
          idempotencyKey,
          brandId: brand.id,
          webSurfaceId: webSurface.id,
          storeId: store?.id || undefined,
          productId: product?.id || undefined,
          visitorId,
          sessionId,
          currentPath: typeof window !== 'undefined' ? window.location.pathname : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          gclid,
          _hp_company: honeypot, // Honeypot spam protection
        }),
      });

      const resData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(resData?.error || 'Unable to submit inquiry. Please try again.');
      }

      setSubmitted(true);

      // Strictly zero PII sent to GA4
      LocalBiTracker.track('lead_form_submit', {
        brand: brand.name,
        brandId: brand.id,
        surface: webSurface.type,
        webSurfaceId: webSurface.id,
        pageType,
        storeId: store?.id,
        storeName: store?.name,
        productId: product?.id,
        productName: product?.name,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-2xs max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {headline}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500">{subheading}</p>
      </div>

      {submitted ? (
        <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h4 className="font-bold text-sm text-emerald-900">Thank you!</h4>
          <p className="text-xs text-emerald-700">
            Your inquiry has been received. Our team will contact you shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Hidden honeypot field to catch spam bots */}
          <input
            type="text"
            name="_hp_company"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              required
              disabled={submitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              required
              disabled={submitting}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message or Requested Items
            </label>
            <textarea
              rows={3}
              disabled={submitting}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell us what you are looking for..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl font-semibold text-xs text-white shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'var(--brand-primary, #4F46E5)',
              borderRadius: 'var(--brand-button-radius, 0.5rem)',
            }}
          >
            {submitting ? 'Submitting Inquiry...' : submitLabel}
          </button>
        </form>
      )}
    </div>
  );
}
