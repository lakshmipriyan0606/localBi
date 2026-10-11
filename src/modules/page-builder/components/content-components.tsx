'use client';

import React, { useState } from 'react';

export interface RichTextProps {
  id?: string;
  content?: string;
  alignment?: 'left' | 'center' | 'right';
}

function sanitizeText(raw: string): string {
  if (!raw) return '';
  // Basic sanitization: strip script tags, dangerous handlers, javascript: URLs
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

export function RichText({
  content = '<p>Welcome to our storefront. Explore our latest announcements, local highlights, and authentic catalog selections.</p>',
  alignment = 'left',
}: RichTextProps) {
  const safeContent = sanitizeText(content);

  const alignClass =
    alignment === 'center'
      ? 'text-center'
      : alignment === 'right'
      ? 'text-right'
      : 'text-left';

  return (
    <div
      className={`prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed ${alignClass}`}
      dangerouslySetInnerHTML={{ __html: safeContent }}
    />
  );
}

export interface ImageBlockProps {
  id?: string;
  imageUrl?: string;
  altText?: string;
  caption?: string;
  aspectRatio?: 'auto' | '16:9' | '4:3' | '1:1';
}

export function ImageBlock({
  imageUrl = 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
  altText = 'Storefront presentation image',
  caption,
  aspectRatio = '16:9',
}: ImageBlockProps) {
  const aspectClass =
    aspectRatio === '16:9'
      ? 'aspect-video'
      : aspectRatio === '4:3'
      ? 'aspect-4/3'
      : aspectRatio === '1:1'
      ? 'aspect-square'
      : 'aspect-auto';

  return (
    <figure className="space-y-2">
      <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${aspectClass}`}>
        <img
          src={imageUrl}
          alt={altText}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      {caption && (
        <figcaption className="text-xs text-center text-slate-400 italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export interface BannerProps {
  id?: string;
  badge?: string;
  headline?: string;
  subheading?: string;
}

export function Banner({
  badge = 'Limited Edition',
  headline = 'Discover Exclusive In-Store Selections',
  subheading = 'Visit our verified location for personalized consultations and limited catalog drops.',
}: BannerProps) {
  return (
    <div
      className="rounded-3xl p-8 sm:p-12 text-white shadow-sm space-y-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6"
      style={{ backgroundColor: 'var(--brand-primary, #4F46E5)' }}
    >
      <div className="space-y-2 max-w-2xl">
        <span
          className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-slate-900"
          style={{ backgroundColor: 'var(--brand-accent, #F59E0B)' }}
        >
          {badge}
        </span>
        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {headline}
        </h3>
        <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
          {subheading}
        </p>
      </div>
    </div>
  );
}

export interface SpacerProps {
  id?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Spacer({ size = 'md' }: SpacerProps) {
  const heightClass =
    size === 'sm'
      ? 'h-6'
      : size === 'lg'
      ? 'h-16'
      : size === 'xl'
      ? 'h-24'
      : 'h-10';

  return <div className={`w-full ${heightClass}`} aria-hidden="true" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. HEADING (Standalone Typography)
// ─────────────────────────────────────────────────────────────────────────────

export interface HeadingProps {
  id?: string;
  text?: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4';
  alignment?: 'left' | 'center' | 'right';
  gradientText?: boolean;
}

export function Heading({
  text = 'Captivating Headline Text',
  level = 'h2',
  alignment = 'left',
  gradientText = false,
}: HeadingProps) {
  const alignClass = alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left';
  const gradClass = gradientText ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-900 bg-clip-text text-transparent' : 'text-slate-900';

  if (level === 'h1') {
    return <h1 className={`text-3xl sm:text-5xl font-black tracking-tight leading-tight my-4 ${alignClass} ${gradClass}`}>{text}</h1>;
  }
  if (level === 'h3') {
    return <h3 className={`text-xl sm:text-2xl font-bold tracking-tight my-3 ${alignClass} ${gradClass}`}>{text}</h3>;
  }
  if (level === 'h4') {
    return <h4 className={`text-lg sm:text-xl font-bold my-2 ${alignClass} ${gradClass}`}>{text}</h4>;
  }
  return <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight leading-snug my-3 ${alignClass} ${gradClass}`}>{text}</h2>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PARAGRAPH
// ─────────────────────────────────────────────────────────────────────────────

export interface ParagraphProps {
  id?: string;
  text?: string;
  size?: 'small' | 'normal' | 'lead';
  alignment?: 'left' | 'center' | 'right';
}

export function Paragraph({
  text = 'This is a clean, readable content paragraph providing essential details and engaging narrative for your visitors.',
  size = 'normal',
  alignment = 'left',
}: ParagraphProps) {
  const sizeClass = size === 'small' ? 'text-xs' : size === 'lead' ? 'text-base sm:text-lg text-slate-600' : 'text-sm text-slate-600';
  const alignClass = alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left';

  return <p className={`leading-relaxed my-2 max-w-3xl ${sizeClass} ${alignClass}`}>{text}</p>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. IMAGE GALLERY (Multi-Image Grid)
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageGalleryProps {
  id?: string;
  image1?: string;
  image2?: string;
  image3?: string;
  columns?: 2 | 3;
}

export function ImageGallery({
  image1 = 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80',
  image2 = 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
  image3 = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  columns = 3,
}: ImageGalleryProps) {
  const images = columns === 2 ? [image1, image2] : [image1, image2, image3];
  const colClass = columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3';

  return (
    <div className={`grid ${colClass} gap-4 my-6 w-full`}>
      {images.map((img, idx) => (
        <div key={idx} className="rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 border border-slate-200 shadow-2xs group">
          <img src={img} alt="Gallery" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. VIDEO EMBED
// ─────────────────────────────────────────────────────────────────────────────

export interface VideoEmbedProps {
  id?: string;
  videoUrl?: string;
  title?: string;
}

export function VideoEmbed({
  videoUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  title = 'Featured Video',
}: VideoEmbedProps) {
  // Safe embed url extraction
  let safeEmbed = videoUrl;
  if (videoUrl.includes('watch?v=')) {
    safeEmbed = videoUrl.replace('watch?v=', 'embed/');
  }

  return (
    <div className="w-full my-6 max-w-4xl mx-auto">
      <div className="relative aspect-video rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-950">
        <iframe
          src={safeEmbed}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ICON GRID
// ─────────────────────────────────────────────────────────────────────────────

export interface IconGridProps {
  id?: string;
  item1Title?: string;
  item1Desc?: string;
  item2Title?: string;
  item2Desc?: string;
  item3Title?: string;
  item3Desc?: string;
}

export function IconGrid({
  item1Title = 'Fast Fulfillment',
  item1Desc = 'Dispatched rapidly from verified neighborhood branches.',
  item2Title = '100% Genuine',
  item2Desc = 'Certified authenticity directly from official producers.',
  item3Title = 'Expert Consultation',
  item3Desc = 'Speak with our knowledgeable store staff anytime.',
}: IconGridProps) {
  const items = [
    { title: item1Title, desc: item1Desc },
    { title: item2Title, desc: item2Desc },
    { title: item3Title, desc: item3Desc },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 w-full">
      {items.map((it, idx) => (
        <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            ✓
          </div>
          <h4 className="font-bold text-sm text-slate-900">{it.title}</h4>
          <p className="text-xs text-slate-600 leading-relaxed">{it.desc}</p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. FAQ ACCORDION
// ─────────────────────────────────────────────────────────────────────────────

export interface FAQAccordionProps {
  id?: string;
  headline?: string;
  q1?: string;
  a1?: string;
  q2?: string;
  a2?: string;
  q3?: string;
  a3?: string;
}

export function FAQAccordion({
  headline = 'Frequently Asked Questions',
  q1 = 'What are your standard store operating hours?',
  a1 = 'Most of our branches operate Monday through Saturday from 10:00 AM to 9:30 PM, with Sunday timings from 11:00 AM to 8:00 PM.',
  q2 = 'Can I place an order for in-store pickup?',
  a2 = 'Yes, you can browse our catalog online and message our store directly on WhatsApp to prepare your order for pickup.',
  q3 = 'Do you offer authentic quality guarantees?',
  a3 = 'All products across our catalog are 100% genuine and verified directly with manufacturer batch records.',
}: FAQAccordionProps) {
  const faqs = [
    { q: q1, a: a1 },
    { q: q2, a: a2 },
    { q: q3, a: a3 },
  ];

  return (
    <div className="py-10 max-w-3xl mx-auto w-full space-y-6">
      <h3 className="text-2xl font-bold text-slate-900 text-center tracking-tight">{headline}</h3>
      <div className="space-y-3">
        {faqs.map((f, idx) => (
          <details key={idx} className="group p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs transition-all">
            <summary className="font-bold text-sm text-slate-900 cursor-pointer list-none flex items-center justify-between">
              <span>{f.q}</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-xs text-slate-600 leading-relaxed pt-3 border-t border-slate-100 mt-3">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. TABS (Tabbed Content Switcher)
// ─────────────────────────────────────────────────────────────────────────────

export interface TabsProps {
  id?: string;
  tab1Label?: string;
  tab1Content?: string;
  tab2Label?: string;
  tab2Content?: string;
  tab3Label?: string;
  tab3Content?: string;
}

export function Tabs({
  tab1Label = 'Store Overview',
  tab1Content = 'Welcome to our verified branch. Experience personalized customer service and exclusive in-store collections.',
  tab2Label = 'Pickup & Delivery',
  tab2Content = 'We offer same-day express local delivery or 15-minute quick in-store counter pickups.',
  tab3Label = 'Quality Guarantee',
  tab3Content = 'Every batch is inspected for authenticity, high longevity, and compliant production standards.',
}: TabsProps) {
  const [active, setActive] = useState(0);
  const tabList = [
    { label: tab1Label, content: tab1Content },
    { label: tab2Label, content: tab2Content },
    { label: tab3Label, content: tab3Content },
  ];

  return (
    <div className="py-6 max-w-3xl mx-auto w-full space-y-4">
      <div className="flex border-b border-slate-200 gap-2">
        {tabList.map((t, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActive(idx)}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              active === idx ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
        {tabList[active]?.content || ''}
      </div>
    </div>
  );
}

