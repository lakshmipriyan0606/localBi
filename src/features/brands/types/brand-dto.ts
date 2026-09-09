export interface BrandDto {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'ARCHIVED';
  version: number;
  createdAt: string;
}

export interface BrandListResponse {
  items: BrandDto[];
  total: number;
}
