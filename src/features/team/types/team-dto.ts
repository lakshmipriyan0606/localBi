export interface BrandScopeDto {
  brandId: string;
  brand: {
    name: string;
  };
}

export interface LocationScopeDto {
  locationId: string;
  location: {
    name: string;
    storeCode: string;
  };
}

export interface TeamMemberDto {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  scopeMode: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  brandAccessScopes?: BrandScopeDto[] | undefined;
  locationAccessScopes?: LocationScopeDto[] | undefined;
}

export interface TeamMemberListResponse {
  members: TeamMemberDto[];
}
