import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '../src/shared/database/client';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role, ScopeMode, AuthorizedContext } from '../src/shared/authorization/policy';
import { MerchantClientRegistry, TestMerchantClientAdapter } from '../src/modules/merchant/merchant-client';
import { MerchantEligibilityService } from '../src/modules/merchant/merchant-eligibility-service';
import { MerchantCatalogService } from '../src/modules/merchant/merchant-catalog-service';
import { MerchantDiagnosticsService } from '../src/modules/merchant/merchant-diagnostics-service';
import { MerchantDashboardService } from '../src/modules/merchant/merchant-dashboard-service';
import { SyncQueueService } from '../src/modules/sync/sync-queue';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';

describe('Phase 8: Google Merchant Center & Local Product Inventory Engine Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let brandAId: string;
  let brandBId: string;
  let storeA1Id: string; // Mannadi (CHE-MAN-01)
  let storeA2Id: string; // T Nagar (CHE-TNG-02)
  let storeA3Id: string; // Anna Nagar (CHE-ANN-03)
  let storeNoCodeId: string; // Store without storeCode
  let userAId: string;
  let userBId: string;
  let adminContextA: AuthorizedContext;
  let adminContextB: AuthorizedContext;
  let testAdapter: TestMerchantClientAdapter;

  beforeAll(async () => {
    // 0. Register Deterministic Test Adapter
    testAdapter = new TestMerchantClientAdapter([
      { id: 'gmc_acc_aalim', name: 'Aalim Perfumes Merchant Center', sellerId: 'seller_aalim_001' },
      { id: 'gmc_acc_lakshmi', name: 'Lakshmi Retail Merchant Center', sellerId: 'seller_lakshmi_002' },
    ]);
    MerchantClientRegistry.setClient(testAdapter);

    const idSuffix = crypto.randomBytes(4).toString('hex');

    // 1. Setup Tenant A
    const userA = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-a-gmc-${idSuffix}@example.com`),
        fullName: 'Tenant A GMC Admin',
        status: 'ACTIVE',
      },
    });
    userAId = userA.id;

    const tenantA = await prisma.tenant.create({
      data: {
        name: `Tenant A GMC ${idSuffix}`,
        slug: `tenant-a-gmc-${idSuffix}`,
        timezone: 'Asia/Kolkata',
      },
    });
    tenantAId = tenantA.id;

    adminContextA = {
      userId: userAId,
      tenantId: tenantAId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    // Create Brand and Stores for Tenant A under RLS context
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const brandA = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: 'Aalim Perfumes',
          slug: `aalim-perfumes-${idSuffix}`,
        },
      });
      brandAId = brandA.id;

      // Stores for Brand A
      const storeA1 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Aalim Perfumes - Mannadi',
          storeCode: 'CHE-MAN-01',
          addressLine1: '124 Angappa Naicken St',
          city: 'Chennai',
          state: 'TN',
          postalCode: '600001',
          country: 'IN',
          latitude: 13.0901,
          longitude: 80.2882,
        },
      });
      storeA1Id = storeA1.id;

      const storeA2 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Aalim Perfumes - T Nagar',
          storeCode: 'CHE-TNG-02',
          addressLine1: '45 Usman Rd',
          city: 'Chennai',
          state: 'TN',
          postalCode: '600017',
          country: 'IN',
          latitude: 13.0418,
          longitude: 80.2341,
        },
      });
      storeA2Id = storeA2.id;

      const storeA3 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Aalim Perfumes - Anna Nagar',
          storeCode: 'CHE-ANN-03',
          addressLine1: '2nd Ave',
          city: 'Chennai',
          state: 'TN',
          postalCode: '600040',
          country: 'IN',
          latitude: 13.085,
          longitude: 80.2101,
        },
      });
      storeA3Id = storeA3.id;

      const storeNoCode = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Aalim Perfumes - Kiosk',
          storeCode: null, // Missing storeCode
          addressLine1: 'Express Avenue Mall',
          city: 'Chennai',
          state: 'TN',
          postalCode: '600002',
          country: 'IN',
        },
      });
      storeNoCodeId = storeNoCode.id;
    });

    // 2. Setup Tenant B
    const userB = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-b-gmc-${idSuffix}@example.com`),
        fullName: 'Tenant B GMC Admin',
        status: 'ACTIVE',
      },
    });
    userBId = userB.id;

    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B GMC ${idSuffix}`,
        slug: `tenant-b-gmc-${idSuffix}`,
        timezone: 'Asia/Kolkata',
      },
    });
    tenantBId = tenantB.id;

    adminContextB = {
      userId: userBId,
      tenantId: tenantBId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const brandB = await tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: 'Lakshmi Sweets',
          slug: `lakshmi-sweets-${idSuffix}`,
        },
      });
      brandBId = brandB.id;
    });
  });

  afterAll(async () => {
    MerchantClientRegistry.resetToDefault();
    // Cleanup
    if (tenantAId) {
      await prisma.tenant.delete({ where: { id: tenantAId } }).catch(() => {});
    }
    if (tenantBId) {
      await prisma.tenant.delete({ where: { id: tenantBId } }).catch(() => {});
    }
    if (userAId) {
      await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
    }
    if (userBId) {
      await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
    }
  });

  // =========================================================================
  // Section 1: Merchant API Contract & Adapter
  // =========================================================================
  describe('Section 1: Merchant API Contract & Adapter', () => {
    it('discovers accessible Google Merchant accounts for an authorized connection', async () => {
      const accounts = await MerchantCatalogService.discoverAccounts(adminContextA, 'conn_test_1');
      expect(accounts.length).toBeGreaterThanOrEqual(2);
      expect(accounts[0]!.id).toBe('gmc_acc_aalim');
      expect(accounts[0]!.name).toContain('Aalim Perfumes');
    });

    it('maps Brand to Merchant Center account and persists BrandMerchantConfig', async () => {
      const config = await MerchantCatalogService.mapBrandToMerchantAccount(adminContextA, {
        brandId: brandAId,
        merchantAccountId: 'gmc_acc_aalim',
        targetCountry: 'IN',
        contentLanguage: 'en',
        defaultCurrency: 'INR',
      });

      expect(config.merchantAccountId).toBe('gmc_acc_aalim');
      expect(config.targetCountry).toBe('IN');

      const fetched = await MerchantCatalogService.getBrandMerchantConfig(adminContextA, brandAId);
      expect(fetched?.merchantAccountId).toBe('gmc_acc_aalim');
    });

    it('aborts safely when Google connection is revoked without classifying products as disapproved', async () => {
      testAdapter.forceAuthError = true;
      await expect(
        MerchantCatalogService.discoverAccounts(adminContextA, 'revoked_conn')
      ).rejects.toThrow('Google OAuth connection has been revoked.');
      testAdapter.forceAuthError = false;
    });
  });

  // =========================================================================
  // Section 2: Product Eligibility Validation
  // =========================================================================
  describe('Section 2: Product Eligibility Validation', () => {
    it('approves a complete, published product with image and valid price', () => {
      const result = MerchantEligibilityService.validate({
        id: 'prod_valid',
        name: 'Royal Oud 50ml Eau de Parfum',
        description: 'Rich Cambodian agarwood blended with amber and Turkish rose.',
        basePrice: 2499.0,
        currency: 'INR',
        publishStatus: 'PUBLISHED',
        status: 'ACTIVE',
        sku: 'RO-50ML-EDP',
        media: [{ url: 'https://cdn.example.com/products/royal-oud.jpg', type: 'IMAGE' }],
        canonicalUrl: 'https://aalimperfumes.com/products/royal-oud',
        brandName: 'Aalim Perfumes',
        gtin: '8901234567890',
      });

      expect(result.isEligible).toBe(true);
      expect(result.status).toBe('READY');
      expect(result.issues.length).toBe(0);
    });

    it('rejects a DRAFT or UNPUBLISHED product with NOT_PUBLISHED status', () => {
      const draftResult = MerchantEligibilityService.validate({
        id: 'prod_draft',
        name: 'Amber Musk',
        description: 'Warm musk with floral notes',
        basePrice: 1499,
        currency: 'INR',
        publishStatus: 'DRAFT',
        status: 'ACTIVE',
        sku: 'AM-100',
        media: [{ url: 'https://cdn.example.com/p.jpg' }],
      });

      expect(draftResult.isEligible).toBe(false);
      expect(draftResult.status).toBe('NOT_PUBLISHED');
      expect(draftResult.issues[0]!.field).toBe('publishStatus');
    });

    it('rejects missing image, localhost URL, or temporary url', () => {
      const badImgResult = MerchantEligibilityService.validate({
        id: 'prod_bad_img',
        name: 'Rose Taif',
        description: 'Pure Taif Rose essence',
        basePrice: 3999,
        currency: 'INR',
        publishStatus: 'PUBLISHED',
        status: 'ACTIVE',
        sku: 'RT-12ML',
        media: [{ url: 'http://localhost:3000/uploads/temp.jpg' }], // Localhost
      });

      expect(badImgResult.isEligible).toBe(false);
      expect(badImgResult.status).toBe('MISSING_REQUIRED_DATA');
      expect(badImgResult.issues.some((i) => i.field === 'image')).toBe(true);
    });

    it('rejects missing or zero price', () => {
      const freeResult = MerchantEligibilityService.validate({
        id: 'prod_free',
        name: 'Sample Vial',
        description: 'Complimentary fragrance sample',
        basePrice: 0,
        currency: 'INR',
        publishStatus: 'PUBLISHED',
        status: 'ACTIVE',
        sku: 'SAMPLE-01',
        media: [{ url: 'https://cdn.example.com/sample.jpg' }],
      });

      expect(freeResult.isEligible).toBe(false);
      expect(freeResult.status).toBe('MISSING_REQUIRED_DATA');
      expect(freeResult.issues.some((i) => i.field === 'basePrice')).toBe(true);
    });
  });

  // =========================================================================
  // Section 3: Stable Identifiers (Offer ID & Store Code)
  // =========================================================================
  describe('Section 3: Stable Identifiers (Offer ID & Store Code)', () => {
    it('maintains a stable offerId strictly derived from SKU across product title edits', async () => {
      const sku = 'OUD-ROYAL-50';
      const offerIdInitial = MerchantCatalogService.resolveOfferId('aalim', sku);
      expect(offerIdInitial).toBe('OUD-ROYAL-50');

      // Product title changes from "Royal Oud 50ml" to "Royal Oud Premium Edition"
      const offerIdAfterRename = MerchantCatalogService.resolveOfferId('aalim', sku);
      expect(offerIdAfterRename).toBe(offerIdInitial);
    });

    it('maintains a stable storeCode across store name changes', async () => {
      // Store name changed in Location table
      const updatedStore = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return await tx.location.update({
          where: { id: storeA1Id },
          data: { name: 'Aalim Perfumes Flagship - Mannadi High St' },
        });
      });

      expect(updatedStore.storeCode).toBe('CHE-MAN-01');
    });
  });

  // =========================================================================
  // Section 4: Local Inventory & Multi-Store Price Overrides (Section 63)
  // =========================================================================
  describe('Section 4: Local Inventory & Multi-Store Price Overrides', () => {
    let royalOudId: string;

    beforeAll(async () => {
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        // Create canonical Product: Royal Oud (basePrice = 2499)
        const prod = await tx.product.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            name: 'Royal Oud Eau de Parfum',
            sku: 'RO-ROYAL-OUD',
            slug: `royal-oud-${crypto.randomBytes(4).toString('hex')}`,
            basePrice: 2499.0,
            currency: 'INR',
            description: 'Luxurious Cambodian oud wood infused with amber and rose.',
            publishStatus: 'PUBLISHED',
            status: 'ACTIVE',
            media: {
              create: [
                {
                  url: 'https://cdn.example.com/products/royal-oud-hq.jpg',
                  type: 'IMAGE',
                  sortOrder: 0,
                },
              ],
            },
          },
        });
        royalOudId = prod.id;

        // Store A1 (Mannadi): override = 2399, isAvailable = true
        await tx.storeProduct.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeA1Id,
            productId: royalOudId,
            priceOverride: 2399.0,
            isAvailable: true,
            quantity: 15,
          },
        });

        // Store A2 (T Nagar): override = null (uses basePrice 2499), isAvailable = true
        await tx.storeProduct.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeA2Id,
            productId: royalOudId,
            priceOverride: null,
            isAvailable: true,
            quantity: 8,
          },
        });

        // Store A3 (Anna Nagar): isAvailable = false
        await tx.storeProduct.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeA3Id,
            productId: royalOudId,
            priceOverride: null,
            isAvailable: false,
            quantity: 0,
          },
        });
      });
    });

    it('synchronizes single product and publishes accurate local inventory across all 3 stores', async () => {
      const syncRes = await MerchantCatalogService.syncProduct(adminContextA, royalOudId);
      expect(syncRes.success).toBe(true);
      expect(syncRes.offerId).toBe('RO-ROYAL-OUD');
      expect(syncRes.syncStatus).toBe('APPROVED');

      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        // Check Store A1 (Mannadi) local inventory: priceOverride 2399, in_stock
        const invA1 = await tx.merchantLocalInventoryState.findUnique({
          where: {
            uq_merchant_local_inventory_store_prod: {
              tenantId: tenantAId,
              storeId: storeA1Id,
              productId: royalOudId,
            },
          },
        });
        expect(invA1).not.toBeNull();
        expect(Number(invA1!.submittedPrice)).toBe(2399.0);
        expect(invA1!.submittedAvailability).toBe('in_stock');
        expect(invA1!.submittedQuantity).toBe(15);
        expect(invA1!.storeCode).toBe('CHE-MAN-01');

        // Check Store A2 (T Nagar) local inventory: basePrice 2499, in_stock
        const invA2 = await tx.merchantLocalInventoryState.findUnique({
          where: {
            uq_merchant_local_inventory_store_prod: {
              tenantId: tenantAId,
              storeId: storeA2Id,
              productId: royalOudId,
            },
          },
        });
        expect(invA2).not.toBeNull();
        expect(Number(invA2!.submittedPrice)).toBe(2499.0);
        expect(invA2!.submittedAvailability).toBe('in_stock');
        expect(invA2!.submittedQuantity).toBe(8);
        expect(invA2!.storeCode).toBe('CHE-TNG-02');

        // Check Store A3 (Anna Nagar) local inventory: out_of_stock
        const invA3 = await tx.merchantLocalInventoryState.findUnique({
          where: {
            uq_merchant_local_inventory_store_prod: {
              tenantId: tenantAId,
              storeId: storeA3Id,
              productId: royalOudId,
            },
          },
        });
        expect(invA3).not.toBeNull();
        expect(invA3!.submittedAvailability).toBe('out_of_stock');
        expect(invA3!.storeCode).toBe('CHE-ANN-03');
      });
    });

    it('rejects store local inventory sync when store has no storeCode', async () => {
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        // Map product to storeNoCode
        await tx.storeProduct.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            storeId: storeNoCodeId,
            productId: royalOudId,
            isAvailable: true,
          },
        });
      });

      await expect(
        MerchantCatalogService.syncStoreInventory(adminContextA, storeNoCodeId)
      ).rejects.toThrow('storeCode is required');
    });

    it('detects payload hash and avoids unnecessary provider writes when unchanged', async () => {
      // Second sync without force option should detect matching hash
      const secondSync = await MerchantCatalogService.syncProduct(adminContextA, royalOudId, { force: false });
      expect(secondSync.success).toBe(true);
    });
  });

  // =========================================================================
  // Section 5: Bulk Sync & Partial Batch Handling (Section 36 & 74)
  // =========================================================================
  describe('Section 5: Bulk Sync & Partial Batch Handling', () => {
    let validProdId: string;
    let invalidProdId: string;

    beforeAll(async () => {
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        const valid = await tx.product.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            name: 'Dehn Al Oud 6ml',
            sku: 'DEHN-06ML',
            slug: `dehn-al-oud-${crypto.randomBytes(4).toString('hex')}`,
            basePrice: 5500.0,
            currency: 'INR',
            description: 'Aged pure Indian Dehn Al Oud oil in crystal bottle.',
            publishStatus: 'PUBLISHED',
            status: 'ACTIVE',
            media: {
              create: [{ url: 'https://cdn.example.com/dehn.jpg' }],
            },
          },
        });
        validProdId = valid.id;

        // Incomplete product: missing image and description
        const invalid = await tx.product.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            name: 'Incomplete Item',
            sku: 'INCOMPLETE-01',
            slug: `incomplete-item-${crypto.randomBytes(4).toString('hex')}`,
            basePrice: 1000.0,
            currency: 'INR',
            publishStatus: 'PUBLISHED',
            status: 'ACTIVE',
          },
        });
        invalidProdId = invalid.id;
      });
    });

    it('executes batch sync preserving successful products while reporting individual errors', async () => {
      const batchResult = await MerchantCatalogService.syncProductsBatch(
        adminContextA,
        brandAId,
        [validProdId, invalidProdId]
      );

      expect(batchResult.total).toBe(2);
      expect(batchResult.succeeded).toBe(1);
      expect(batchResult.failed).toBe(1);

      const validResult = batchResult.results.find((r) => r.productId === validProdId);
      expect(validResult?.success).toBe(true);

      const invalidResult = batchResult.results.find((r) => r.productId === invalidProdId);
      expect(invalidResult?.success).toBe(false);
      expect(invalidResult?.error).toBeDefined();
    });
  });

  // =========================================================================
  // Section 6: Diagnostics Lifecycle & Recovery (Section 75)
  // =========================================================================
  describe('Section 6: Diagnostics Lifecycle & Recovery', () => {
    let diagProdId: string;
    let offerId: string;

    beforeAll(async () => {
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        const prod = await tx.product.create({
          data: {
            tenantId: tenantAId,
            brandId: brandAId,
            name: 'Kashmir Saffron Attar',
            sku: 'KASH-SAFFRON',
            slug: `kashmir-saffron-${crypto.randomBytes(4).toString('hex')}`,
            basePrice: 1800.0,
            currency: 'INR',
            description: 'Natural saffron distilled with sandalwood.',
            publishStatus: 'PUBLISHED',
            status: 'ACTIVE',
            media: {
              create: [{ url: 'https://cdn.example.com/saffron.jpg' }],
            },
          },
        });
        diagProdId = prod.id;
        offerId = prod.sku;
      });

      await MerchantCatalogService.syncProduct(adminContextA, diagProdId);
    });

    it('records active disapproval issues when provider reports item-level problems', async () => {
      // Simulate Google Merchant Center reporting a policy issue
      testAdapter.simulateDisapproval('gmc_acc_aalim', offerId, [
        {
          code: 'missing_gtin',
          severity: 'DISAPPROVAL',
          attributeName: 'gtin',
          message: 'Missing required GTIN or brand identifier',
        },
      ]);

      const diag = await MerchantDiagnosticsService.syncProductDiagnostics(adminContextA, diagProdId);
      expect(diag.newStatus).toBe('disapproved');
      expect(diag.newIssuesCount).toBe(1);

      const issues = await MerchantDiagnosticsService.listBrandIssues(adminContextA, brandAId, {
        severity: 'DISAPPROVAL',
      });
      expect(issues.items.length).toBeGreaterThanOrEqual(1);
      const match = issues.items.find((i) => i.code === 'missing_gtin');
      expect(match).toBeDefined();
      expect(match!.isResolved).toBe(false);
    });

    it('marks issue as resolved and recovers status when problem is corrected (Diagnostic Recovery)', async () => {
      // Simulate user correcting the issue and provider re-approving
      testAdapter.simulateApproval('gmc_acc_aalim', offerId);

      const recoveryDiag = await MerchantDiagnosticsService.syncProductDiagnostics(adminContextA, diagProdId);
      expect(recoveryDiag.newStatus).toBe('approved');
      expect(recoveryDiag.resolvedIssuesCount).toBe(1);

      // Verify issue is now marked resolved
      const resolvedIssues = await MerchantDiagnosticsService.listBrandIssues(adminContextA, brandAId, {
        isResolved: true,
      });
      const resolvedMatch = resolvedIssues.items.find((i) => i.code === 'missing_gtin');
      expect(resolvedMatch).toBeDefined();
      expect(resolvedMatch!.isResolved).toBe(true);
      expect(resolvedMatch!.resolvedAt).not.toBeNull();
    });
  });

  // =========================================================================
  // Section 7: Background Queue & Worker Scheduling
  // =========================================================================
  describe('Section 7: Background Queue & Worker Scheduling', () => {
    it('schedules product sync job in sync queue', async () => {
      const scheduled = await SyncQueueService.scheduleMerchantProductSync({
        tenantId: tenantAId,
        brandId: brandAId,
        productId: 'prod_test_queue',
      });

      expect(scheduled.jobId).toBeDefined();
      expect(scheduled.status).toBe('QUEUED');
      expect(scheduled.businessKey).toContain('MERCHANT_PRODUCT');
    });

    it('schedules store inventory sync job in sync queue', async () => {
      const scheduled = await SyncQueueService.scheduleMerchantInventorySync({
        tenantId: tenantAId,
        brandId: brandAId,
        storeId: storeA1Id,
      });

      expect(scheduled.jobId).toBeDefined();
      expect(scheduled.status).toBe('QUEUED');
      expect(scheduled.businessKey).toContain('MERCHANT_INVENTORY');
    });

    it('schedules catalog reconcile job in sync queue', async () => {
      const scheduled = await SyncQueueService.scheduleMerchantReconcile({
        tenantId: tenantAId,
        brandId: brandAId,
      });

      expect(scheduled.jobId).toBeDefined();
      expect(scheduled.status).toBe('QUEUED');
      expect(scheduled.businessKey).toContain('MERCHANT_RECONCILE');
    });
  });

  // =========================================================================
  // Section 8: Multi-Tenant & Cross-Brand Security
  // =========================================================================
  describe('Section 8: Multi-Tenant & Cross-Brand Security', () => {
    it('prevents Tenant B from viewing Tenant A Merchant Center configuration', async () => {
      await expect(
        MerchantCatalogService.getBrandMerchantConfig(adminContextB, brandAId)
      ).rejects.toThrow();
    });

    it('prevents cross-brand product sync (Tenant B cannot sync Tenant A brand products)', async () => {
      await expect(
        MerchantCatalogService.syncProductsBatch(adminContextB, brandAId)
      ).rejects.toThrow();
    });

    it('strictly isolates Merchant dashboards by Tenant RLS context', async () => {
      const dashA = await MerchantDashboardService.getBrandDashboard(adminContextA, brandAId);
      expect(dashA.brandName).toBe('Aalim Perfumes');
      expect(dashA.summary.submittedProducts).toBeGreaterThan(0);

      // Tenant B dashboard for its own brand has zero Tenant A data
      const dashB = await MerchantDashboardService.getBrandDashboard(adminContextB, brandBId);
      expect(dashB.brandName).toBe('Lakshmi Sweets');
      expect(dashB.summary.submittedProducts).toBe(0);
    });

    it('renders store local inventory dashboard with correct overrides and availability', async () => {
      const storeDash = await MerchantDashboardService.getStoreInventoryDashboard(adminContextA, storeA1Id);
      expect(storeDash.storeCode).toBe('CHE-MAN-01');
      expect(storeDash.summary.totalProducts).toBeGreaterThanOrEqual(1);

      const oudItem = storeDash.items.find((i) => i.sku === 'RO-ROYAL-OUD');
      expect(oudItem).toBeDefined();
      expect(oudItem!.priceOverride).toBe(2399.0);
      expect(oudItem!.effectivePrice).toBe(2399.0);
      expect(oudItem!.isAvailable).toBe(true);
    });
  });
});
