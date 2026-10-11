'use client';

import { useState } from 'react';
import { usePageContext } from '../page-context-react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';

export interface ReviewSummaryProps {
  id?: string;
  headline?: string;
  showGoogleBadge?: boolean;
}

export function ReviewSummary({
  headline = 'Customer Trust & Verified Feedback',
}: ReviewSummaryProps) {
  const { store } = usePageContext();

  if (!store?.rating || !store.reviewCount || store.rating === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{headline}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Verified local feedback from Google Business Profile.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-3xl font-extrabold text-slate-900 leading-none">
            {store.rating.toFixed(1)}
          </div>
          <div>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(store.rating || 0)
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {store.reviewCount.toLocaleString()} Verified Reviews
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface ReviewListProps {
  id?: string;
  headline?: string;
  limit?: number;
}

export function ReviewList({
  headline = 'What Local Patrons Say',
  limit = 4,
}: ReviewListProps) {
  const { reviews } = usePageContext();

  const displayReviews = reviews.slice(0, limit);

  if (displayReviews.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
        {headline}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayReviews.map((r) => (
          <div
            key={r.id}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm text-slate-900">{r.authorName}</div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < r.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {r.comment && (
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "{r.comment}"
              </p>
            )}

            {r.createTime && (
              <div className="text-[10px] text-slate-400 pt-1">
                {new Date(r.createTime).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface FAQSectionProps {
  id?: string;
  headline?: string;
  subheading?: string;
}

export function FAQSection({
  headline = 'Frequently Asked Questions',
  subheading = 'Helpful details about orders, visits, and store policies.',
}: FAQSectionProps) {
  const { faqs, store, brand } = usePageContext();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const displayFaqs =
    faqs.length > 0
      ? faqs
      : [
          {
            question: `Where is the ${brand.name} storefront located?`,
            answer: store?.addressLine1
              ? `We are located at ${store.addressLine1}, ${store.city || ''}. Easily accessible with local parking.`
              : `Our store locations are listed in the store directory with complete addresses and directions.`,
          },
          {
            question: 'Can I place orders directly on WhatsApp or by phone?',
            answer: store?.phone
              ? `Yes! You can call us directly at ${store.phone} for instant inquiries and order placement.`
              : 'Yes, direct customer assistance is available during regular operating hours.',
          },
          {
            question: 'Are all catalog products authentic?',
            answer: `Every product offered by ${brand.name} is 100% authentic, certified, and quality-tested.`,
          },
        ];

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

      <div className="space-y-3">
        {displayFaqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-sm text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <span>{faq.question}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ReviewCarousel = ReviewList;

export interface TrustSignalsProps {
  id?: string;
  signal1?: string;
  signal2?: string;
  signal3?: string;
}

export function TrustSignals({
  signal1 = '100% Authentic Quality Guaranteed',
  signal2 = 'Verified Storefront Operations',
  signal3 = 'Personalized In-Store & WhatsApp Assistance',
}: TrustSignalsProps) {
  return (
    <div className="py-6 px-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-wrap items-center justify-around gap-4 text-xs font-semibold text-slate-800 my-4">
      <div className="flex items-center gap-2 text-indigo-700">
        <span className="w-2 h-2 rounded-full bg-indigo-600" />
        <span>{signal1}</span>
      </div>
      <div className="flex items-center gap-2 text-indigo-700">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>{signal2}</span>
      </div>
      <div className="flex items-center gap-2 text-indigo-700">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span>{signal3}</span>
      </div>
    </div>
  );
}

export const TrustBadges = TrustSignals;
export type TrustBadgesProps = TrustSignalsProps;

// ─────────────────────────────────────────────────────────────────────────────
// 4. STATISTICS / COUNTER (Milestone Numbers)
// ─────────────────────────────────────────────────────────────────────────────

export interface StatisticsCounterProps {
  id?: string;
  stat1Value?: string;
  stat1Label?: string;
  stat2Value?: string;
  stat2Label?: string;
  stat3Value?: string;
  stat3Label?: string;
  stat4Value?: string;
  stat4Label?: string;
}

export function StatisticsCounter({
  stat1Value = '15k+',
  stat1Label = 'Happy Local Customers',
  stat2Value = '100%',
  stat2Label = 'Authentic Proven Quality',
  stat3Value = '4.9/5',
  stat3Label = 'Verified Review Rating',
  stat4Value = '12+',
  stat4Label = 'Physical Storefronts',
}: StatisticsCounterProps) {
  const stats = [
    { val: stat1Value, lbl: stat1Label },
    { val: stat2Value, lbl: stat2Label },
    { val: stat3Value, lbl: stat3Label },
    { val: stat4Value, lbl: stat4Label },
  ];

  return (
    <div className="py-10 px-4 max-w-6xl mx-auto w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 rounded-3xl bg-slate-50 border border-slate-200/80 text-center">
        {stats.map((s, idx) => (
          <div key={idx} className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-indigo-600 tracking-tight">{s.val}</div>
            <div className="text-xs font-semibold text-slate-600">{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PARTNER LOGOS
// ─────────────────────────────────────────────────────────────────────────────

export interface PartnerLogosProps {
  id?: string;
  headline?: string;
  logo1?: string;
  logo2?: string;
  logo3?: string;
  logo4?: string;
}

export function PartnerLogos({
  headline = 'Trusted By Leading Brands & Local Enterprises',
  logo1 = 'Global Retail Group',
  logo2 = 'Verified Merchant Hub',
  logo3 = 'Organic Standards Board',
  logo4 = 'Metropolitan Chambers',
}: PartnerLogosProps) {
  const logos = [logo1, logo2, logo3, logo4];

  return (
    <div className="py-8 max-w-5xl mx-auto text-center space-y-4 px-4">
      {headline && <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{headline}</div>}
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all">
        {logos.map((l, i) => (
          <div key={i} className="text-sm font-black text-slate-800 tracking-tight border border-slate-200 px-4 py-2 rounded-xl bg-white shadow-2xs">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. TESTIMONIAL QUOTE (Prominent Blockquote)
// ─────────────────────────────────────────────────────────────────────────────

export interface TestimonialQuoteProps {
  id?: string;
  quote?: string;
  authorName?: string;
  authorRole?: string;
  authorAvatar?: string;
}

export function TestimonialQuote({
  quote = 'The quality and direct customer attention from this storefront exceeded all my expectations. Ordering was quick, and product authenticity is top tier.',
  authorName = 'Dr. Rajesh Sundaram',
  authorRole = 'Verified Local Customer',
  authorAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
}: TestimonialQuoteProps) {
  return (
    <div className="py-10 max-w-3xl mx-auto px-4 text-center space-y-4">
      <div className="text-3xl font-serif text-indigo-400">“</div>
      <blockquote className="text-base sm:text-xl font-medium text-slate-800 italic leading-relaxed">
        {quote}
      </blockquote>
      <div className="flex items-center justify-center gap-3 pt-2">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shadow-2xs">
          <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
        </div>
        <div className="text-left">
          <div className="font-bold text-xs text-slate-900">{authorName}</div>
          <div className="text-[11px] text-slate-500">{authorRole}</div>
        </div>
      </div>
    </div>
  );
}


