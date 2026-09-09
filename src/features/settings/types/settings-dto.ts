export interface TenantSettingsDto {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan: string;
  version: number;
}

export interface UserSessionDto {
  id: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

export interface SessionsListResponse {
  sessions: UserSessionDto[];
}
