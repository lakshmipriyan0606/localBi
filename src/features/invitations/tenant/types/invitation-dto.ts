export interface TenantInvitationDto {
  id: string;
  email: string;
  role: string;
  scopeMode: string;
  expiresAt: string;
  createdAt: string;
  invitedBrandIds?: string[] | undefined;
}

export interface TenantInvitationListResponse {
  invitations: TenantInvitationDto[];
}
