'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  getWebsiteStudioNavGroups,
  StudioNavGroup,
} from './website-studio-nav-config';
import {
  WebsiteStudioNavGroup,
  isStudioItemActive,
} from './website-studio-nav-group';

interface WebsiteStudioNavigationProps {
  tenantSlug: string;
  brandId?: string;
  isCollapsed?: boolean;
  onOpenPublishModal?: () => void;
  onNavigate?: () => void;
}

export function WebsiteStudioNavigation({
  tenantSlug,
  brandId,
  isCollapsed = false,
  onOpenPublishModal,
  onNavigate,
}: WebsiteStudioNavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() || '';

  const groups = useMemo(
    () => getWebsiteStudioNavGroups(tenantSlug, brandId, onOpenPublishModal),
    [tenantSlug, brandId, onOpenPublishModal]
  );

  const getParsedParams = useCallback((): URLSearchParams | null => {
    if (searchParamsString) return new URLSearchParams(searchParamsString);
    if (typeof window !== 'undefined' && window.location.search) {
      return new URLSearchParams(window.location.search);
    }
    return null;
  }, [searchParamsString]);

  // Initial open state: Expand the group that has the currently active item
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const sp = searchParamsString ? new URLSearchParams(searchParamsString) : null;
    let foundActive = false;

    groups.forEach((group) => {
      const isGroupActive = group.items.some((item) =>
        isStudioItemActive(item, pathname, sp)
      );
      if (isGroupActive) {
        initial[group.id] = true;
        foundActive = true;
      } else {
        initial[group.id] = false;
      }
    });

    // If on a top route (like /website) or none matched, open the first group
    if (!foundActive && groups[0]) {
      initial[groups[0].id] = true;
    }

    return initial;
  });

  const routeString = pathname + (searchParamsString ? `?${searchParamsString}` : '');
  const prevRouteRef = useRef(routeString);

  // Sync open groups on route change to keep active group expanded
  useEffect(() => {
    if (prevRouteRef.current !== routeString) {
      prevRouteRef.current = routeString;
      const sp = searchParamsString ? new URLSearchParams(searchParamsString) : null;

      setOpenGroups((prev) => {
        const next = { ...prev };
        groups.forEach((group) => {
          const isGroupActive = group.items.some((item) =>
            isStudioItemActive(item, pathname, sp)
          );
          if (isGroupActive) {
            next[group.id] = true;
          }
        });
        return next;
      });
    }
  }, [routeString, pathname, searchParamsString, groups]);

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);

  const parsedParams = getParsedParams();

  return (
    <nav
      className={`flex-1 overflow-y-auto py-2.5 space-y-3 ${
        isCollapsed ? 'px-1.5' : 'px-3'
      }`}
      aria-label="Website Studio navigation"
    >
      {groups.map((group) => (
        <WebsiteStudioNavGroup
          key={group.id}
          group={group}
          pathname={pathname}
          searchParams={parsedParams}
          isOpen={Boolean(openGroups[group.id])}
          onToggle={() => toggleGroup(group.id)}
          isCollapsed={isCollapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
