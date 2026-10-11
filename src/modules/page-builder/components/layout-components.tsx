'use client';

import React from 'react';
import { DropZone } from '@measured/puck';

/**
 * Helper to safely render either a Puck slot component, a React node, or a DropZone fallback.
 */
function renderSlotContent(SlotProp: any, zoneName: string) {
  if (typeof SlotProp === 'function') {
    const SlotComponent = SlotProp;
    return <SlotComponent />;
  }
  if (React.isValidElement(SlotProp)) {
    return SlotProp;
  }
  if (Array.isArray(SlotProp)) {
    return <>{SlotProp}</>;
  }
  return <DropZone zone={zoneName} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. COLUMNS (Row & Multi-Column Drag & Drop Layout)
// ─────────────────────────────────────────────────────────────────────────────

export interface ColumnsProps {
  id?: string;
  layout?: '2-equal' | '2-wide-left' | '2-wide-right' | '3-equal' | '4-equal';
  gap?: 'none' | 'small' | 'medium' | 'large' | 'xlarge';
  align?: 'top' | 'center' | 'bottom' | 'stretch';
  stackOnMobile?: boolean;
  background?: 'transparent' | 'white' | 'slate-50' | 'slate-900';
  padding?: 'none' | 'small' | 'medium' | 'large';
  borderRadius?: 'none' | 'small' | 'medium' | 'large';
  column1?: any;
  column2?: any;
  column3?: any;
  column4?: any;
}

export function Columns({
  layout = '2-equal',
  gap = 'medium',
  align = 'top',
  stackOnMobile = true,
  background = 'transparent',
  padding = 'none',
  borderRadius = 'none',
  column1,
  column2,
  column3,
  column4,
}: ColumnsProps) {
  // Grid layout & proportions
  const gridLayoutClass = (() => {
    switch (layout) {
      case '2-wide-left':
        return stackOnMobile ? 'grid-cols-1 md:grid-cols-[2fr_1fr]' : 'grid-cols-[2fr_1fr]';
      case '2-wide-right':
        return stackOnMobile ? 'grid-cols-1 md:grid-cols-[1fr_2fr]' : 'grid-cols-[1fr_2fr]';
      case '3-equal':
        return stackOnMobile ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-3';
      case '4-equal':
        return stackOnMobile ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-4';
      case '2-equal':
      default:
        return stackOnMobile ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2';
    }
  })();

  const gapClass =
    gap === 'none'
      ? 'gap-0'
      : gap === 'small'
      ? 'gap-3 sm:gap-4'
      : gap === 'large'
      ? 'gap-8 sm:gap-10'
      : gap === 'xlarge'
      ? 'gap-10 sm:gap-12'
      : 'gap-5 sm:gap-6';

  const alignClass =
    align === 'center'
      ? 'items-center'
      : align === 'bottom'
      ? 'items-end'
      : align === 'stretch'
      ? 'items-stretch'
      : 'items-start';

  const bgClass =
    background === 'white'
      ? 'bg-white shadow-2xs'
      : background === 'slate-50'
      ? 'bg-slate-50/80 border border-slate-100'
      : background === 'slate-900'
      ? 'bg-slate-900 text-white'
      : 'bg-transparent';

  const paddingClass =
    padding === 'none'
      ? 'p-0'
      : padding === 'small'
      ? 'py-4 px-3 sm:px-4'
      : padding === 'large'
      ? 'py-12 sm:py-16 px-6 sm:px-8'
      : 'py-6 sm:py-8 px-4 sm:px-6';

  const radiusClass =
    borderRadius === 'small'
      ? 'rounded-lg'
      : borderRadius === 'medium'
      ? 'rounded-2xl'
      : borderRadius === 'large'
      ? 'rounded-3xl'
      : 'rounded-none';

  const isThreeCols = layout === '3-equal';
  const isFourCols = layout === '4-equal';

  return (
    <div className={`w-full ${bgClass} ${paddingClass} ${radiusClass}`}>
      <div className={`grid w-full ${gridLayoutClass} ${gapClass} ${alignClass}`}>
        {/* Column 1 */}
        <div className="min-w-0 w-full flex flex-col">
          {renderSlotContent(column1, 'column1')}
        </div>

        {/* Column 2 */}
        <div className="min-w-0 w-full flex flex-col">
          {renderSlotContent(column2, 'column2')}
        </div>

        {/* Column 3 (Optional) */}
        {(isThreeCols || isFourCols) && (
          <div className="min-w-0 w-full flex flex-col">
            {renderSlotContent(column3, 'column3')}
          </div>
        )}

        {/* Column 4 (Optional) */}
        {isFourCols && (
          <div className="min-w-0 w-full flex flex-col">
            {renderSlotContent(column4, 'column4')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CARDBOX (Card Container Drag & Drop)
// ─────────────────────────────────────────────────────────────────────────────

export interface CardBoxProps {
  id?: string;
  background?: 'white' | 'slate-50' | 'slate-900' | 'transparent';
  border?: 'none' | 'subtle' | 'accent';
  shadow?: 'none' | 'small' | 'medium' | 'large';
  padding?: 'none' | 'small' | 'medium' | 'large';
  radius?: 'none' | 'small' | 'medium' | 'large';
  content?: any;
}

export function CardBox({
  background = 'white',
  border = 'subtle',
  shadow = 'small',
  padding = 'medium',
  radius = 'medium',
  content,
}: CardBoxProps) {
  const bgClass =
    background === 'slate-50'
      ? 'bg-slate-50'
      : background === 'slate-900'
      ? 'bg-slate-900 text-white'
      : background === 'transparent'
      ? 'bg-transparent'
      : 'bg-white';

  const borderClass =
    border === 'subtle'
      ? 'border border-slate-200/80'
      : border === 'accent'
      ? 'border-2 border-indigo-500/20'
      : 'border-0';

  const shadowClass =
    shadow === 'none'
      ? 'shadow-none'
      : shadow === 'medium'
      ? 'shadow-md'
      : shadow === 'large'
      ? 'shadow-xl'
      : 'shadow-2xs';

  const paddingClass =
    padding === 'none'
      ? 'p-0'
      : padding === 'small'
      ? 'p-4'
      : padding === 'large'
      ? 'p-8 sm:p-10'
      : 'p-6';

  const radiusClass =
    radius === 'none'
      ? 'rounded-none'
      : radius === 'small'
      ? 'rounded-lg'
      : radius === 'large'
      ? 'rounded-3xl'
      : 'rounded-2xl';

  return (
    <div className={`w-full transition-all ${bgClass} ${borderClass} ${shadowClass} ${paddingClass} ${radiusClass}`}>
      {renderSlotContent(content, 'content')}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SECTION (Full-Width Section Container)
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionProps {
  id?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  background?: 'transparent' | 'white' | 'slate-50' | 'slate-900';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  children?: React.ReactNode;
  content?: any;
}

export function Section({
  padding = 'medium',
  background = 'transparent',
  maxWidth = 'xl',
  children,
  content,
}: SectionProps) {
  const paddingClass =
    padding === 'none'
      ? 'py-0'
      : padding === 'small'
      ? 'py-6 sm:py-8'
      : padding === 'large'
      ? 'py-16 sm:py-24'
      : 'py-10 sm:py-16';

  const bgClass =
    background === 'white'
      ? 'bg-white'
      : background === 'slate-50'
      ? 'bg-slate-50'
      : background === 'slate-900'
      ? 'bg-slate-900 text-white'
      : 'bg-transparent';

  const maxWClass =
    maxWidth === 'sm'
      ? 'max-w-3xl'
      : maxWidth === 'md'
      ? 'max-w-5xl'
      : maxWidth === 'lg'
      ? 'max-w-6xl'
      : maxWidth === 'xl'
      ? 'max-w-7xl'
      : maxWidth === '2xl'
      ? 'max-w-screen-2xl'
      : 'max-w-none';

  return (
    <section className={`w-full ${paddingClass} ${bgClass}`}>
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${maxWClass}`}>
        {children || renderSlotContent(content, 'content')}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONTAINER (Centered Content Container)
// ─────────────────────────────────────────────────────────────────────────────

export interface ContainerProps {
  id?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children?: React.ReactNode;
  content?: any;
}

export function Container({ maxWidth = 'xl', children, content }: ContainerProps) {
  const maxWClass =
    maxWidth === 'sm'
      ? 'max-w-3xl'
      : maxWidth === 'md'
      ? 'max-w-5xl'
      : maxWidth === 'lg'
      ? 'max-w-6xl'
      : maxWidth === 'xl'
      ? 'max-w-7xl'
      : 'max-w-none';

  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 w-full ${maxWClass}`}>
      {children || renderSlotContent(content, 'content')}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SPACER (Vertical Gap)
// ─────────────────────────────────────────────────────────────────────────────

export interface SpacerProps {
  id?: string;
  height?: 'small' | 'medium' | 'large' | 'xlarge';
}

export function Spacer({ height = 'medium' }: SpacerProps) {
  const hClass =
    height === 'small'
      ? 'h-4 sm:h-6'
      : height === 'medium'
      ? 'h-8 sm:h-12'
      : height === 'large'
      ? 'h-16 sm:h-20'
      : 'h-24 sm:h-32';

  return <div className={`w-full ${hClass}`} aria-hidden="true" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MULTI-COLUMN GRID
// ─────────────────────────────────────────────────────────────────────────────

export interface MultiColumnGridProps {
  id?: string;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: 'none' | 'small' | 'medium' | 'large' | 'xlarge';
  content?: any;
  children?: React.ReactNode;
}

export function MultiColumnGrid({
  columns = 3,
  gap = 'medium',
  content,
  children,
}: MultiColumnGridProps) {
  const colClass = (() => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
      case 6:
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';
      case 3:
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  })();

  const gapClass =
    gap === 'none'
      ? 'gap-0'
      : gap === 'small'
      ? 'gap-3 sm:gap-4'
      : gap === 'large'
      ? 'gap-8 sm:gap-10'
      : gap === 'xlarge'
      ? 'gap-12 sm:gap-16'
      : 'gap-6';

  return (
    <div className={`grid ${colClass} ${gapClass} w-full`}>
      {children || renderSlotContent(content, 'content')}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. FLEX LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

export interface FlexLayoutProps {
  id?: string;
  direction?: 'row' | 'column';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  align?: 'start' | 'center' | 'end' | 'stretch';
  wrap?: boolean;
  gap?: 'none' | 'small' | 'medium' | 'large';
  content?: any;
  children?: React.ReactNode;
}

export function FlexLayout({
  direction = 'row',
  justify = 'start',
  align = 'center',
  wrap = true,
  gap = 'medium',
  content,
  children,
}: FlexLayoutProps) {
  const dirClass = direction === 'column' ? 'flex-col' : 'flex-row';
  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';

  const justifyClass =
    justify === 'center'
      ? 'justify-center'
      : justify === 'end'
      ? 'justify-end'
      : justify === 'between'
      ? 'justify-between'
      : justify === 'around'
      ? 'justify-around'
      : 'justify-start';

  const alignClass =
    align === 'start'
      ? 'items-start'
      : align === 'end'
      ? 'items-end'
      : align === 'stretch'
      ? 'items-stretch'
      : 'items-center';

  const gapClass =
    gap === 'none'
      ? 'gap-0'
      : gap === 'small'
      ? 'gap-3'
      : gap === 'large'
      ? 'gap-8'
      : 'gap-5';

  return (
    <div className={`flex ${dirClass} ${wrapClass} ${justifyClass} ${alignClass} ${gapClass} w-full`}>
      {children || renderSlotContent(content, 'content')}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. DIVIDER
// ─────────────────────────────────────────────────────────────────────────────

export interface DividerProps {
  id?: string;
  style?: 'solid' | 'dashed' | 'gradient';
  color?: 'subtle' | 'slate' | 'indigo';
  thickness?: 'thin' | 'medium' | 'thick';
  badgeText?: string;
}

export function Divider({
  style = 'solid',
  color = 'subtle',
  thickness = 'thin',
  badgeText = '',
}: DividerProps) {
  const borderHeight = thickness === 'thick' ? 'border-t-4' : thickness === 'medium' ? 'border-t-2' : 'border-t';
  const borderStyle = style === 'dashed' ? 'border-dashed' : 'border-solid';

  const borderColor =
    color === 'indigo'
      ? 'border-indigo-400/50'
      : color === 'slate'
      ? 'border-slate-300'
      : 'border-slate-200/80';

  if (style === 'gradient') {
    return (
      <div className="relative my-8 w-full flex items-center justify-center">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
        {badgeText && (
          <span className="absolute px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-white border border-indigo-100 rounded-full shadow-2xs">
            {badgeText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="relative my-6 sm:my-8 w-full flex items-center justify-center">
      <div className={`w-full ${borderHeight} ${borderStyle} ${borderColor}`} />
      {badgeText && (
        <span className="absolute px-3 py-0.5 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-full">
          {badgeText}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. TWO-COLUMN LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

export interface TwoColumnLayoutProps {
  id?: string;
  ratio?: '50-50' | '60-40' | '40-60' | '70-30' | '30-70';
  gap?: 'small' | 'medium' | 'large';
  stackOnMobile?: boolean;
  column1?: any;
  column2?: any;
}

export function TwoColumnLayout({
  ratio = '50-50',
  gap = 'medium',
  stackOnMobile = true,
  column1,
  column2,
}: TwoColumnLayoutProps) {
  const gridClass = (() => {
    switch (ratio) {
      case '60-40':
        return stackOnMobile ? 'grid-cols-1 md:grid-cols-[3fr_2fr]' : 'grid-cols-[3fr_2fr]';
      case '40-60':
        return stackOnMobile ? 'grid-cols-1 md:grid-cols-[2fr_3fr]' : 'grid-cols-[2fr_3fr]';
      case '70-30':
        return stackOnMobile ? 'grid-cols-1 md:grid-cols-[7fr_3fr]' : 'grid-cols-[7fr_3fr]';
      case '30-70':
        return stackOnMobile ? 'grid-cols-1 md:grid-cols-[3fr_7fr]' : 'grid-cols-[3fr_7fr]';
      case '50-50':
      default:
        return stackOnMobile ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2';
    }
  })();

  const gapClass = gap === 'small' ? 'gap-4' : gap === 'large' ? 'gap-10 sm:gap-12' : 'gap-6 sm:gap-8';

  return (
    <div className={`grid ${gridClass} ${gapClass} w-full items-start`}>
      <div className="w-full min-h-[50px]">{renderSlotContent(column1, 'column1')}</div>
      <div className="w-full min-h-[50px]">{renderSlotContent(column2, 'column2')}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. THREE-COLUMN LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

export interface ThreeColumnLayoutProps {
  id?: string;
  gap?: 'small' | 'medium' | 'large';
  stackOnMobile?: boolean;
  column1?: any;
  column2?: any;
  column3?: any;
}

export function ThreeColumnLayout({
  gap = 'medium',
  stackOnMobile = true,
  column1,
  column2,
  column3,
}: ThreeColumnLayoutProps) {
  const gapClass = gap === 'small' ? 'gap-4' : gap === 'large' ? 'gap-10' : 'gap-6';
  const gridClass = stackOnMobile ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-3';

  return (
    <div className={`grid ${gridClass} ${gapClass} w-full items-start`}>
      <div className="w-full min-h-[50px]">{renderSlotContent(column1, 'column1')}</div>
      <div className="w-full min-h-[50px]">{renderSlotContent(column2, 'column2')}</div>
      <div className="w-full min-h-[50px]">{renderSlotContent(column3, 'column3')}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. FULL-WIDTH SECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface FullWidthSectionProps {
  id?: string;
  backgroundGradient?: 'none' | 'indigo' | 'slate-dark' | 'emerald';
  backgroundImage?: string;
  overlayOpacity?: number;
  padding?: 'small' | 'medium' | 'large' | 'xlarge';
  content?: any;
  children?: React.ReactNode;
}

export function FullWidthSection({
  backgroundGradient = 'none',
  backgroundImage = '',
  overlayOpacity = 40,
  padding = 'medium',
  content,
  children,
}: FullWidthSectionProps) {
  const paddingClass =
    padding === 'small'
      ? 'py-8 sm:py-12'
      : padding === 'large'
      ? 'py-20 sm:py-28'
      : padding === 'xlarge'
      ? 'py-28 sm:py-36'
      : 'py-14 sm:py-20';

  const gradientClass =
    backgroundGradient === 'indigo'
      ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white'
      : backgroundGradient === 'slate-dark'
      ? 'bg-gradient-to-b from-slate-900 to-slate-950 text-white'
      : backgroundGradient === 'emerald'
      ? 'bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 text-white'
      : 'bg-white text-slate-900';

  return (
    <section className={`relative w-full overflow-hidden ${paddingClass} ${gradientClass}`}>
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url("${backgroundImage}")`,
            opacity: overlayOpacity / 100,
          }}
        />
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children || renderSlotContent(content, 'content')}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. STICKY SECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface StickySectionProps {
  id?: string;
  topOffset?: number;
  background?: 'white' | 'blur' | 'transparent';
  content?: any;
  children?: React.ReactNode;
}

export function StickySection({
  topOffset = 0,
  background = 'blur',
  content,
  children,
}: StickySectionProps) {
  const bgClass =
    background === 'white'
      ? 'bg-white shadow-xs border-b border-slate-200'
      : background === 'blur'
      ? 'bg-white/90 backdrop-blur-md shadow-xs border-b border-slate-200/80'
      : 'bg-transparent';

  return (
    <div
      className={`sticky z-30 w-full transition-all ${bgClass}`}
      style={{ top: `${topOffset}px` }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {children || renderSlotContent(content, 'content')}
      </div>
    </div>
  );
}

