'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { WebsiteStudioSidebarHeader } from './website-studio-sidebar-header';
import { WebsiteStudioNavigation } from './website-studio-navigation';
import { WebsiteStudioSidebarFooter } from './website-studio-sidebar-footer';

export interface WebsiteStudioSidebarProps {
  tenantSlug: string;
  brandId?: string;
  brandName?: string;
  isLive?: boolean;
  onOpenPublishModal?: () => void;
  onCloseMobile?: () => void;
  isMobile?: boolean;
}

export function WebsiteStudioSidebar({
  tenantSlug,
  brandId,
  brandName,
  isLive = false,
  onOpenPublishModal,
  onCloseMobile,
  isMobile = false,
}: WebsiteStudioSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Restore collapsed state from localStorage for desktop
  useEffect(() => {
    if (isMobile || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('localbi_studio_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // Ignore storage errors
    }
  }, [isMobile]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('localbi_studio_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const effectiveCollapsed = isMobile ? false : isCollapsed;

  return (
    <aside
      className={cn(
        'bg-white text-slate-800 flex flex-col shrink-0 min-h-screen border-r border-slate-200/90 transition-all duration-200 select-none',
        isMobile
          ? 'w-full h-full'
          : effectiveCollapsed
          ? 'w-[68px]'
          : 'w-64'
      )}
      aria-label="Website Studio Sidebar"
    >
      {/* ── 1. Sidebar Header ── */}
      <WebsiteStudioSidebarHeader
        tenantSlug={tenantSlug}
        isCollapsed={effectiveCollapsed}
        onNavigate={onCloseMobile}
        brandName={brandName}
        isLive={isLive}
      />

      {/* ── 2. Functional Navigation Groups ── */}
      <WebsiteStudioNavigation
        tenantSlug={tenantSlug}
        brandId={brandId}
        isCollapsed={effectiveCollapsed}
        onOpenPublishModal={onOpenPublishModal}
        onNavigate={onCloseMobile}
      />

      {/* ── 3. User & Settings Footer ── */}
      <WebsiteStudioSidebarFooter
        isCollapsed={effectiveCollapsed}
        onToggleCollapse={isMobile ? undefined : toggleCollapsed}
      />
    </aside>
  );
}
