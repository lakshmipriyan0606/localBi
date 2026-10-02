'use client';

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
