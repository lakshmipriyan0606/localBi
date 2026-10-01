import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '../../src/shared/database/client';
import { TenantService } from '../../src/modules/tenancy/tenant-service';
import { BrandService } from '../../src/modules/brands/brand-service';
import { LocationService } from '../../src/modules/locations/location-service';
import { ProductService } from '../../src/modules/catalog/product-service';
import { CategoryService } from '../../src/modules/catalog/category-service';
import { StoreProductService } from '../../src/modules/catalog/store-product-service';
import { AvailabilityResolver } from '../../src/modules/catalog/availability-resolver';
import { CatalogMigrationService } from '../../src/modules/catalog/catalog-migration-service';
import { CatalogCompatibilityAdapter } from '../../src/modules/catalog/catalog-compatibility-adapter';
import { Role, ScopeMode, AuthorizedContext } from '../../src/shared/authorization/policy';
import { Action, assertAuthorizedAction, hasActionPermission } from '../../src/shared/authorization/roles';
import { normalizeEmail } from '../../src/modules/auth/email-normalizer';
import { TenantContextService } from '../../src/shared/database/tenant-context';

describe('Phase 2: Relational Catalog Engine', () => {
  let tenant1Id: string;
  let tenant2Id: string;
  let brandAId: string;
  let brandBId: string;
  let storeA1Id: string;
  let storeA2Id: string;
  let ownerContext1: AuthorizedContext;

  beforeEach(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');

    // 1. Create Tenant 1
    const user1 = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-${idSuffix}@tenant1.com`),
        fullName: 'Tenant 1 Owner',
        status: 'ACTIVE',
      },
    });

    const tenant1 = await TenantService.createTenant(
      { name: `Catalog Tenant 1 ${idSuffix}`, slug: `catalog-tenant-1-${idSuffix}`, timezone: 'Asia/Kolkata' },
      user1.id
    );
    tenant1Id = tenant1.id;

    ownerContext1 = {
      userId: user1.id,
      tenantId: tenant1Id,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    // 2. Create Tenant 2 (for cross-tenant tests)
    const user2 = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-${idSuffix}@tenant2.com`),
        fullName: 'Tenant 2 Owner',
        status: 'ACTIVE',
      },
    });

    const tenant2 = await TenantService.createTenant(
      { name: `Catalog Tenant 2 ${idSuffix}`, slug: `catalog-tenant-2-${idSuffix}`, timezone: 'Asia/Kolkata' },
      user2.id
    );
    tenant2Id = tenant2.id;

    // 3. Create Brands under Tenant 1: Brand A & Brand B
    const brandA = await BrandService.createBrand(
      tenant1Id,
      { name: 'Oud Luxe', slug: `oud-luxe-${idSuffix}` },
      ownerContext1
    );
    brandAId = brandA.id;

    const brandB = await BrandService.createBrand(
      tenant1Id,
      { name: 'Attar Maison', slug: `attar-maison-${idSuffix}` },
      ownerContext1
    );
    brandBId = brandB.id;

    // 4. Create Stores under Tenant 1
    const storeA1 = await LocationService.createLocation(
      tenant1Id,
      {
        brandId: brandAId,
        name: 'Oud Luxe Mannadi',
        addressLine1: '12 Beach Rd',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'IN',
        timezone: 'Asia/Kolkata',
      },
      ownerContext1
    );
    storeA1Id = storeA1.id;

    const storeA2 = await LocationService.createLocation(
      tenant1Id,
      {
        brandId: brandAId,
        name: 'Oud Luxe T Nagar',
        addressLine1: '45 Usman Rd',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600017',
        country: 'IN',
        timezone: 'Asia/Kolkata',
      },
      ownerContext1
    );
    storeA2Id = storeA2.id;

    await LocationService.createLocation(
      tenant1Id,
      {
        brandId: brandBId,
        name: 'Attar Maison Bangalore',
        addressLine1: '77 Brigade Rd',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN',
        timezone: 'Asia/Kolkata',
      },
      ownerContext1
    );
  });

  describe('1. Category Management & Hierarchy Safety', () => {
    it('creates, lists, and updates categories within brand scope', async () => {
      const parentCat = await CategoryService.createCategory(tenant1Id, {
        brandId: brandAId,
        name: 'Perfumes',
        description: 'Luxury Fragrances',
        sortOrder: 1,
      });

      expect(parentCat.id).toBeDefined();
      expect(parentCat.slug).toBe('perfumes');
      expect(parentCat.brandId).toBe(brandAId);

      const childCat = await CategoryService.createCategory(tenant1Id, {
        brandId: brandAId,
        name: 'Royal Oud',
        parentId: parentCat.id,
        sortOrder: 2,
      });

      expect(childCat.parentId).toBe(parentCat.id);

      const list = await CategoryService.listCategories(tenant1Id, { brandId: brandAId });
      expect(list.length).toBe(2);

      const updated = await CategoryService.updateCategory(tenant1Id, childCat.id, {
        name: 'Royal Cambodian Oud',
      });
      expect(updated.name).toBe('Royal Cambodian Oud');
    });

    it('prevents self-parenting (A -> A)', async () => {
      const cat = await CategoryService.createCategory(tenant1Id, {
        brandId: brandAId,
        name: 'Oud Oil',
      });

      await expect(
        CategoryService.updateCategory(tenant1Id, cat.id, { parentId: cat.id })
      ).rejects.toThrow(/cannot be its own parent/i);
    });

    it('prevents hierarchical cycles (A -> B -> C -> A)', async () => {
      const catA = await CategoryService.createCategory(tenant1Id, {
        brandId: brandAId,
        name: 'Category A',
      });
      const catB = await CategoryService.createCategory(tenant1Id, {
        brandId: brandAId,
        name: 'Category B',
        parentId: catA.id,
      });
      const catC = await CategoryService.createCategory(tenant1Id, {
        brandId: brandAId,
        name: 'Category C',
        parentId: catB.id,
      });

      // Attempting to make A's parent C would create: A -> B -> C -> A cycle
      await expect(
        CategoryService.updateCategory(tenant1Id, catA.id, { parentId: catC.id })
      ).rejects.toThrow(/cycle detected/i);
    });

    it('prevents cross-brand category parenting', async () => {
      const catBrandA = await CategoryService.createCategory(tenant1Id, {
        brandId: brandAId,
        name: 'Brand A Perfumes',
      });

      // Trying to attach Brand B category to Brand A parent category
      await expect(
        CategoryService.createCategory(tenant1Id, {
          brandId: brandBId,
          name: 'Brand B Attar',
          parentId: catBrandA.id,
        })
      ).rejects.toThrow(/does not belong to brand/i);
    });
  });

  describe('2. Product Management, SKU & Slug Rules', () => {
    it('creates, retrieves, updates, and archives a canonical product', async () => {
      const cat = await CategoryService.createCategory(tenant1Id, {
        brandId: brandAId,
        name: 'Oud Collection',
      });

      const prod = await ProductService.createProduct(tenant1Id, {
        brandId: brandAId,
        categoryId: cat.id,
        name: 'Royal Oud Eau De Parfum',
        sku: 'OUD-ROYAL-100',
        basePrice: 2499,
        currency: 'INR',
        description: 'Exquisite aged oud wood infusion',
        status: 'ACTIVE',
        publishStatus: 'PUBLISHED',
      });

      expect(prod.id).toBeDefined();
      expect(prod.sku).toBe('OUD-ROYAL-100');
      expect(prod.slug).toBe('royal-oud-eau-de-parfum');
      expect(prod.basePrice).toBe(2499);
      expect(prod.category?.id).toBe(cat.id);

      const fetched = await ProductService.getProduct(tenant1Id, prod.id);
      expect(fetched.name).toBe('Royal Oud Eau De Parfum');

      const updated = await ProductService.updateProduct(tenant1Id, prod.id, {
        basePrice: 2599,
      });
      expect(updated.basePrice).toBe(2599);

      const archived = await ProductService.archiveProduct(tenant1Id, prod.id);
      expect(archived.status).toBe('INACTIVE');
    });

    it('enforces SKU uniqueness within a Brand, but allows identical SKU across different Brands', async () => {
      await ProductService.createProduct(tenant1Id, {
        brandId: brandAId,
        name: 'Oud Blend 1',
        sku: 'OUD-COMMON-SKU',
        basePrice: 1500,
      });

      // Same Brand + same SKU must be rejected
      await expect(
        ProductService.createProduct(tenant1Id, {
          brandId: brandAId,
          name: 'Oud Blend 2',
          sku: 'OUD-COMMON-SKU',
          basePrice: 1800,
        })
      ).rejects.toThrow(/already exists for brand/i);

      // Different Brand + same SKU is allowed
      const brandBProduct = await ProductService.createProduct(tenant1Id, {
        brandId: brandBId,
        name: 'Attar Blend 1',
        sku: 'OUD-COMMON-SKU',
        basePrice: 1600,
      });
      expect(brandBProduct.id).toBeDefined();
      expect(brandBProduct.sku).toBe('OUD-COMMON-SKU');
    });

    it('generates deterministic unique slugs without overwriting existing slugs', async () => {
      const prod1 = await ProductService.createProduct(tenant1Id, {
        brandId: brandAId,
        name: 'Rose Damascena',
        sku: 'ROSE-001',
      });
      expect(prod1.slug).toBe('rose-damascena');

      // Duplicate name under same brand generates collision-free deterministic slug (-2)
      const prod2 = await ProductService.createProduct(tenant1Id, {
        brandId: brandAId,
        name: 'Rose Damascena',
        sku: 'ROSE-002',
      });
      expect(prod2.slug).toBe('rose-damascena-2');

      const prod3 = await ProductService.createProduct(tenant1Id, {
        brandId: brandAId,
        name: 'Rose Damascena',
        sku: 'ROSE-003',
      });
      expect(prod3.slug).toBe('rose-damascena-3');
    });
  });

  describe('3. StoreProduct Mapping, Price Resolution & Availability', () => {
    it('maps product to multiple stores with store-specific price overrides and availability', async () => {
      // Create canonical product
      const product = await ProductService.createProduct(tenant1Id, {
        brandId: brandAId,
        name: 'Royal Musk',
        sku: 'MUSK-001',
        basePrice: 2000,
        publishStatus: 'PUBLISHED',
      });

      // 1. Assign to Mannadi store with price override 1899
      const map1 = await StoreProductService.assignProductToStore(
        tenant1Id,
        brandAId,
        storeA1Id,
        product.id,
        { isAvailable: true, priceOverride: 1899 }
      );
      expect(map1.isAvailable).toBe(true);
      expect(map1.priceOverride).toBe(1899);
      expect(map1.effectivePrice).toBe(1899);

      // 2. Assign to T Nagar store with no price override (falls back to product.basePrice)
      const map2 = await StoreProductService.assignProductToStore(
        tenant1Id,
        brandAId,
        storeA2Id,
        product.id,
        { isAvailable: true, priceOverride: null }
      );
      expect(map2.isAvailable).toBe(true);
      expect(map2.priceOverride).toBeNull();
      expect(map2.effectivePrice).toBe(2000);

      // Verify listing for store
      const store1Products = await StoreProductService.listProductsForStore(tenant1Id, storeA1Id);
      expect(store1Products.length).toBe(1);
      expect(store1Products[0]?.effectivePrice).toBe(1899);

      // Verify availability resolver
      expect(
        AvailabilityResolver.isAvailableAtStore(
          { status: product.status, publishStatus: product.publishStatus },
          { isAvailable: true, status: 'ACTIVE' }
        )
      ).toBe(true);

      // If store is marked unavailable
      expect(
        AvailabilityResolver.isAvailableAtStore(
          { status: product.status, publishStatus: product.publishStatus },
          { isAvailable: false, status: 'ACTIVE' }
        )
      ).toBe(false);

      // If product itself is inactive globally
      expect(
        AvailabilityResolver.isAvailableAtStore(
          { status: 'INACTIVE', publishStatus: 'PUBLISHED' },
          { isAvailable: true, status: 'ACTIVE' }
        )
      ).toBe(false);
    });

    it('performs bulk store-product mapping in a single transaction', async () => {
      const p1 = await ProductService.createProduct(tenant1Id, {
        brandId: brandAId,
        name: 'Product 1',
        sku: 'P1-SKU',
        basePrice: 500,
      });
      const p2 = await ProductService.createProduct(tenant1Id, {
        brandId: brandAId,
        name: 'Product 2',
        sku: 'P2-SKU',
        basePrice: 600,
      });

      const bulkResult = await StoreProductService.bulkUpdateMappings(
        tenant1Id,
        brandAId,
        storeA1Id,
        [
          { productId: p1.id, isAvailable: true, priceOverride: 450 },
          { productId: p2.id, isAvailable: false },
        ]
      );

      expect(bulkResult.updatedCount).toBe(2);

      const storeProducts = await StoreProductService.listProductsForStore(tenant1Id, storeA1Id);
      expect(storeProducts.length).toBe(2);

      const summary = await StoreProductService.getStoreCatalogSummary(tenant1Id, storeA1Id);
      expect(summary.totalMapped).toBe(2);
      expect(summary.availableCount).toBe(1);
      expect(summary.unavailableCount).toBe(1);
    });
  });

  describe('4. Strict Security, Tenant Isolation & Cross-Brand Boundaries', () => {
    it('denies mapping a Brand B product to a Brand A store', async () => {
      const brandBProduct = await ProductService.createProduct(tenant1Id, {
        brandId: brandBId,
        name: 'Brand B Soap',
        sku: 'SOAP-B-001',
      });

      // Attempting to assign brand B product to store A1 (which belongs to Brand A)
      await expect(
        StoreProductService.assignProductToStore(
          tenant1Id,
          brandAId,
          storeA1Id,
          brandBProduct.id
        )
      ).rejects.toThrow(/does not belong to brand/i);
    });

    it('denies cross-tenant product access and cross-tenant store mapping', async () => {
      const tenant1Product = await ProductService.createProduct(tenant1Id, {
        brandId: brandAId,
        name: 'Secret Oud',
        sku: 'SEC-001',
      });

      // Tenant 2 trying to read Tenant 1's product fails
      await expect(
        ProductService.getProduct(tenant2Id, tenant1Product.id)
      ).rejects.toThrow(/not found/i);

      // Tenant 2 trying to attach Tenant 1's product to its store fails
      await expect(
        StoreProductService.assignProductToStore(
          tenant2Id,
          brandAId,
          storeA1Id,
          tenant1Product.id
        )
      ).rejects.toThrow();
    });

    it('enforces RBAC policy: VIEWER role cannot mutate catalog data', () => {
      expect(hasActionPermission(Role.VIEWER, Action.PRODUCT_VIEW)).toBe(true);
      expect(hasActionPermission(Role.VIEWER, Action.PRODUCT_CREATE)).toBe(false);
      expect(hasActionPermission(Role.VIEWER, Action.PRODUCT_UPDATE)).toBe(false);
      expect(hasActionPermission(Role.VIEWER, Action.PRODUCT_DELETE)).toBe(false);
      expect(hasActionPermission(Role.VIEWER, Action.CATEGORY_MANAGE)).toBe(false);
      expect(hasActionPermission(Role.VIEWER, Action.STORE_PRODUCT_MANAGE)).toBe(false);

      expect(() => {
        assertAuthorizedAction(Role.VIEWER, Action.PRODUCT_CREATE);
      }).toThrow(/not authorized/i);
    });
  });

  describe('5. Legacy Migration & Compatibility Adapter', () => {
    it('migrates legacy Microsite.menuItems JSON into canonical Category, Product, and StoreProduct', async () => {
      const idSuffix = crypto.randomBytes(4).toString('hex');
      const subdomain = `perfume-${idSuffix}`;

      // Create a legacy microsite with menuItems JSON
      await TenantContextService.withTenantContext(prisma, tenant1Id, async (tx) => {
        await tx.microsite.create({
          data: {
            tenantId: tenant1Id,
            brandId: brandAId,
            locationId: storeA1Id,
            subdomain,
            brandName: 'Legacy Oud House',
            locationName: 'Mannadi Branch',
            tagline: 'Pure Oriental Scents',
            menuItems: [
              {
                id: 'item-1',
                name: 'Legacy Oud Noir',
                category: 'Pure Dehn Al Oud',
                price: 3200,
                description: 'Vintage distilled Assam agarwood oil',
                isPopular: true,
              },
              {
                id: 'item-2',
                name: 'Legacy Rose Water',
                category: 'Floral Waters',
                price: 450,
                description: 'Organic distilled Taif rose water',
              },
            ],
          },
        });
      });

      // Run deterministic migration
      const report = await CatalogMigrationService.runFullMigration(tenant1Id);

      expect(report.micrositeProductsMigrated).toBeGreaterThanOrEqual(2);
      expect(report.categoriesCreated).toBeGreaterThanOrEqual(2);

      // Verify canonical records exist
      const products = await ProductService.listProducts(tenant1Id, { brandId: brandAId });
      const noir = products.products.find((p) => p.name === 'Legacy Oud Noir');
      expect(noir).toBeDefined();
      expect(noir?.basePrice).toBe(3200);
      expect(noir?.featured).toBe(true);
      expect(noir?.category?.name).toBe('Pure Dehn Al Oud');

      // Verify store mapping was created
      const storeProducts = await StoreProductService.listProductsForStore(tenant1Id, storeA1Id);
      const storeNoir = storeProducts.find((sp) => sp.product?.name === 'Legacy Oud Noir');
      expect(storeNoir).toBeDefined();
      expect(storeNoir?.isAvailable).toBe(true);
      expect(storeNoir?.priceOverride).toBe(3200);
    });

    it('skips ambiguous microsites lacking brandId and reports them without fabricating mappings', async () => {
      const idSuffix = crypto.randomBytes(4).toString('hex');
      await TenantContextService.withTenantContext(prisma, tenant1Id, async (tx) => {
        await tx.microsite.create({
          data: {
            tenantId: tenant1Id,
            brandId: null, // Ambiguous! No brand ownership
            subdomain: `unowned-${idSuffix}`,
            brandName: 'Ambiguous Shop',
            menuItems: [
              { id: 'amb-1', name: 'Mystery Item', category: 'General', price: 999 },
            ],
          },
        });
      });

      const report = await CatalogMigrationService.migrateMicrositeMenuItems(tenant1Id);
      const ambiguousSkip = report.skipped.find(
        (s) => s.reason.includes('lacks canonical brandId')
      );
      expect(ambiguousSkip).toBeDefined();
    });

    it('dual-read adapter transparently resolves relational catalog with fallback to legacy JSON', async () => {
      const fallbackItems = [
        { id: 'f-1', name: 'Fallback Item', category: 'Misc', price: 100, description: '' },
      ];

      // If no brand or no products, returns fallback
      const emptyResult = await CatalogCompatibilityAdapter.resolveMenuItemsForMicrosite(
        tenant1Id,
        null,
        null,
        fallbackItems
      );
      expect(emptyResult).toEqual(fallbackItems);

      // When canonical products are mapped to store, resolves them dynamically
      const relational = await CatalogCompatibilityAdapter.resolveMenuItemsForMicrosite(
        tenant1Id,
        brandAId,
        storeA1Id,
        fallbackItems
      );
      expect(relational.length).toBeGreaterThanOrEqual(1);
      expect(relational[0]?.name).toBeDefined();
      expect(relational[0]?.price).toBeGreaterThan(0);
    });
  });
});
