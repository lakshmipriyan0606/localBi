export interface BrandDto {
  id: string;
  name: string;
  slug: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  isArchived?: boolean;
  version: number;
  createdAt: string;
  ga4MeasurementId?: string | null;
  gscWebsiteUrl?: string | null;
}

export interface BrandListResponse {
  items: BrandDto[];
  total: number;
}
