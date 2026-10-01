import { z } from 'zod';

export const productSchema = z.object({
  brandId: z.string().min(1, 'Brand is required'),
  name: z.string().trim().min(1, 'Product name is required').max(200, 'Product name must be 200 characters or fewer'),
  sku: z.string().trim().min(1, 'SKU is required').max(100, 'SKU must be 100 characters or fewer'),
  slug: z.string().trim().optional(),
  categoryId: z.string().nullable().optional(),
  shortDescription: z.string().max(300, 'Short description must be 300 characters or fewer').nullable().optional(),
  description: z.string().nullable().optional(),
  basePrice: z.coerce.number().min(0, 'Price must be non-negative').nullable().optional(),
  currency: z.string().default('INR'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  publishStatus: z.enum(['DRAFT', 'PUBLISHED', 'UNPUBLISHED']).default('DRAFT'),
  featured: z.boolean().default(false),
  media: z
    .array(
      z.object({
        url: z.string().url('Must be a valid URL'),
        altText: z.string().optional(),
        sortOrder: z.number().int().default(0),
        type: z.string().default('IMAGE'),
      })
    )
    .optional(),
});

export type ProductFormInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  brandId: z.string().min(1, 'Brand is required'),
  name: z.string().trim().min(1, 'Category name is required').max(100, 'Category name must be 100 characters or fewer'),
  slug: z.string().trim().optional(),
  description: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export type CategoryFormInput = z.infer<typeof categorySchema>;

export const bulkStoreProductItemSchema = z.object({
  productId: z.string().min(1),
  isAvailable: z.boolean().default(true),
  priceOverride: z.coerce.number().min(0).nullable().optional(),
  quantity: z.coerce.number().int().min(0).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const bulkStoreMappingSchema = z.object({
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  updates: z.array(bulkStoreProductItemSchema).optional(),
  productIds: z.array(z.string().min(1)).optional(),
});

export type BulkStoreMappingInput = z.infer<typeof bulkStoreMappingSchema>;
