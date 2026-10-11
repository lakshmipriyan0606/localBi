'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePageContext } from '../page-context-react';
import {
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Send,
  Eye,
  Store,
  Clock,
  Tag,
  Star,
  Mail,
  Copy,
  Check,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 1. HERO BANNER
// ─────────────────────────────────────────────────────────────────────────────

export interface HeroBannerProps {
  id?: string;
  badgeText?: string;
  headline?: string;
  subheading?: string;
  primaryCtaText?: string;
  primaryCtaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  showStatChips?: boolean;
  statChip1?: string;
  statChip2?: string;
  backgroundImage?: string;
  overlayGradient?: 'indigo' | 'dark' | 'emerald' | 'amber';
}

export function HeroBanner({
  id = 'home',
  badgeText = 'Official Storefront',
  headline = '',
  subheading = '',
  primaryCtaText = 'Explore Products',
  primaryCtaUrl = '/products',
  secondaryCtaText = 'Store Locations',
  secondaryCtaUrl = '/locations',
  showStatChips = true,
  statChip1 = '⚡ Fast Local Delivery',
  statChip2 = '⭐ 4.9 Verified Reviews',
  backgroundImage = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
  overlayGradient = 'indigo',
}: HeroBannerProps) {
  const { brand, store } = usePageContext();

  const title = headline || brand?.name || 'Local Storefront';
  const subtitle =
    subheading ||
    `Authentic, fresh, search-optimized storefront connected directly to ${store?.name || 'our verified store locations'}.`;

  const gradientClass =
    overlayGradient === 'dark'
      ? 'from-slate-950 via-slate-900/95 to-slate-950'
      : overlayGradient === 'emerald'
      ? 'from-slate-950 via-emerald-950/90 to-slate-950'
      : overlayGradient === 'amber'
      ? 'from-slate-950 via-amber-950/90 to-slate-950'
      : 'from-slate-950 via-[#0B132B]/95 to-[#1C2541]/90';

  return (
    <div id={id || 'home'} className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl min-h-[320px] sm:min-h-[380px] flex flex-col justify-between p-6 sm:p-10 lg:p-12 my-4 scroll-mt-20">
      {/* Background Image & Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradientClass} z-10`} />
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-screen pointer-events-none"
          style={{ backgroundImage: `url("${backgroundImage}")` }}
        />
      )}

      {/* Top Badge & Chips */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>{badgeText}</span>
        </div>

        {showStatChips && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
            {statChip1 && (
              <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 backdrop-blur-md">
                {statChip1}
              </span>
            )}
            {statChip2 && (
              <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/10 backdrop-blur-md">
                {statChip2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-20 space-y-4 max-w-2xl pt-6">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
          <span className="bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          {subtitle}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3.5 pt-2">
          {primaryCtaText && (
            <Link
              href={primaryCtaUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/30 hover:scale-[1.02] transition-all"
            >
              <span>{primaryCtaText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {secondaryCtaText && (
            <Link
              href={secondaryCtaUrl}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 backdrop-blur-md hover:scale-[1.02] transition-all"
            >
              <span>{secondaryCtaText}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HERO WITH IMAGE (Split Layout)
// ─────────────────────────────────────────────────────────────────────────────

export interface HeroWithImageProps {
  id?: string;
  headline?: string;
  subheading?: string;
  badge?: string;
  ctaText?: string;
  ctaUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  imagePosition?: 'right' | 'left';
}

export function HeroWithImage({
  headline = 'Fresh Quality Products Direct From Local Stores',
  subheading = 'Discover verified catalog selections, fast delivery, and authentic store experiences.',
  badge = '⭐ Verified Store Catalog',
  ctaText = 'Shop Catalog',
  ctaUrl = '/products',
  imageUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  imageAlt = 'Showcase',
  imagePosition = 'right',
}: HeroWithImageProps) {
  const isLeft = imagePosition === 'left';

  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center ${isLeft ? 'lg:flex-row-reverse' : ''}`}>
        <div className="space-y-5">
          {badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {badge}
            </span>
          )}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {headline}
          </h2>
          <p className="text-base text-slate-600 leading-relaxed max-w-lg">
            {subheading}
          </p>
          <div className="pt-2">
            <Link
              href={ctaUrl}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 aspect-[4/3]">
            <img src={imageUrl} alt={imageAlt} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CENTERED HERO
// ─────────────────────────────────────────────────────────────────────────────

export interface CenteredHeroProps {
  id?: string;
  pillText?: string;
  headline?: string;
  subheading?: string;
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
}

export function CenteredHero({
  pillText = '✨ Discover The New Experience',
  headline = 'Everything You Need, Delivered From Local Branches',
  subheading = 'Explore verified local store products, verified customer reviews, and fast in-store pickups.',
  primaryButtonText = 'Explore Products',
  primaryButtonUrl = '/products',
  secondaryButtonText = 'Find Stores',
  secondaryButtonUrl = '/locations',
}: CenteredHeroProps) {
  return (
    <div className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto space-y-6">
      {pillText && (
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span>{pillText}</span>
        </div>
      )}

      <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
        {headline}
      </h1>

      <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
        {subheading}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {primaryButtonText && (
          <Link
            href={primaryButtonUrl}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            {primaryButtonText}
          </Link>
        )}
        {secondaryButtonText && (
          <Link
            href={secondaryButtonUrl}
            className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 shadow-2xs transition-all hover:scale-[1.02]"
          >
            {secondaryButtonText}
          </Link>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CTA BANNER
// ─────────────────────────────────────────────────────────────────────────────

export interface CTABannerProps {
  id?: string;
  headline?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  themeStyle?: 'indigo' | 'dark' | 'emerald';
}

export function CTABanner({
  headline = 'Ready to Experience Authentic Quality?',
  description = 'Order directly from our catalog or visit our verified physical store locations today.',
  buttonText = 'Get Started Now',
  buttonUrl = '/products',
  themeStyle = 'indigo',
}: CTABannerProps) {
  const bgClass =
    themeStyle === 'dark'
      ? 'bg-slate-950 text-white border-slate-800'
      : themeStyle === 'emerald'
      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-500'
      : 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white border-indigo-500';

  return (
    <div className={`rounded-3xl p-8 sm:p-12 border shadow-xl my-8 flex flex-col md:flex-row items-center justify-between gap-6 ${bgClass}`}>
      <div className="space-y-2 max-w-xl text-center md:text-left">
        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {headline}
        </h3>
        <p className="text-sm sm:text-base opacity-90 leading-relaxed">
          {description}
        </p>
      </div>

      <Link
        href={buttonUrl}
        className="shrink-0 px-6 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm shadow-lg transition-all hover:scale-[1.03]"
      >
        {buttonText}
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DUAL CTA SECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface DualCTASectionProps {
  id?: string;
  card1Title?: string;
  card1Subtitle?: string;
  card1ButtonText?: string;
  card1ButtonUrl?: string;
  card2Title?: string;
  card2Subtitle?: string;
  card2ButtonText?: string;
  card2ButtonUrl?: string;
}

export function DualCTASection({
  card1Title = 'Shop Our Product Catalog',
  card1Subtitle = 'Browse premium authentic selections with direct ordering and home delivery.',
  card1ButtonText = 'Explore Products',
  card1ButtonUrl = '/products',
  card2Title = 'Visit Physical Storefront',
  card2Subtitle = 'Locate our nearest verified branch, check business hours, and get live directions.',
  card2ButtonText = 'Find Nearest Store',
  card2ButtonUrl = '/locations',
}: DualCTASectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
      <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 shadow-xs space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <Tag className="w-6 h-6 text-indigo-600" />
          <h4 className="text-xl font-bold text-slate-900">{card1Title}</h4>
          <p className="text-xs sm:text-sm text-slate-600">{card1Subtitle}</p>
        </div>
        <Link
          href={card1ButtonUrl}
          className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
          <span>{card1ButtonText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-sky-50 to-white border border-sky-100 shadow-xs space-y-4 flex flex-col justify-between">
        <div className="space-y-2">
          <Store className="w-6 h-6 text-sky-600" />
          <h4 className="text-xl font-bold text-slate-900">{card2Title}</h4>
          <p className="text-xs sm:text-sm text-slate-600">{card2Subtitle}</p>
        </div>
        <Link
          href={card2ButtonUrl}
          className="inline-flex items-center gap-2 text-xs font-bold text-sky-600 hover:text-sky-800"
        >
          <span>{card2ButtonText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PROMOTIONAL BANNER
// ─────────────────────────────────────────────────────────────────────────────

export interface PromoBannerProps {
  id?: string;
  badge?: string;
  headline?: string;
  couponCode?: string;
  expiryNote?: string;
}

export function PromoBanner({
  badge = 'SPECIAL OFFER',
  headline = 'Get 15% Off Your First Direct Store Order',
  couponCode = 'LOCAL15',
  expiryNote = 'Limited time offer. Apply code at store checkout or WhatsApp order.',
}: PromoBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 sm:p-6 my-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="space-y-1 text-center sm:text-left">
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
          {badge}
        </span>
        <h4 className="text-base sm:text-lg font-bold text-slate-900">{headline}</h4>
        <p className="text-xs text-slate-500">{expiryNote}</p>
      </div>

      {couponCode && (
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-mono text-xs font-bold shadow-2xs hover:bg-amber-50 transition-colors"
        >
          <span>{couponCode}</span>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. NEWSLETTER SIGNUP
// ─────────────────────────────────────────────────────────────────────────────

export interface NewsletterSignupProps {
  id?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  privacyText?: string;
}

export function NewsletterSignup({
  title = 'Stay Connected with Exclusive Offers',
  description = 'Subscribe to receive product drops, seasonal catalog discounts, and local branch updates.',
  buttonText = 'Subscribe',
  privacyText = 'We respect your privacy. Unsubscribe anytime.',
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="rounded-3xl p-8 sm:p-10 bg-slate-900 text-white shadow-xl my-8 text-center max-w-2xl mx-auto space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
        <Mail className="w-6 h-6" />
      </div>
      <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">{description}</p>

      {submitted ? (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Thank you for subscribing! Check your inbox soon.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            {buttonText}
          </button>
        </form>
      )}

      {privacyText && <p className="text-[11px] text-slate-400">{privacyText}</p>}
    </div>
  );
}
