'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface BrandOption {
  id: string;
  name: string;
  slug: string;
}

interface ActiveBrandContextType {
  brands: BrandOption[];
  activeBrandId: string;
  activeBrand: BrandOption | undefined;
  setActiveBrandId: (brandId: string) => void;
  tenantSlug: string;
}

const ActiveBrandContext = createContext<ActiveBrandContextType | null>(null);

export function ActiveBrandProvider({
  brands = [],
  tenantSlug,
  children,
}: {
  brands: BrandOption[];
  tenantSlug: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryBrandId = searchParams.get('brandId');
  const [persistedBrandId, setPersistedBrandId] = useState<string>('');

  // 1. Load persisted brand from localStorage on mount & listen for global brand switch events
  useEffect(() => {
    if (typeof window === 'undefined' || !tenantSlug) {
      return;
    }

    const saved = localStorage.getItem(`localbi_active_brand_${tenantSlug}`);
    if (saved && brands.some((b) => b.id === saved)) {
      setPersistedBrandId(saved);
    }

    const handleBrandChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.brandId && brands.some((b) => b.id === detail.brandId)) {
        setPersistedBrandId(detail.brandId);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `localbi_active_brand_${tenantSlug}` && e.newValue) {
        if (brands.some((b) => b.id === e.newValue)) {
          setPersistedBrandId(e.newValue);
        }
      }
    };

    window.addEventListener('localbi-brand-changed', handleBrandChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('localbi-brand-changed', handleBrandChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [tenantSlug, brands]);

  // 2. Resolve active brand ID
  const activeBrandId = useMemo(() => {
    if (queryBrandId && brands.some((b) => b.id === queryBrandId)) {
      return queryBrandId;
    }
    if (persistedBrandId && brands.some((b) => b.id === persistedBrandId)) {
      return persistedBrandId;
    }
    return brands[0]?.id || '';
  }, [queryBrandId, persistedBrandId, brands]);

  const activeBrand = useMemo(() => {
    return brands.find((b) => b.id === activeBrandId) || brands[0];
  }, [brands, activeBrandId]);

  // 3. Setter to switch active brand globally across all pages and components
  const setActiveBrandId = useCallback(
    (id: string) => {
      if (!id || !brands.some((b) => b.id === id)) return;

      if (typeof window !== 'undefined' && tenantSlug) {
        localStorage.setItem(`localbi_active_brand_${tenantSlug}`, id);
        document.cookie = `localbi_active_brand_${tenantSlug}=${id}; path=/; max-age=31536000; SameSite=Lax`;
        setPersistedBrandId(id);
        window.dispatchEvent(new CustomEvent('localbi-brand-changed', { detail: { brandId: id } }));
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set('brandId', id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [brands, tenantSlug, searchParams, pathname, router]
  );

  // Sync cookie and localStorage on initial mount / change
  useEffect(() => {
    if (typeof window !== 'undefined' && tenantSlug && activeBrandId) {
      localStorage.setItem(`localbi_active_brand_${tenantSlug}`, activeBrandId);
      document.cookie = `localbi_active_brand_${tenantSlug}=${activeBrandId}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [activeBrandId, tenantSlug]);

  return (
    <ActiveBrandContext.Provider
      value={{
        brands,
        activeBrandId,
        activeBrand,
        setActiveBrandId,
        tenantSlug,
      }}
    >
      {children}
    </ActiveBrandContext.Provider>
  );
}

export function useActiveBrand() {
  const context = useContext(ActiveBrandContext);
  return context;
}
