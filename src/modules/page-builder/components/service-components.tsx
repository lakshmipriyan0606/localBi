'use client';

import React from 'react';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Clock,
  HeartHandshake,
  Award,
  ArrowRight,
  User,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 1. SERVICES GRID
// ─────────────────────────────────────────────────────────────────────────────

export interface ServicesGridProps {
  id?: string;
  headline?: string;
  subheading?: string;
  columns?: 2 | 3 | 4;
  service1Title?: string;
  service1Desc?: string;
  service2Title?: string;
  service2Desc?: string;
  service3Title?: string;
  service3Desc?: string;
  service4Title?: string;
  service4Desc?: string;
}

export function ServicesGrid({
  id = 'services',
  headline = 'Our Core Services & Offerings',
  subheading = 'Crafted for customer satisfaction with dedicated local service and verified standards.',
  columns = 3,
  service1Title = 'Authentic In-Store Consultation',
  service1Desc = 'Visit any of our physical storefronts for hands-on guidance and expert recommendations.',
  service2Title = 'Rapid Same-Day Local Delivery',
  service2Desc = 'Get verified stock dispatched directly from the nearest verified neighborhood branch.',
  service3Title = 'Wholesale & Custom Inquiries',
  service3Desc = 'Special volume arrangements, gifting packages, and customized enterprise solutions.',
  service4Title = 'Continuous After-Sale Support',
  service4Desc = 'Direct WhatsApp and phone assistance available six days a week for all orders.',
}: ServicesGridProps) {
  const services = [
    { title: service1Title, desc: service1Desc, icon: Sparkles },
    { title: service2Title, desc: service2Desc, icon: Clock },
    { title: service3Title, desc: service3Desc, icon: Award },
    ...(columns === 4 ? [{ title: service4Title, desc: service4Desc, icon: HeartHandshake }] : []),
  ];

  const colClass = columns === 2 ? 'grid-cols-1 md:grid-cols-2' : columns === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3';

  return (
    <div id={id || 'services'} className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{headline}</h3>
        <p className="text-xs sm:text-sm text-slate-500">{subheading}</p>
      </div>

      <div className={`grid ${colClass} gap-6`}>
        {services.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all space-y-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-slate-900">{s.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. WHY CHOOSE US
// ─────────────────────────────────────────────────────────────────────────────

export interface WhyChooseUsProps {
  id?: string;
  headline?: string;
  point1Title?: string;
  point1Desc?: string;
  point2Title?: string;
  point2Desc?: string;
  point3Title?: string;
  point3Desc?: string;
}

export function WhyChooseUs({
  id = 'about',
  headline = 'Why Thousands Choose Our Brand',
  point1Title = '100% Genuine Proven Quality',
  point1Desc = 'We source directly with strict batch controls and verifiable authenticity standards.',
  point2Title = 'Neighborhood Storefront Presence',
  point2Desc = 'Real physical locations you can visit, inspect, and experience in person.',
  point3Title = 'Transparent Pricing & Fast Support',
  point3Desc = 'No hidden markups. Live store staff standing by to support orders over phone and chat.',
}: WhyChooseUsProps) {
  const points = [
    { title: point1Title, desc: point1Desc },
    { title: point2Title, desc: point2Desc },
    { title: point3Title, desc: point3Desc },
  ];

  return (
    <div id={id || 'about'} className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 scroll-mt-20">
      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center tracking-tight">
        {headline}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {points.map((p, i) => (
          <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">{p.title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEAM MEMBERS
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamGridProps {
  id?: string;
  headline?: string;
  subheading?: string;
  member1Name?: string;
  member1Role?: string;
  member1Image?: string;
  member2Name?: string;
  member2Role?: string;
  member2Image?: string;
  member3Name?: string;
  member3Role?: string;
  member3Image?: string;
}

export function TeamGrid({
  headline = 'Meet Our Leadership & Store Curators',
  subheading = 'Passionate experts dedicated to authentic products and outstanding customer care.',
  member1Name = 'Ahmed Al-Mansoor',
  member1Role = 'Founder & Master Curator',
  member1Image = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  member2Name = 'Fatima Zahra',
  member2Role = 'Head of Store Operations',
  member2Image = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
  member3Name = 'Tariq Hussain',
  member3Role = 'Customer Experience Lead',
  member3Image = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
}: TeamGridProps) {
  const members = [
    { name: member1Name, role: member1Role, img: member1Image },
    { name: member2Name, role: member2Role, img: member2Image },
    { name: member3Name, role: member3Role, img: member3Image },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{headline}</h3>
        <p className="text-xs sm:text-sm text-slate-500">{subheading}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {members.map((m, i) => (
          <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-2xs">
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-2 border-indigo-100 shadow-sm">
              <img src={m.img} alt={m.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">{m.name}</div>
              <div className="text-xs text-indigo-600 font-medium">{m.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PRICING CARDS
// ─────────────────────────────────────────────────────────────────────────────

export interface PricingCardsProps {
  id?: string;
  headline?: string;
  tier1Name?: string;
  tier1Price?: string;
  tier1Features?: string;
  tier2Name?: string;
  tier2Price?: string;
  tier2Features?: string;
  tier2Badge?: string;
  tier3Name?: string;
  tier3Price?: string;
  tier3Features?: string;
  buttonText?: string;
}

export function PricingCards({
  headline = 'Simple, Transparent Pricing Packages',
  tier1Name = 'Starter Bundle',
  tier1Price = '$29',
  tier1Features = 'Single location delivery,Standard packaging,Email support',
  tier2Name = 'Popular Pack',
  tier2Price = '$59',
  tier2Features = 'Express priority dispatch,Gift wrapping included,WhatsApp VIP support,Free returns',
  tier2Badge = 'BEST VALUE',
  tier3Name = 'Enterprise / Bulk',
  tier3Price = '$149',
  tier3Features = 'Bulk wholesale rates,Dedicated account rep,Custom branding options,Direct invoice billing',
  buttonText = 'Choose Option',
}: PricingCardsProps) {
  const tiers = [
    { name: tier1Name, price: tier1Price, features: tier1Features.split(','), highlight: false },
    { name: tier2Name, price: tier2Price, features: tier2Features.split(','), highlight: true, badge: tier2Badge },
    { name: tier3Name, price: tier3Price, features: tier3Features.split(','), highlight: false },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center tracking-tight">
        {headline}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {tiers.map((t, i) => (
          <div
            key={i}
            className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
              t.highlight
                ? 'bg-slate-900 text-white shadow-xl border-2 border-indigo-500 scale-105'
                : 'bg-white text-slate-900 border border-slate-200 shadow-2xs'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{t.name}</span>
                {t.badge && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                    {t.badge}
                  </span>
                )}
              </div>

              <div className="text-3xl sm:text-4xl font-black tracking-tight">{t.price}</div>

              <div className="space-y-2 pt-2 border-t border-slate-200/40 text-xs">
                {t.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${t.highlight ? 'text-indigo-400' : 'text-emerald-600'}`} />
                    <span className={t.highlight ? 'text-slate-300' : 'text-slate-600'}>{feat.trim()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                  t.highlight
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                {buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROCESS STEPS
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcessStepsProps {
  id?: string;
  headline?: string;
  step1Title?: string;
  step1Desc?: string;
  step2Title?: string;
  step2Desc?: string;
  step3Title?: string;
  step3Desc?: string;
}

export function ProcessSteps({
  headline = 'How It Works in 3 Simple Steps',
  step1Title = '1. Browse Local Catalog',
  step1Desc = 'Select authentic products online or check in-stock availability at your branch.',
  step2Title = '2. Order or Visit Store',
  step2Desc = 'Confirm via WhatsApp chat, online checkout, or visit our physical counters.',
  step3Title = '3. Enjoy Fast Fulfillment',
  step3Desc = 'Take home same-day or have your package delivered to your doorstep.',
}: ProcessStepsProps) {
  const steps = [
    { title: step1Title, desc: step1Desc },
    { title: step2Title, desc: step2Desc },
    { title: step3Title, desc: step3Desc },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center tracking-tight">
        {headline}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((st, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 relative">
            <span className="text-2xl font-black text-indigo-200">{idx + 1}</span>
            <h4 className="font-bold text-sm text-slate-900">{st.title}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
