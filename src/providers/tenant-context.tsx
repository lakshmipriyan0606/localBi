'use client';

import React, { createContext, useContext } from 'react';
import type {
  SafeTenantNavDto,
  SafeUserNavDto,
  AuthorizedTenantDto,
} from '@/components/layout/sidebar-nav-config';

export interface TenantContextValue {
  tenant: SafeTenantNavDto;
  user: SafeUserNavDto;
  tenants: AuthorizedTenantDto[];
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantContextProvider({
  tenant,
  user,
  tenants = [],
  children,
}: {
  tenant: SafeTenantNavDto;
  user: SafeUserNavDto;
  tenants?: AuthorizedTenantDto[];
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={{ tenant, user, tenants }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext(): TenantContextValue | null {
  return useContext(TenantContext);
}
