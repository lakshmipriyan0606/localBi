import { browserClient } from '@/lib/http/browser-client';
import {
  TenantSettingsDto,
  SessionsListResponse,
} from '../types/settings-dto';
import { TenantSettingsInput } from '../schemas/tenant-settings-schema';

export const settingsClient = {
  async updateTenantSettings(
    tenantSlug: string,
    data: TenantSettingsInput & { version: number }
  ): Promise<{ tenant: TenantSettingsDto }> {
    const res = await browserClient.put<{ tenant: TenantSettingsDto }>(
      `/tenants/${tenantSlug}/settings`,
      data
    );
    return res.data;
  },

  async listActiveSessions(signal?: AbortSignal): Promise<SessionsListResponse> {
    const config = signal ? { signal } : {};
    const res = await browserClient.get<SessionsListResponse>(
      '/auth/sessions',
      config
    );
    return res.data;
  },

  async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      `/auth/sessions?sessionId=${sessionId}`
    );
    return res.data;
  },

  async revokeAllSessions(): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      '/auth/sessions?all=true'
    );
    return res.data;
  },
};
