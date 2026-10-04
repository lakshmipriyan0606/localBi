'use client';

import React from 'react';

export interface SectionProps {
  id?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  background?: 'transparent' | 'white' | 'slate-50' | 'slate-900';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  children?: React.ReactNode;
}

export function Section({
  padding = 'medium',
  background = 'transparent',
  maxWidth = 'xl',
  children,
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
        {children}
      </div>
    </section>
  );
}

export interface ContainerProps {
  id?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children?: React.ReactNode;
}

export function Container({ maxWidth = 'xl', children }: ContainerProps) {
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
      {children}
    </div>
  );
}

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
