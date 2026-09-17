export interface LocationDto {
  id: string;
  brandId: string;
  brandName?: string | undefined;
  storeCode: string;
  name: string;
  addressLine1: string;
  city: string;
  state?: string;
  stateRegion?: string;
  postalCode: string;
  country?: string;
  countryCode?: string;
  timezone: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  isArchived?: boolean;
  version: number;
  createdAt: string;
}

export interface LocationListResponse {
  items: LocationDto[];
  total: number;
}

export interface BrandOptionDto {
  id: string;
  name: string;
}
