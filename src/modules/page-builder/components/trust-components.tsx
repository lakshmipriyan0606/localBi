'use client';

import { useState } from 'react';
import { usePageContext } from '../page-context-react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';

export interface ReviewSummaryProps {
  id?: string;
  headline?: string;
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
export const TrustSignals = FAQSection;

