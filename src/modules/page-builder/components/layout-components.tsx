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
