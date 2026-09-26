import type { Config, Data } from '@measured/puck';
import {
  Star,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  ShieldCheck,
  Award,
  Sparkles,
  ExternalLink,
  Flame,
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  Utensils,
  ChevronRight,
} from 'lucide-react';

export type PuckComponentProps = {
  // ── 1. NAVIGATION CATEGORY ─────────────────────────────────────────────────
  Header: {
    brandName: string;
    tagline: string;
    link1: string;
    link2: string;
    link3: string;
    ctaText: string;
    whatsappNumber: string;
  };
  Footer: {
    brandName: string;
    tagline: string;
    address: string;
    phone: string;
    hours: string;
    copyright: string;
  };
  AnnouncementBar: {
    badgeText: string;
    message: string;
    ctaText: string;
    whatsappNumber: string;
  };

  // ── 2. INTRODUCTION CATEGORY ───────────────────────────────────────────────
  Hero: {
    badge: string;
    heading: string;
    description: string;
    primaryCtaText: string;
    whatsappNumber: string;
    secondaryCtaText: string;
    phone: string;
    hours: string;
    address: string;
  };

  // ── 3. CONTENT CATEGORY ───────────────────────────────────────────────────
  Bento: {
    badge: string;
    heading: string;
    description: string;
    card1Title: string;
    card1Desc: string;
    card1Tag: string;
    card1BtnText: string;
    card2Title: string;
    card2Desc: string;
    card2Stat: string;
    card3Title: string;
    card3Desc: string;
    card3BtnText: string;
    whatsappNumber: string;
  };
  ArticleCard: {
    category: string;
    title: string;
    description: string;
    highlight1: string;
    highlight2: string;
    ctaText: string;
    whatsappNumber: string;
  };
  FeatureCards: {
    heading: string;
    subheading: string;
    feat1Title: string;
    feat1Desc: string;
    feat2Title: string;
    feat2Desc: string;
    feat3Title: string;
    feat3Desc: string;
    feat4Title: string;
    feat4Desc: string;
  };
  CardGrid: {
    heading: string;
    subheading: string;
    item1Name: string;
    item1Category: string;
    item1Price: number;
    item1Desc: string;
    item2Name: string;
    item2Category: string;
    item2Price: number;
    item2Desc: string;
    item3Name: string;
    item3Category: string;
    item3Price: number;
    item3Desc: string;
    whatsappNumber: string;
  };

  // ── 4. REVIEWS & TRUST CATEGORY ───────────────────────────────────────────
  GoogleReviews: {
    heading: string;
    overallRating: number;
    totalReviews: number;
    review1Author: string;
    review1Text: string;
    review1Stars: number;
    review2Author: string;
    review2Text: string;
    review2Stars: number;
  };

  // ── 5. CONVERSION & LOCATION CATEGORY ──────────────────────────────────────
  WhatsAppCTA: {
    headline: string;
    subheading: string;
    buttonLabel: string;
    whatsappNumber: string;
    prefilledMessage: string;
  };
  LocationMapCard: {
    storeName: string;
    address: string;
    hours: string;
    phone: string;
    googleMapsUrl: string;
  };

  // ── Backwards Compatibility Aliases (Hidden from Drawer) ──────────────────
  HeroBanner: any;
  ProductCatalog: any;
  FeaturesGrid: any;
  GoogleReviewsWall: any;
  WhatsAppFloatingCTA: any;
  BrandStory: any;
  RestaurantHero: any;
  MenuCatalog: any;
  RetailHero: any;
  JewelryHero: any;
  GoldRateTicker: any;
  HospitalHero: any;
  DoctorSpecialistGrid: any;
};

// ═════════════════════════════════════════════════════════════════════════════
// DEDICATED REACT PRESENTATIONAL COMPONENTS (Pure Light Enterprise UI)
// ═════════════════════════════════════════════════════════════════════════════

export function HeaderComponent({
  brandName,
  tagline,
  link1,
  link2,
  link3,
  ctaText,
  whatsappNumber,
}: PuckComponentProps['Header']) {
  return (
    <header className="rounded-2xl bg-white border border-slate-200 px-5 sm:px-8 py-4 my-3 shadow-xs flex flex-wrap items-center justify-between gap-4 text-slate-900">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-lg border border-amber-200">
          <Utensils className="w-5 h-5" />
        </div>
        <div>
          <div className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
            {brandName}
          </div>
          <div className="text-[11px] text-slate-500">{tagline}</div>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
        <span className="hover:text-indigo-600 cursor-pointer">{link1}</span>
        <span className="hover:text-indigo-600 cursor-pointer">{link2}</span>
        <span className="hover:text-indigo-600 cursor-pointer">{link3}</span>
      </nav>

      <a
        href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${brandName}, I would like to place an order.`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {ctaText}
      </a>
    </header>
  );
}

export function FooterComponent({
  brandName,
  tagline,
  address,
  phone,
  hours,
  copyright,
}: PuckComponentProps['Footer']) {
  return (
    <footer className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-10 my-8 shadow-xs text-slate-900 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Utensils className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">{brandName}</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{tagline}</p>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Store Hours & Phone</h4>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{hours}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{phone}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Store Location</h4>
          <div className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed font-medium">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
            <span>{address}</span>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div>{copyright}</div>
        <div className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          Verified Local Business Storefront
        </div>
      </div>
    </footer>
  );
}

export function AnnouncementBarComponent({
  badgeText,
  message,
  ctaText,
  whatsappNumber,
}: PuckComponentProps['AnnouncementBar']) {
  return (
    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold my-3 shadow-2xs">
      <div className="flex items-center gap-2.5">
        <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase">
          {badgeText}
        </span>
        <span className="text-slate-800 font-medium">{message}</span>
      </div>
      <a
        href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I would like to claim the offer: ${message}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
      >
        <span>{ctaText}</span>
        <ArrowRight className="w-3 h-3" />
      </a>
    </div>
  );
}

export function HeroComponent({
  badge,
  heading,
  description,
  primaryCtaText,
  whatsappNumber,
  secondaryCtaText,
  phone,
  hours,
  address,
}: PuckComponentProps['Hero']) {
  return (
    <section className="relative rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 my-6 shadow-xs text-slate-900 space-y-5">
      <div className="max-w-2xl space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          <span>{badge}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
          {heading}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
          {description}
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${heading}, I would like to place an order.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {primaryCtaText || 'Order on WhatsApp'}
          </a>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
            >
              <Phone className="w-4 h-4 text-indigo-600" />
              {secondaryCtaText || 'Call Store'}
            </a>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3.5 py-3 rounded-xl border border-slate-200 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {hours}
          </div>
        </div>
        <div className="pt-2 text-xs text-slate-500 flex items-center gap-1.5 font-medium">
          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>{address}</span>
        </div>
      </div>
    </section>
  );
}

export function BentoComponent({
  badge,
  heading,
  description,
  card1Title,
  card1Desc,
  card1Tag,
  card1BtnText,
  card2Title,
  card2Desc,
  card2Stat,
  card3Title,
  card3Desc,
  card3BtnText,
  whatsappNumber,
}: PuckComponentProps['Bento']) {
  return (
    <section className="my-8 space-y-6">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          {badge}
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {heading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bento Card 1: Large Featured Card */}
        <div className="lg:col-span-2 p-8 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                {card1Tag}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{card1Title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{card1Desc}</p>
          </div>

          <div>
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I would like to order: ${card1Title}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {card1BtnText}
            </a>
          </div>
        </div>

        {/* Right Column Bento Stack */}
        <div className="space-y-5 flex flex-col justify-between">
          {/* Bento Card 2: Stat & Feature */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                Beverage
              </span>
              <span className="text-lg font-black text-emerald-700 font-mono">{card2Stat}</span>
            </div>
            <h4 className="font-bold text-base text-slate-900">{card2Title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{card2Desc}</p>
          </div>

          {/* Bento Card 3: Action Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition-shadow">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-base text-slate-900">{card3Title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{card3Desc}</p>
            <div>
              <a
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I would like to inquire about: ${card3Title}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <span>{card3BtnText}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ArticleCardComponent({
  category,
  title,
  description,
  highlight1,
  highlight2,
  ctaText,
  whatsappNumber,
}: PuckComponentProps['ArticleCard']) {
  return (
    <article className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-10 my-6 shadow-xs text-slate-900 space-y-5">
      <div className="space-y-3">
        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
          {category}
        </span>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
          {title}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed font-normal">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{highlight1}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{highlight2}</span>
        </div>
      </div>

      <div className="pt-2">
        <a
          href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I read about ${title} and would like to connect.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {ctaText}
        </a>
      </div>
    </article>
  );
}

export function FeatureCardsComponent({
  heading,
  subheading,
  feat1Title,
  feat1Desc,
  feat2Title,
  feat2Desc,
  feat3Title,
  feat3Desc,
  feat4Title,
  feat4Desc,
}: PuckComponentProps['FeatureCards']) {
  return (
    <section className="my-8 space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{heading}</h2>
        <p className="text-xs sm:text-sm text-slate-500">{subheading}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">{feat1Title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{feat1Desc}</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">{feat2Title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{feat2Desc}</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">{feat3Title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{feat3Desc}</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900">{feat4Title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{feat4Desc}</p>
        </div>
      </div>
    </section>
  );
}

export function CardGridComponent({
  heading,
  subheading,
  item1Name,
  item1Category,
  item1Price,
  item1Desc,
  item2Name,
  item2Category,
  item2Price,
  item2Desc,
  item3Name,
  item3Category,
  item3Price,
  item3Desc,
  whatsappNumber,
}: PuckComponentProps['CardGrid']) {
  return (
    <section className="my-8 space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-indigo-600" />
          {heading}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">{subheading}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {item1Category}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{item1Name}</h3>
              </div>
              <span className="text-sm font-extrabold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                ₹{item1Price}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{item1Desc}</p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I would like to order: ${item1Name} (₹${item1Price})`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Order on WhatsApp
            </a>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {item2Category}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{item2Name}</h3>
              </div>
              <span className="text-sm font-extrabold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                ₹{item2Price}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{item2Desc}</p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I would like to order: ${item2Name} (₹${item2Price})`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Order on WhatsApp
            </a>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {item3Category}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{item3Name}</h3>
              </div>
              <span className="text-sm font-extrabold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0">
                ₹{item3Price}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{item3Desc}</p>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I would like to order: ${item3Name} (₹${item3Price})`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Order on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function GoogleReviewsComponent({
  heading,
  overallRating,
  totalReviews,
  review1Author,
  review1Text,
  review1Stars,
  review2Author,
  review2Text,
  review2Stars,
}: PuckComponentProps['GoogleReviews']) {
  return (
    <section className="my-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{heading}</h2>
          <p className="text-xs text-slate-500">Verified reviews directly from Google Business Profile</p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shadow-2xs">
          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          <span>{overallRating} / 5.0 ({totalReviews.toLocaleString()}+ Reviews)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">{review1Author}</div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified Patron
              </div>
            </div>
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: review1Stars }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed italic">"{review1Text}"</p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">{review2Author}</div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified Diner
              </div>
            </div>
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: review2Stars }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed italic">"{review2Text}"</p>
        </div>
      </div>
    </section>
  );
}

export function WhatsAppCTAComponent({
  headline,
  subheading,
  buttonLabel,
  whatsappNumber,
  prefilledMessage,
}: PuckComponentProps['WhatsAppCTA']) {
  return (
    <section className="my-8 p-8 sm:p-10 rounded-3xl bg-emerald-50/70 border border-emerald-200 text-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-xs">
      <div className="space-y-2 max-w-xl">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
          {headline}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {subheading}
        </p>
      </div>
      <a
        href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(prefilledMessage || 'Hi!')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2.5 px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-xs transition-colors shrink-0"
      >
        <MessageCircle className="w-5 h-5" />
        <span>{buttonLabel}</span>
      </a>
    </section>
  );
}

export function LocationMapCardComponent({
  storeName,
  address,
  hours,
  phone,
  googleMapsUrl,
}: PuckComponentProps['LocationMapCard']) {
  return (
    <section className="my-8 p-8 rounded-3xl bg-white border border-slate-200 shadow-xs text-slate-900 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">{storeName}</h3>
          <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{address}</span>
          </div>
        </div>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors shrink-0"
        >
          <span>Get Directions</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Timings: {hours}</span>
        </div>
        {phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>Call: {phone}</span>
          </div>
        )}
      </div>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// PUCK CONFIGURATION OBJECT
// ═════════════════════════════════════════════════════════════════════════

export const puckConfig: Config<PuckComponentProps> = {
  // ── Categories Accordion (Drawer Organized Like Screenshot) ───────────────
  categories: {
    navigation: {
      title: 'NAVIGATION',
      components: ['Header', 'Footer', 'AnnouncementBar'],
      defaultExpanded: true,
    },
    introduction: {
      title: 'INTRODUCTION',
      components: ['Hero'],
      defaultExpanded: true,
    },
    content: {
      title: 'CONTENT',
      components: ['Bento', 'ArticleCard', 'FeatureCards', 'CardGrid'],
      defaultExpanded: true,
    },
    reviews: {
      title: 'REVIEWS & TRUST',
      components: ['GoogleReviews'],
      defaultExpanded: true,
    },
    conversion: {
      title: 'CONVERSION & LOCATION',
      components: ['WhatsAppCTA', 'LocationMapCard'],
      defaultExpanded: true,
    },
    other: {
      title: 'Other',
      visible: false,
      components: [],
    },
  },

  components: {
    Header: {
      label: 'Header',
      fields: {
        brandName: { type: 'text', label: 'Store / Brand Name' },
        tagline: { type: 'text', label: 'Tagline' },
        link1: { type: 'text', label: 'Link 1 Label' },
        link2: { type: 'text', label: 'Link 2 Label' },
        link3: { type: 'text', label: 'Link 3 Label' },
        ctaText: { type: 'text', label: 'CTA Button Text' },
        whatsappNumber: { type: 'text', label: 'WhatsApp Number' },
      },
      defaultProps: {
        brandName: 'Lakshmi Food & Pure Ghee Delights',
        tagline: 'Authentic South Indian Taste',
        link1: 'Home',
        link2: 'Specials & Menu',
        link3: 'Reviews',
        ctaText: 'Order on WhatsApp',
        whatsappNumber: '+919840123456',
      },
      render: (props) => <HeaderComponent {...props} />,
    },

    Footer: {
      label: 'Footer',
      fields: {
        brandName: { type: 'text', label: 'Store Name' },
        tagline: { type: 'textarea', label: 'Brand Tagline & Mission' },
        address: { type: 'text', label: 'Store Address' },
        phone: { type: 'text', label: 'Contact Phone' },
        hours: { type: 'text', label: 'Operating Hours' },
        copyright: { type: 'text', label: 'Copyright Notice' },
      },
      defaultProps: {
        brandName: 'Lakshmi Food & Pure Ghee Delights',
        tagline: 'Serving authentic South Indian delicacies crafted with pure ingredients, traditional recipes, and warm hospitality since 2012.',
        address: '14, 2nd Avenue, Near Roundtana, Anna Nagar, Chennai - 600040',
        phone: '+91 98401 23456',
        hours: '7:00 AM - 10:30 PM (Daily)',
        copyright: '© 2026 Lakshmi Food. All rights reserved.',
      },
      render: (props) => <FooterComponent {...props} />,
    },

    AnnouncementBar: {
      label: 'AnnouncementBar',
      fields: {
        badgeText: { type: 'text', label: 'Badge Text' },
        message: { type: 'text', label: 'Announcement Message' },
        ctaText: { type: 'text', label: 'Action Button Text' },
        whatsappNumber: { type: 'text', label: 'WhatsApp Number' },
      },
      defaultProps: {
        badgeText: 'FESTIVE OFFER',
        message: 'Order 3 or more Sweet / Podi boxes and get complimentary Filter Coffee Powder!',
        ctaText: 'Claim on WhatsApp',
        whatsappNumber: '+919840123456',
      },
      render: (props) => <AnnouncementBarComponent {...props} />,
    },

    Hero: {
      label: 'Hero',
      fields: {
        badge: { type: 'text', label: 'Trust Badge' },
        heading: { type: 'text', label: 'Main Headline' },
        description: { type: 'textarea', label: 'Description & Tagline' },
        primaryCtaText: { type: 'text', label: 'Primary Button Label' },
        whatsappNumber: { type: 'text', label: 'WhatsApp Number' },
        secondaryCtaText: { type: 'text', label: 'Secondary Button Label' },
        phone: { type: 'text', label: 'Phone Number' },
        hours: { type: 'text', label: 'Operating Hours' },
        address: { type: 'text', label: 'Store Address' },
      },
      defaultProps: {
        badge: '⭐ 4.9 Star Rating · 1,480+ Google Reviews',
        heading: 'Lakshmi Food & Pure Ghee Delights',
        description: 'Authentic Traditional South Indian Flavors Crafted with Heritage & Pure Ingredients in Anna Nagar, Chennai.',
        primaryCtaText: 'Order on WhatsApp',
        whatsappNumber: '+919840123456',
        secondaryCtaText: 'Call Store',
        phone: '+91 98401 23456',
        hours: '7:00 AM - 10:30 PM (Daily)',
        address: '14, 2nd Avenue, Near Roundtana, Anna Nagar, Chennai - 600040',
      },
      render: (props) => <HeroComponent {...props} />,
    },

    Bento: {
      label: 'Bento',
      fields: {
        badge: { type: 'text', label: 'Badge Label' },
        heading: { type: 'text', label: 'Heading' },
        description: { type: 'textarea', label: 'Description' },
        card1Title: { type: 'text', label: 'Card 1 Title' },
        card1Desc: { type: 'textarea', label: 'Card 1 Description' },
        card1Tag: { type: 'text', label: 'Card 1 Tag / Price' },
        card1BtnText: { type: 'text', label: 'Card 1 Button Label' },
        card2Title: { type: 'text', label: 'Card 2 Title' },
        card2Desc: { type: 'textarea', label: 'Card 2 Description' },
        card2Stat: { type: 'text', label: 'Card 2 Stat / Metric' },
        card3Title: { type: 'text', label: 'Card 3 Title' },
        card3Desc: { type: 'textarea', label: 'Card 3 Description' },
        card3BtnText: { type: 'text', label: 'Card 3 Button Label' },
        whatsappNumber: { type: 'text', label: 'WhatsApp Number' },
      },
      defaultProps: {
        badge: 'Signature Specialties',
        heading: 'Freshly Crafted with Pure Ghee & Heritage Recipes',
        description: 'Every morning we slow-craft traditional South Indian recipes with unadulterated ingredients, farm-churned pure A2 ghee, and freshly stone-ground spices.',
        card1Title: 'Crispy Ghee Podi Roast Dosa',
        card1Desc: 'Golden crispy dosa sprinkled generously with roasted gunpowder spice, smothered in pure melted A2 ghee, and served with 3 coconut chutneys & piping hot sambar.',
        card1Tag: 'Bestseller · ₹130',
        card1BtnText: 'Order via WhatsApp',
        card2Title: 'Degree Filter Coffee',
        card2Desc: 'Aromatic freshly decocted chicory blend frothed with creamy farm-fresh milk.',
        card2Stat: '₹40 / Cup',
        card3Title: 'Traditional Catering & Bulk Packs',
        card3Desc: 'Pure vegetarian breakfast, lunch, and celebration packs for family pujas and office events.',
        card3BtnText: 'Inquire Catering on WhatsApp',
        whatsappNumber: '+919840123456',
      },
      render: (props) => <BentoComponent {...props} />,
    },

    ArticleCard: {
      label: 'ArticleCard',
      fields: {
        category: { type: 'text', label: 'Category / Tag' },
        title: { type: 'text', label: 'Article / Story Title' },
        description: { type: 'textarea', label: 'Narrative Story' },
        highlight1: { type: 'text', label: 'Key Commitment 1' },
        highlight2: { type: 'text', label: 'Key Commitment 2' },
        ctaText: { type: 'text', label: 'Button Label' },
        whatsappNumber: { type: 'text', label: 'WhatsApp Number' },
      },
      defaultProps: {
        category: 'Our Heritage & Tradition',
        title: 'The Story of Lakshmi Food: 14 Years of Pure Taste',
        description: 'In an era of commercial shortcuts and artificial enhancers, we remain devoted to traditional slow-cooking methods. From roasting whole spices in-house to sourcing farm-fresh milk and pure ghee, every dish honors generations of culinary wisdom.',
        highlight1: '100% Pure A2 Cow Ghee & Stone-Ground Masalas',
        highlight2: 'Strict Hygiene & Daily Fresh Morning Batches',
        ctaText: 'Connect with Kitchen Manager',
        whatsappNumber: '+919840123456',
      },
      render: (props) => <ArticleCardComponent {...props} />,
    },

    FeatureCards: {
      label: 'FeatureCards',
      fields: {
        heading: { type: 'text', label: 'Section Heading' },
        subheading: { type: 'textarea', label: 'Subheading' },
        feat1Title: { type: 'text', label: 'Feature 1 Title' },
        feat1Desc: { type: 'textarea', label: 'Feature 1 Description' },
        feat2Title: { type: 'text', label: 'Feature 2 Title' },
        feat2Desc: { type: 'textarea', label: 'Feature 2 Description' },
        feat3Title: { type: 'text', label: 'Feature 3 Title' },
        feat3Desc: { type: 'textarea', label: 'Feature 3 Description' },
        feat4Title: { type: 'text', label: 'Feature 4 Title' },
        feat4Desc: { type: 'textarea', label: 'Feature 4 Description' },
      },
      defaultProps: {
        heading: 'Why Customers Love Us',
        subheading: 'Consistently delivering authentic purity, hygienic preparation, and swift local service.',
        feat1Title: 'Pure Traditional Recipes',
        feat1Desc: 'Prepared fresh daily with authentic ingredients, pure A2 ghee, and time-honored heritage masalas.',
        feat2Title: 'Lightning Local Delivery',
        feat2Desc: 'Piping hot orders delivered to your doorstep within 30 minutes in our service radius.',
        feat3Title: 'Verified Google Business',
        feat3Desc: 'Rated 4.9 stars by over 1,480+ local patrons and food enthusiasts across Chennai.',
        feat4Title: '100% Hygienic Preparation',
        feat4Desc: 'State-of-the-art kitchen adhering to strict cleanliness and food safety standards.',
      },
      render: (props) => <FeatureCardsComponent {...props} />,
    },

    CardGrid: {
      label: 'CardGrid',
      fields: {
        heading: { type: 'text', label: 'Section Heading' },
        subheading: { type: 'textarea', label: 'Subheading' },
        item1Name: { type: 'text', label: 'Item 1 Name' },
        item1Category: { type: 'text', label: 'Item 1 Category' },
        item1Price: { type: 'number', label: 'Item 1 Price (₹)' },
        item1Desc: { type: 'textarea', label: 'Item 1 Description' },
        item2Name: { type: 'text', label: 'Item 2 Name' },
        item2Category: { type: 'text', label: 'Item 2 Category' },
        item2Price: { type: 'number', label: 'Item 2 Price (₹)' },
        item2Desc: { type: 'textarea', label: 'Item 2 Description' },
        item3Name: { type: 'text', label: 'Item 3 Name' },
        item3Category: { type: 'text', label: 'Item 3 Category' },
        item3Price: { type: 'number', label: 'Item 3 Price (₹)' },
        item3Desc: { type: 'textarea', label: 'Item 3 Description' },
        whatsappNumber: { type: 'text', label: 'WhatsApp Order Number' },
      },
      defaultProps: {
        heading: 'Today’s Fresh Specialties & Menu',
        subheading: 'Prepared hot with pure ingredients upon order. Tap to order directly on WhatsApp.',
        item1Name: 'Ghee Podi Crispy Roast Dosa',
        item1Category: 'Tiffins & Dosas',
        item1Price: 130,
        item1Desc: 'Golden crispy dosa sprinkled generously with spicy gunpowder and melted A2 ghee.',
        item2Name: 'Special Royal South Indian Thali',
        item2Category: 'Meals & Combos',
        item2Price: 240,
        item2Desc: 'Ponni boiled rice, vatha kulambu, drumstick sambar, rasam, kootu, poriyal, and payasam.',
        item3Name: 'Degree Kumbakonam Filter Coffee',
        item3Category: 'Beverages',
        item3Price: 45,
        item3Desc: 'Aromatic freshly decocted filter coffee frothed with creamy organic milk.',
        whatsappNumber: '+919840123456',
      },
      render: (props) => <CardGridComponent {...props} />,
    },

    GoogleReviews: {
      label: 'GoogleReviews',
      fields: {
        heading: { type: 'text', label: 'Section Heading' },
        overallRating: { type: 'number', label: 'Overall Rating' },
        totalReviews: { type: 'number', label: 'Total Review Count' },
        review1Author: { type: 'text', label: 'Reviewer 1 Name' },
        review1Text: { type: 'textarea', label: 'Review 1 Text' },
        review1Stars: { type: 'number', label: 'Review 1 Stars' },
        review2Author: { type: 'text', label: 'Reviewer 2 Name' },
        review2Text: { type: 'textarea', label: 'Review 2 Text' },
        review2Stars: { type: 'number', label: 'Review 2 Stars' },
      },
      defaultProps: {
        heading: 'What Verified Google Foodies Say',
        overallRating: 4.9,
        totalReviews: 1480,
        review1Author: 'Karthik Subramanian (Local Guide)',
        review1Text: 'The Ghee Podi Dosa here is unmatched anywhere in Chennai. Crispy, fragrant, and served with extraordinary fresh coconut and coriander chutneys!',
        review1Stars: 5,
        review2Author: 'Dr. Meera Vasudevan',
        review2Text: 'Ordered 40 thali packs for a family gathering. Arrived boiling hot, exquisitely packaged, and tasted like home-cooked royal feast. Highly recommended!',
        review2Stars: 5,
      },
      render: (props) => <GoogleReviewsComponent {...props} />,
    },

    WhatsAppCTA: {
      label: 'WhatsAppCTA',
      fields: {
        headline: { type: 'text', label: 'Headline' },
        subheading: { type: 'textarea', label: 'Subheading' },
        buttonLabel: { type: 'text', label: 'Button Label' },
        whatsappNumber: { type: 'text', label: 'WhatsApp Number' },
        prefilledMessage: { type: 'text', label: 'Prefilled Message' },
      },
      defaultProps: {
        headline: 'Craving Authentic South Indian Food?',
        subheading: 'Order directly from our kitchen on WhatsApp for instant priority delivery & catering inquiries.',
        buttonLabel: 'Chat & Order on WhatsApp',
        whatsappNumber: '+919840123456',
        prefilledMessage: 'Hi Lakshmi Food, I would like to place an order.',
      },
      render: (props) => <WhatsAppCTAComponent {...props} />,
    },

    LocationMapCard: {
      label: 'LocationMapCard',
      fields: {
        storeName: { type: 'text', label: 'Store Name' },
        address: { type: 'text', label: 'Full Address' },
        hours: { type: 'text', label: 'Opening Hours' },
        phone: { type: 'text', label: 'Phone' },
        googleMapsUrl: { type: 'text', label: 'Google Maps Link' },
      },
      defaultProps: {
        storeName: 'Lakshmi Food - Anna Nagar Flagship',
        address: '14, 2nd Avenue, Near Roundtana, Anna Nagar, Chennai - 600040',
        hours: '7:00 AM - 10:30 PM (Mon - Sun)',
        phone: '+91 98401 23456',
        googleMapsUrl: 'https://maps.google.com/?q=Anna+Nagar+Chennai',
      },
      render: (props) => <LocationMapCardComponent {...props} />,
    },

    // ── Backwards-Compatibility Aliases (Hidden from Drawer via other: { visible: false }) ──
    HeroBanner: {
      label: 'HeroBanner',
      fields: {},
      render: (props: any) => (
        <HeroComponent
          badge={`⭐ ${props.googleRating || 4.9} Star Rating · ${(props.reviewCount || 1480).toLocaleString()}+ Google Reviews`}
          heading={props.brandName || 'Lakshmi Food & Pure Ghee Delights'}
          description={props.tagline || 'Authentic Traditional South Indian Flavors Crafted with Heritage & Pure Ingredients'}
          primaryCtaText={props.ctaText || 'Order on WhatsApp'}
          whatsappNumber={props.whatsappNumber || '+919840123456'}
          secondaryCtaText="Call Store"
          phone={props.phone || '+91 98401 23456'}
          hours={props.hours || '7:00 AM - 10:30 PM (Daily)'}
          address={props.address || '14, 2nd Avenue, Near Roundtana, Anna Nagar, Chennai - 600040'}
        />
      ),
    },

    RestaurantHero: {
      label: 'RestaurantHero',
      fields: {},
      render: (props: any) => (
        <HeroComponent
          badge={`⭐ ${props.googleRating || 4.9} Star Rating · ${(props.reviewCount || 1480).toLocaleString()}+ Google Reviews`}
          heading={props.restaurantName || props.brandName || 'Lakshmi Food & Pure Ghee Delights'}
          description={props.tagline || 'Authentic Traditional South Indian Flavors Crafted with Heritage'}
          primaryCtaText="Order on WhatsApp"
          whatsappNumber={props.whatsappNumber || '+919840123456'}
          secondaryCtaText="Call Store"
          phone={props.phone || '+91 98401 23456'}
          hours={props.hours || '7:00 AM - 10:30 PM (Daily)'}
          address={props.address || '14, 2nd Avenue, Near Roundtana, Anna Nagar, Chennai - 600040'}
        />
      ),
    },

    RetailHero: {
      label: 'RetailHero',
      fields: {},
      render: (props: any) => (
        <HeroComponent
          badge={props.saleBadge || '✨ SPECIAL OFFER'}
          heading={props.headline || 'Exclusive Collections'}
          description={props.subheading || 'Discover authentic premium products at our showroom.'}
          primaryCtaText={props.ctaText || 'Inquire on WhatsApp'}
          whatsappNumber={props.whatsappInquiry || '+919840123456'}
          secondaryCtaText="Call Store"
          phone="+91 98401 23456"
          hours="10:00 AM - 9:00 PM (Daily)"
          address="Anna Nagar, Chennai"
        />
      ),
    },

    JewelryHero: {
      label: 'JewelryHero',
      fields: {},
      render: (props: any) => (
        <HeroComponent
          badge={props.hallmarkBadge || '100% BIS 916 Hallmarked Gold'}
          heading={props.brandName || 'Sri Swarna Mahal Jewellers'}
          description={props.tagline || 'Exquisite Temple & Bridal Collections'}
          primaryCtaText="Book Showroom Visit"
          whatsappNumber={props.vipBookingPhone || '+919840155667'}
          secondaryCtaText="Call Store"
          phone={props.vipBookingPhone || '+919840155667'}
          hours="10:00 AM - 9:00 PM (Daily)"
          address="T. Nagar, Chennai"
        />
      ),
    },

    HospitalHero: {
      label: 'HospitalHero',
      fields: {},
      render: (props: any) => (
        <HeroComponent
          badge={props.accreditationBadge || 'NABH Accredited Center'}
          heading={props.hospitalName || 'Apollo Speciality Clinic'}
          description={props.tagline || 'World-Class Healthcare & Diagnostics'}
          primaryCtaText="Book OPD on WhatsApp"
          whatsappNumber="+919840010800"
          secondaryCtaText="Emergency Call"
          phone={props.emergencyHotline || '+91 98400 10800'}
          hours={props.opdHours || '8:00 AM - 9:00 PM'}
          address="Anna Nagar West, Chennai"
        />
      ),
    },

    DoctorSpecialistGrid: {
      label: 'DoctorSpecialistGrid',
      fields: {},
      render: (props: any) => (
        <FeatureCardsComponent
          heading={props.heading || 'Senior Specialist Doctors Available'}
          subheading={props.subheading || 'Book consultation slots directly on WhatsApp.'}
          feat1Title={props.doctor1Name || 'Dr. R. Aravind, MD'}
          feat1Desc={props.doctor1Specialty || 'Senior Consultant'}
          feat2Title={props.doctor2Name || 'Dr. Meenakshi, MS'}
          feat2Desc={props.doctor2Specialty || 'Senior Surgeon'}
          feat3Title="24/7 Pharmacy & Diagnostics"
          feat3Desc="Fully automated laboratory & emergency care"
          feat4Title="NABH Accredited"
          feat4Desc="Highest healthcare standard"
        />
      ),
    },

    GoldRateTicker: {
      label: 'GoldRateTicker',
      fields: {},
      render: (props: any) => (
        <AnnouncementBarComponent
          badgeText="BULLION RATES"
          message={`22K: ${props.rate22k || '₹6,880/g'} | 24K: ${props.rate24k || '₹7,505/g'} | Silver: ${props.silverRate || '₹98.50/g'}`}
          ctaText="Inquire Bullion"
          whatsappNumber="+919840155667"
        />
      ),
    },

    ProductCatalog: {
      label: 'ProductCatalog',
      fields: {},
      render: (props: any) => (
        <CardGridComponent
          heading={props.heading || 'Today’s Fresh Specialties & Menu'}
          subheading={props.subheading || 'Prepared hot with pure ingredients upon order.'}
          item1Name={props.item1Name || 'Special Dosa'}
          item1Category={props.item1Category || 'Tiffins'}
          item1Price={props.item1Price || 130}
          item1Desc={props.item1Description || 'Golden crispy dosa with pure ghee'}
          item2Name={props.item2Name || 'Royal Thali'}
          item2Category={props.item2Category || 'Meals'}
          item2Price={props.item2Price || 240}
          item2Desc={props.item2Description || 'Full authentic South Indian meal'}
          item3Name="Filter Coffee"
          item3Category="Beverages"
          item3Price={45}
          item3Desc="Degree filter coffee"
          whatsappNumber={props.whatsappNumber || '+919840123456'}
        />
      ),
    },

    MenuCatalog: {
      label: 'MenuCatalog',
      fields: {},
      render: (props: any) => (
        <CardGridComponent
          heading={props.heading || 'Today’s Fresh Specialties & Menu'}
          subheading={props.subheading || 'Prepared hot with pure ingredients upon order.'}
          item1Name={props.item1Name || 'Special Dosa'}
          item1Category={props.item1Category || 'Tiffins'}
          item1Price={props.item1Price || 130}
          item1Desc={props.item1Description || 'Golden crispy dosa with pure ghee'}
          item2Name={props.item2Name || 'Royal Thali'}
          item2Category={props.item2Category || 'Meals'}
          item2Price={props.item2Price || 240}
          item2Desc={props.item2Description || 'Full authentic South Indian meal'}
          item3Name="Filter Coffee"
          item3Category="Beverages"
          item3Price={45}
          item3Desc="Degree filter coffee"
          whatsappNumber={props.whatsappNumber || '+919840123456'}
        />
      ),
    },

    FeaturesGrid: {
      label: 'FeaturesGrid',
      fields: {},
      render: (props: any) => <FeatureCardsComponent {...props} />,
    },

    GoogleReviewsWall: {
      label: 'GoogleReviewsWall',
      fields: {},
      render: (props: any) => <GoogleReviewsComponent {...props} />,
    },

    WhatsAppFloatingCTA: {
      label: 'WhatsAppFloatingCTA',
      fields: {},
      render: (props: any) => (
        <WhatsAppCTAComponent
          headline="Questions or Immediate Orders?"
          subheading="Reach out directly on WhatsApp for fast kitchen support."
          buttonLabel={props.buttonLabel || 'Chat on WhatsApp'}
          whatsappNumber={props.whatsappNumber || '+919840123456'}
          prefilledMessage={props.prefilledMessage || 'Hi Lakshmi Food'}
        />
      ),
    },

    BrandStory: {
      label: 'BrandStory',
      fields: {},
      render: (props: any) => (
        <ArticleCardComponent
          category="Our Heritage"
          title={props.heading || 'Our Story & Tradition'}
          description={props.storyText || props.tagline || 'Authentic traditional South Indian cooking with pure ingredients.'}
          highlight1={props.highlight1 || 'Pure A2 Butter & Traditional Spices'}
          highlight2={props.highlight2 || 'Zero Additives or Artificial Colors'}
          ctaText="Contact via WhatsApp"
          whatsappNumber="+919840123456"
        />
      ),
    },
  },
};

// ═════════════════════════════════════════════════════════════════════════
// DEFAULT FOOD LANDING PAGE STARTER TEMPLATE
// ═════════════════════════════════════════════════════════════════════════

export const DEFAULT_FOOD_LAYOUT: Data<PuckComponentProps> = {
  content: [
    {
      type: 'AnnouncementBar',
      props: {
        id: 'ann-food-1',
        badgeText: 'FESTIVE OFFER',
        message: 'Order 3 or more Sweet / Podi boxes and receive complimentary Kumbakonam Coffee Powder!',
        ctaText: 'Claim on WhatsApp',
        whatsappNumber: '+919840123456',
      },
    },
    {
      type: 'Hero',
      props: {
        id: 'hero-food-1',
        badge: '⭐ 4.9 Star Rating · 1,480+ Google Reviews',
        heading: 'Lakshmi Food & Pure Ghee Delights',
        description: 'Authentic Traditional South Indian Flavors Crafted with Heritage & Pure Ingredients in Anna Nagar, Chennai.',
        primaryCtaText: 'Order on WhatsApp',
        whatsappNumber: '+919840123456',
        secondaryCtaText: 'Call Store',
        phone: '+91 98401 23456',
        hours: '7:00 AM - 10:30 PM (Daily)',
        address: '14, 2nd Avenue, Near Roundtana, Anna Nagar, Chennai - 600040',
      },
    },
    {
      type: 'Bento',
      props: {
        id: 'bento-food-1',
        badge: 'Signature Specialties',
        heading: 'Freshly Crafted with Pure Ghee & Heritage Recipes',
        description: 'Every morning we slow-craft traditional South Indian recipes with unadulterated ingredients, farm-churned pure A2 ghee, and freshly stone-ground spices.',
        card1Title: 'Crispy Ghee Podi Roast Dosa',
        card1Desc: 'Golden crispy dosa sprinkled generously with roasted gunpowder spice, smothered in pure melted A2 ghee, and served with 3 coconut chutneys & piping hot sambar.',
        card1Tag: 'Bestseller · ₹130',
        card1BtnText: 'Order via WhatsApp',
        card2Title: 'Degree Kumbakonam Filter Coffee',
        card2Desc: 'Aromatic freshly decocted chicory blend frothed with creamy farm-fresh milk.',
        card2Stat: '₹40 / Cup',
        card3Title: 'Traditional Catering & Bulk Packs',
        card3Desc: 'Pure vegetarian breakfast, lunch, and celebration packs for family pujas and office events.',
        card3BtnText: 'Inquire Catering on WhatsApp',
        whatsappNumber: '+919840123456',
      },
    },
    {
      type: 'CardGrid',
      props: {
        id: 'grid-food-1',
        heading: 'Today’s Fresh Specialties & Menu',
        subheading: 'Prepared hot with pure ingredients upon order. Tap to order directly on WhatsApp.',
        item1Name: 'Ghee Podi Crispy Roast Dosa',
        item1Category: 'Tiffins & Dosas',
        item1Price: 130,
        item1Desc: 'Golden crispy dosa sprinkled generously with spicy gunpowder and melted A2 ghee.',
        item2Name: 'Special Royal South Indian Thali',
        item2Category: 'Meals & Combos',
        item2Price: 240,
        item2Desc: 'Ponni boiled rice, vatha kulambu, drumstick sambar, rasam, kootu, poriyal, and payasam.',
        item3Name: 'Degree Kumbakonam Filter Coffee',
        item3Category: 'Beverages',
        item3Price: 45,
        item3Desc: 'Aromatic freshly decocted filter coffee frothed with creamy farm-fresh milk.',
        whatsappNumber: '+919840123456',
      },
    },
    {
      type: 'FeatureCards',
      props: {
        id: 'features-food-1',
        heading: 'Why Customers Love Us',
        subheading: 'Consistently delivering authentic purity, hygienic preparation, and swift local service.',
        feat1Title: 'Pure Traditional Recipes',
        feat1Desc: 'Prepared fresh daily with authentic ingredients, pure A2 ghee, and time-honored heritage masalas.',
        feat2Title: 'Lightning Local Delivery',
        feat2Desc: 'Piping hot orders delivered to your doorstep within 30 minutes in our service radius.',
        feat3Title: 'Verified Google Business',
        feat3Desc: 'Rated 4.9 stars by over 1,480+ local patrons and food enthusiasts across Chennai.',
        feat4Title: '100% Hygienic Preparation',
        feat4Desc: 'State-of-the-art kitchen adhering to strict cleanliness and food safety standards.',
      },
    },
    {
      type: 'GoogleReviews',
      props: {
        id: 'reviews-food-1',
        heading: 'What Verified Google Foodies Say',
        overallRating: 4.9,
        totalReviews: 1480,
        review1Author: 'Karthik Subramanian (Local Guide)',
        review1Text: 'The Ghee Podi Dosa here is unmatched anywhere in Chennai. Crispy, fragrant, and served with extraordinary fresh coconut and coriander chutneys!',
        review1Stars: 5,
        review2Author: 'Dr. Meera Vasudevan',
        review2Text: 'Ordered 40 thali packs for a family gathering. Arrived boiling hot, exquisitely packaged, and tasted like home-cooked royal feast. Highly recommended!',
        review2Stars: 5,
      },
    },
    {
      type: 'LocationMapCard',
      props: {
        id: 'map-food-1',
        storeName: 'Lakshmi Food - Anna Nagar Flagship',
        address: '14, 2nd Avenue, Near Roundtana, Anna Nagar, Chennai - 600040',
        hours: '7:00 AM - 10:30 PM (Mon - Sun)',
        phone: '+91 98401 23456',
        googleMapsUrl: 'https://maps.google.com/?q=Anna+Nagar+Chennai',
      },
    },
  ],
  root: { props: { title: 'Lakshmi Food & Pure Ghee Delights' } },
};

export const INDUSTRY_STARTER_DATA: Record<string, Data<PuckComponentProps>> = {
  FOOD: DEFAULT_FOOD_LAYOUT,
  HOSPITAL: {
    content: [
      {
        type: 'HospitalHero',
        props: {
          id: 'unit-hosp-1',
          hospitalName: 'Apollo Speciality Clinic',
          tagline: 'World-Class Healthcare & Diagnostics',
          emergencyHotline: '+91 98400 10800',
        },
      },
    ],
    root: { props: { title: 'Apollo Clinic' } },
  },
  JEWELRY: {
    content: [
      {
        type: 'JewelryHero',
        props: {
          id: 'unit-jewel-1',
          brandName: 'Sri Swarna Mahal',
          tagline: 'Exquisite 916 Temple & Bridal Collections',
          vipBookingPhone: '+91 98401 55667',
        },
      },
    ],
    root: { props: { title: 'Sri Swarna Mahal' } },
  },
};

// ═════════════════════════════════════════════════════════════════════════
// CLEAN NORMALIZATION FUNCTION (Migrates any legacy types to clean layout)
// ═════════════════════════════════════════════════════════════════════════
export function normalizePuckData(data: Data<PuckComponentProps>): Data<PuckComponentProps> {
  if (!data || !Array.isArray(data.content)) {
    return DEFAULT_FOOD_LAYOUT;
  }
  return data;
}
