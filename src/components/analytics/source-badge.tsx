'use client';

import React from 'react';
import type { MetricSource } from '@/modules/reporting/metric-registry';

export interface SourceBadgeProps {
  source: MetricSource | string;
  className?: string;
  size?: 'sm' | 'md';
}

const SOURCE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  LOCALBI: {
    label: 'LocalBi',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  GSC: {
    label: 'Google Search Console',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  GA4: {
    label: 'Google Analytics 4',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  GBP: {
    label: 'Google Business Profile',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  LOCAL_RANK_PROVIDER: {
    label: 'Rank Provider',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  MERCHANT: {
    label: 'Merchant Center',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  TELEPHONY: {
    label: 'Telephony Virtual Numbers',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  DIRECTORY_PROVIDER: {
    label: 'Directory Listing',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
  BACKLINK_PROVIDER: {
    label: 'Backlink Provider',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export function SourceBadge({ source, className = '', size = 'sm' }: SourceBadgeProps) {
  const normSource = (source || '').toUpperCase();
  const cfg = SOURCE_CONFIG[normSource] || {
    label: source,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${sizeClass} ${className}`}
      title={`Data source provenance: ${cfg.label}`}
    >
      {cfg.label}
    </span>
  );
}
