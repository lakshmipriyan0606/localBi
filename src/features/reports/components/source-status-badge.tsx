'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/shared/lib/formatters';

export type ConnectionState =
  | 'connected'     // Active and recently synced (< 48h)
  | 'stale'         // Connected but data is old (> 48h)
  | 'disconnected'  // No active connection
  | 'error'         // Connection exists but has a known error
  | 'syncing';      // Currently performing a sync

export interface SourceConnection {
  provider: 'GBP' | 'GSC';
  state: ConnectionState;
  /** ISO timestamp of the last successful data sync */
  lastSyncedAt?: string | null;
  /** Human-readable error message if state === 'error' */
  errorMessage?: string | null;
}

const STATE_CONFIG: Record<
  ConnectionState,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  connected: {
    icon: CheckCircle2,
    label: 'Connected',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200/60',
  },
  stale: {
    icon: Clock,
    label: 'Stale Data',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200/60',
  },
  disconnected: {
    icon: XCircle,
    label: 'Not Connected',
    colorClass: 'text-slate-500',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
  },
  error: {
    icon: AlertCircle,
    label: 'Connection Error',
    colorClass: 'text-red-700',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200/60',
  },
  syncing: {
    icon: Loader2,
    label: 'Syncing',
    colorClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200/60',
  },
};

interface SourceStatusBadgeProps {
  connections: SourceConnection[];
  className?: string;
}

/**
 * Derives a connection status label from REAL integration state — never hardcoded.
 * Shows per-source status when multiple connections are present.
 *
 * The old static "GBP & GSC Verified" badge has been replaced with this component.
 * It requires actual connection data to render meaningfully.
 */
export function SourceStatusBadge({ connections, className }: SourceStatusBadgeProps) {
  if (connections.length === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
          'bg-slate-50 border-slate-200 text-slate-500',
          className
        )}
      >
        <XCircle className="h-3 w-3" />
        No Sources Connected
      </span>
    );
  }

  // If all connections are "connected", show a combined badge
  const allConnected = connections.every((c) => c.state === 'connected');
  if (allConnected && connections.length > 1) {
    const providers = connections.map((c) => c.provider).join(' & ');
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
          'bg-emerald-50 border-emerald-200/60 text-emerald-700',
          className
        )}
        title={connections.map((c) => `${c.provider}: last synced ${formatRelativeTime(c.lastSyncedAt)}`).join('\n')}
      >
        <CheckCircle2 className="h-3 w-3" />
        {providers} Connected
      </span>
    );
  }

  // Show individual source badges
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {connections.map((conn) => {
        const config = STATE_CONFIG[conn.state];
        const Icon = conn.state === 'syncing' ? Loader2 : config.icon;

        return (
          <span
            key={conn.provider}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              config.bgClass,
              config.borderClass,
              config.colorClass
            )}
            title={
              conn.lastSyncedAt
                ? `${conn.provider}: last synced ${formatRelativeTime(conn.lastSyncedAt)}`
                : conn.errorMessage || undefined
            }
          >
            <Icon
              className={cn(
                'h-3 w-3',
                conn.state === 'syncing' && 'animate-spin'
              )}
            />
            {conn.provider}: {config.label}
          </span>
        );
      })}
    </div>
  );
}
