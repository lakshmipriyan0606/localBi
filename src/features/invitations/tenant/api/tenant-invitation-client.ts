import { browserClient } from '@/lib/http/browser-client';
import { TenantInvitationListResponse } from '../types/invitation-dto';
import { CreateInvitationInput } from '../schemas/create-invitation-schema';

export const tenantInvitationClient = {
  async listInvitations(
    tenantSlug: string,
    signal?: AbortSignal
  ): Promise<TenantInvitationListResponse> {
    const config = signal ? { signal } : {};
    const res = await browserClient.get<TenantInvitationListResponse>(
      `/tenants/${tenantSlug}/invitations`,
      config
    );
    return res.data;
  },

  async createInvitation(
    tenantSlug: string,
    data: CreateInvitationInput
  ): Promise<{ rawToken: string }> {
    const res = await browserClient.post<{ rawToken: string }>(
      `/tenants/${tenantSlug}/invitations`,
      {
        email: data.email,
        role: data.role,
        scopeMode: data.scopeMode,
        brandIds: data.scopeMode === 'RESTRICTED' ? data.brandIds : [],
      }
    );
    return res.data;
  },

  async revokeInvitation(
    tenantSlug: string,
    invitationId: string
  ): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      `/tenants/${tenantSlug}/invitations?invitationId=${invitationId}`
    );
    return res.data;
  },
};
