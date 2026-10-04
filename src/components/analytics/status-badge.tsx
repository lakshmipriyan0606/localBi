'use client';

import React from 'react';

export type StatusType =
  | 'ACTIVE'
  | 'CONNECTED'
  | 'SYNCED'
  | 'PUBLISHED'
  | 'STALE'
  | 'PENDING'
  | 'PARTIAL'
  | 'NEEDS_REVIEW'
  | 'ERROR'
  | 'FAILED'
  | 'DISCONNECTED'
  | 'DRAFT'
  | 'PAUSED'
  | 'ARCHIVED';

export interface StatusBadgeProps {
  status: StatusType | string;
  customLabel?: string;
  className?: string;
}

export function StatusBadge({ status, customLabel, className = '' }: StatusBadgeProps) {
  const norm = (status || '').toUpperCase();
  const label = customLabel || norm.replace(/_/g, ' ');

  let classes = 'bg-slate-100 text-slate-700 border-slate-200'; // Default Neutral

  if (['ACTIVE', 'CONNECTED', 'SYNCED', 'PUBLISHED'].includes(norm)) {
    // Success
    classes = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['STALE', 'PENDING', 'PARTIAL', 'NEEDS_REVIEW'].includes(norm)) {
    // Warning
    classes = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['ERROR', 'FAILED', 'DISCONNECTED'].includes(norm)) {
    // Danger
    classes = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${classes} ${className}`}
    >
      {label}
    </span>
  );
}
