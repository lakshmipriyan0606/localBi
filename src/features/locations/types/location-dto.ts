export interface LocationDto {
  id: string;
  brandId: string;
  brandName?: string | undefined;
  storeCode: string;
  name: string;
  addressLine1: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  countryCode: string;
  timezone: string;
  status: 'ACTIVE' | 'ARCHIVED';
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
