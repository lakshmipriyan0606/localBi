'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronsLeft, ChevronsRight, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { browserClient } from '@/lib/http/browser-client';
import { useTenantContext } from '@/providers/tenant-context';
import { cn } from '@/lib/cn';

interface WebsiteStudioSidebarFooterProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function WebsiteStudioSidebarFooter({
  isCollapsed = false,
  onToggleCollapse,
}: WebsiteStudioSidebarFooterProps) {
  const router = useRouter();
  const tenantCtx = useTenantContext();
  const user = tenantCtx?.user;

  const handleSignOut = async () => {
    try {
      await browserClient.post('/auth/logout');
    } finally {
      router.push('/login');
    }
  };

  const displayName = user?.fullName || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  if (isCollapsed) {
    return (
      <div className="p-2 border-t border-slate-100 flex flex-col items-center gap-2">
        {/* User Avatar */}
        <div
          title={`${displayName} (${user?.email || ''})`}
          className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center ring-1 ring-slate-200"
        >
          {initials}
        </div>

        {/* Expand Sidebar Toggle Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand Sidebar"
            aria-label="Expand Sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-2">
      {/* ── User Information Card ── */}
      {user && (
        <div className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="min-w-0 pr-1">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-400 truncate font-mono">
                {user.email}
              </div>
            </div>
          </div>

          <Badge
            variant="secondary"
            className="py-0 px-1.5 text-[9px] capitalize font-semibold shrink-0 bg-white border-slate-200 text-slate-700"
          >
            {user.role.replace(/_/g, ' ').toLowerCase()}
          </Badge>
        </div>
      )}

      {/* ── Footer Actions: Collapse & Sign Out ── */}
      <div className="flex items-center justify-between pt-0.5">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
            <span>Collapse</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          id="website-studio-signout-btn"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer ml-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
