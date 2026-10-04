import { RoleType } from '../../shared/authorization/roles';

export interface ClientAccountDto {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  primaryContact?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  timezone: string;
  locale: string;
  suspendedAt?: Date | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  brandCount?: number;
  storeCount?: number;
}

export interface CreateClientAccountInput {
  name: string;
  slug?: string;
  primaryContact?: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone?: string;
  locale?: string;
}

export interface UpdateClientAccountInput {
  name?: string;
  primaryContact?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  timezone?: string;
  locale?: string;
}

export interface ListClientsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
}

export interface WhiteLabelConfigDto {
  id?: string;
  tenantId: string;
  enabled: boolean;
  portalName: string;
  companyLegalName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  supportEmail?: string | null;
  supportUrl?: string | null;
  hideLocalBiBranding: boolean;
  customCss?: string | null;
  portalDomain?: {
    id: string;
    hostname: string;
    status: string;
    sslStatus: string;
  } | null;
}

export interface UpdateWhiteLabelInput {
  enabled?: boolean;
  portalName?: string;
  companyLegalName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  supportEmail?: string | null;
  supportUrl?: string | null;
  hideLocalBiBranding?: boolean;
  customCss?: string | null;
}

export interface PortalDomainDto {
  id: string;
  tenantId: string;
  hostname: string;
  status: 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'FAILED';
  verificationToken: string;
  sslStatus: 'PENDING' | 'ACTIVE' | 'FAILED';
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessGrantDto {
  id: string;
  tenantId: string;
  userId: string;
  scopeType: 'TENANT' | 'CLIENT' | 'BRAND' | 'LOCATION';
  clientAccountId?: string | null;
  brandId?: string | null;
  locationId?: string | null;
  role: RoleType;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  createdAt: Date;
  updatedAt: Date;
  clientAccount?: { id: string; name: string } | null;
}

export interface CreateAccessGrantInput {
  userId: string;
  scopeType?: 'TENANT' | 'CLIENT' | 'BRAND' | 'LOCATION';
  clientAccountId?: string;
  brandId?: string;
  locationId?: string;
  role: RoleType;
}

export const FeatureKey = {
  GBP: 'GBP',
  WEBSITE: 'WEBSITE',
  ANALYTICS: 'ANALYTICS',
  RANK_TRACKING: 'RANK_TRACKING',
  MERCHANT: 'MERCHANT',
  CALL_TRACKING: 'CALL_TRACKING',
  OPPORTUNITIES: 'OPPORTUNITIES',
  CONTENT: 'CONTENT',
  LISTINGS: 'LISTINGS',
  REPORTING: 'REPORTING',
  WHITELABEL: 'WHITELABEL',
} as const;

export type FeatureKeyType = typeof FeatureKey[keyof typeof FeatureKey];

export interface EntitlementDto {
  featureKey: string;
  enabled: boolean;
  limits: Record<string, unknown>;
  source: 'PLAN_DEFAULT' | 'MANUAL_OVERRIDE' | 'CLIENT_OVERRIDE';
}
