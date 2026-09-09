import { browserClient } from '@/lib/http/browser-client';
import { TeamMemberListResponse } from '../types/team-dto';
import { UpdateMemberRoleInput } from '../schemas/team-member-schema';

export const teamClient = {
  async listMembers(tenantSlug: string, signal?: AbortSignal): Promise<TeamMemberListResponse> {
    const config = signal ? { signal } : {};
    const res = await browserClient.get<TeamMemberListResponse>(
      `/tenants/${tenantSlug}/members`,
      config
    );
    return res.data;
  },

  async updateMemberRoleAndScope(
    tenantSlug: string,
    membershipId: string,
    data: UpdateMemberRoleInput
  ): Promise<{ success: boolean }> {
    const res = await browserClient.put<{ success: boolean }>(
      `/tenants/${tenantSlug}/members`,
      {
        membershipId,
        role: data.role,
        scopeMode: data.scopeMode,
        brandIds: data.scopeMode === 'RESTRICTED' ? data.brandIds : [],
      }
    );
    return res.data;
  },

  async suspendMember(tenantSlug: string, membershipId: string): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      `/tenants/${tenantSlug}/members?membershipId=${membershipId}&action=suspend`
    );
    return res.data;
  },

  async removeMember(tenantSlug: string, membershipId: string): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      `/tenants/${tenantSlug}/members?membershipId=${membershipId}&action=remove`
    );
    return res.data;
  },
};
