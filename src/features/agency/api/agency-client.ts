import { browserClient } from '@/lib/http/browser-client';
import {
  ClientAccountDto,
  CreateClientAccountInput,
  UpdateClientAccountInput,
  ListClientsOptions,
  WhiteLabelConfigDto,
  UpdateWhiteLabelInput,
  PortalDomainDto,
  AccessGrantDto,
  CreateAccessGrantInput,
  EntitlementDto,
} from '@/modules/agency/agency-types';

export interface ClientListResponse {
  clients: ClientAccountDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EntitlementsResponse {
  entitlements: Record<string, EntitlementDto>;
}

export const agencyClient = {
  async listClients(
    tenantSlug: string,
    options?: ListClientsOptions,
    signal?: AbortSignal
  ): Promise<ClientListResponse> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.pageSize) params.set('limit', String(options.pageSize));
    if (options?.search) params.set('search', options.search);
    if (options?.status) params.set('status', options.status);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await browserClient.get<{ success: boolean; data: ClientListResponse }>(
      `/tenants/${tenantSlug}/clients${query}`,
      { signal }
    );
    return res.data.data;
  },

  async getClient(
    tenantSlug: string,
    clientSlug: string,
    signal?: AbortSignal
  ): Promise<ClientAccountDto> {
    const res = await browserClient.get<{ success: boolean; data: ClientAccountDto }>(
      `/tenants/${tenantSlug}/clients/${clientSlug}`,
      { signal }
    );
    return res.data.data;
  },

  async createClient(
    tenantSlug: string,
    data: CreateClientAccountInput
  ): Promise<ClientAccountDto> {
    const res = await browserClient.post<{ success: boolean; data: ClientAccountDto }>(
      `/tenants/${tenantSlug}/clients`,
      data
    );
    return res.data.data;
  },

  async updateClient(
    tenantSlug: string,
    clientSlug: string,
    data: UpdateClientAccountInput
  ): Promise<ClientAccountDto> {
    const res = await browserClient.patch<{ success: boolean; data: ClientAccountDto }>(
      `/tenants/${tenantSlug}/clients/${clientSlug}`,
      data
    );
    return res.data.data;
  },

  async suspendClient(tenantSlug: string, clientSlug: string): Promise<ClientAccountDto> {
    const res = await browserClient.post<{ success: boolean; data: ClientAccountDto }>(
      `/tenants/${tenantSlug}/clients/${clientSlug}/suspend`
    );
    return res.data.data;
  },

  async unsuspendClient(tenantSlug: string, clientSlug: string): Promise<ClientAccountDto> {
    const res = await browserClient.post<{ success: boolean; data: ClientAccountDto }>(
      `/tenants/${tenantSlug}/clients/${clientSlug}/unsuspend`
    );
    return res.data.data;
  },

  async archiveClient(tenantSlug: string, clientSlug: string): Promise<ClientAccountDto> {
    const res = await browserClient.post<{ success: boolean; data: ClientAccountDto }>(
      `/tenants/${tenantSlug}/clients/${clientSlug}/archive`
    );
    return res.data.data;
  },

  async listGrants(
    tenantSlug: string,
    clientSlug: string,
    signal?: AbortSignal
  ): Promise<AccessGrantDto[]> {
    const res = await browserClient.get<{ success: boolean; data: AccessGrantDto[] }>(
      `/tenants/${tenantSlug}/clients/${clientSlug}/grants`,
      { signal }
    );
    return res.data.data;
  },

  async createGrant(
    tenantSlug: string,
    clientSlug: string,
    data: CreateAccessGrantInput
  ): Promise<AccessGrantDto> {
    const res = await browserClient.post<{ success: boolean; data: AccessGrantDto }>(
      `/tenants/${tenantSlug}/clients/${clientSlug}/grants`,
      data
    );
    return res.data.data;
  },

  async deleteGrant(
    tenantSlug: string,
    clientSlug: string,
    grantId: string
  ): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      `/tenants/${tenantSlug}/clients/${clientSlug}/grants/${grantId}`
    );
    return res.data;
  },

  async getWhiteLabel(tenantSlug: string, signal?: AbortSignal): Promise<WhiteLabelConfigDto> {
    const res = await browserClient.get<{ success: boolean; data: WhiteLabelConfigDto }>(
      `/tenants/${tenantSlug}/whitelabel`,
      { signal }
    );
    return res.data.data;
  },

  async updateWhiteLabel(
    tenantSlug: string,
    data: UpdateWhiteLabelInput
  ): Promise<WhiteLabelConfigDto> {
    const res = await browserClient.put<{ success: boolean; data: WhiteLabelConfigDto }>(
      `/tenants/${tenantSlug}/whitelabel`,
      data
    );
    return res.data.data;
  },

  async listPortalDomains(
    tenantSlug: string,
    signal?: AbortSignal
  ): Promise<PortalDomainDto[]> {
    const res = await browserClient.get<{ success: boolean; data: PortalDomainDto[] }>(
      `/tenants/${tenantSlug}/portal-domains`,
      { signal }
    );
    return res.data.data;
  },

  async createPortalDomain(
    tenantSlug: string,
    hostname: string
  ): Promise<PortalDomainDto> {
    const res = await browserClient.post<{ success: boolean; data: PortalDomainDto }>(
      `/tenants/${tenantSlug}/portal-domains`,
      { hostname }
    );
    return res.data.data;
  },

  async verifyPortalDomain(
    tenantSlug: string,
    domainId: string
  ): Promise<PortalDomainDto> {
    const res = await browserClient.post<{ success: boolean; data: PortalDomainDto }>(
      `/tenants/${tenantSlug}/portal-domains/${domainId}/verify`
    );
    return res.data.data;
  },

  async deletePortalDomain(
    tenantSlug: string,
    domainId: string
  ): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      `/tenants/${tenantSlug}/portal-domains/${domainId}`
    );
    return res.data;
  },

  async getEntitlements(
    tenantSlug: string,
    clientAccountId?: string,
    signal?: AbortSignal
  ): Promise<Record<string, EntitlementDto>> {
    const query = clientAccountId ? `?clientAccountId=${clientAccountId}` : '';
    const res = await browserClient.get<{ success: boolean; data: Record<string, EntitlementDto> }>(
      `/tenants/${tenantSlug}/entitlements${query}`,
      { signal }
    );
    return res.data.data;
  },

  async updateEntitlement(
    tenantSlug: string,
    data: {
      clientAccountId?: string;
      featureKey: string;
      enabled: boolean;
      limits?: Record<string, unknown>;
    }
  ): Promise<EntitlementDto> {
    const res = await browserClient.put<{ success: boolean; data: EntitlementDto }>(
      `/tenants/${tenantSlug}/entitlements`,
      data
    );
    return res.data.data;
  },
};
