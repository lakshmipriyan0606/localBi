export interface CategoryDto {
  id: string;
  tenantId: string;
  brandId: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; name: string; slug: string } | null;
  productCount?: number;
}

export interface ProductMediaDto {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  type: string;
}

export interface ProductDto {
  id: string;
  tenantId: string;
  brandId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  basePrice: number | null;
  currency: string;
  status: string;
  publishStatus: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string } | null;
  media?: ProductMediaDto[];
  storesAvailableCount?: number;
}

export interface StoreProductDto {
  id: string;
  tenantId: string;
  brandId: string;
  storeId: string;
  productId: string;
  isAvailable: boolean;
  priceOverride: number | null;
  effectivePrice: number;
  quantity: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    slug: string;
    basePrice: number | null;
    currency: string;
    status: string;
    publishStatus: string;
    category?: { id: string; name: string; slug: string } | null;
  };
  store?: {
    id: string;
    name: string;
    slug: string;
    city?: string | null;
  };
}

export interface ProductListResponse {
  success: boolean;
  products: ProductDto[];
  total: number;
}

export interface CategoryListResponse {
  success: boolean;
  categories: CategoryDto[];
}

export interface StoreProductsResponse {
  success: boolean;
  mappings: StoreProductDto[];
  summary?: {
    totalMapped: number;
    availableCount: number;
    unavailableCount: number;
    categoriesRepresented: number;
  };
}
