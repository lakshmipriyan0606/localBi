import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { AppError, createResourceNotFoundError } from '@/shared/errors';
import { MerchantClientRegistry, MerchantProductInput, MerchantLocalInventoryInput } from './merchant-client';
import { MerchantEligibilityService } from './merchant-eligibility-service';

export interface SyncProductOptions {
  force?: boolean | undefined;
}

export interface SyncBatchResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    productId: string;
    offerId?: string | undefined;
    success: boolean;
    error?: string | undefined;
  }>;
}

export class MerchantCatalogService {
  /**
   * Deterministic SHA-256 hash for payload change detection.
   */
  public static computePayloadHash(data: Record<string, any>): string {
    const sortedKeys = Object.keys(data).sort();
    const normalized: Record<string, any> = {};
    for (const key of sortedKeys) {
      if (data[key] !== undefined && data[key] !== null) {
        normalized[key] = data[key];
      }
    }
    return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  }

  /**
   * Resolve stable offer ID for a product.
   * Invariant: Derived strictly from SKU. Changing product title never changes offerId.
   */
  public static resolveOfferId(_brandSlug: string, sku: string): string {
    const cleanSku = (sku || '').trim().toUpperCase();
    if (!cleanSku) {
      throw new AppError({
        code: 'SKU_REQUIRED',
        message: 'Product SKU is required to generate a stable Merchant Center offer ID.',
        statusCode: 400,
        isOperational: true,
      });
    }
    return cleanSku;
  }

  /**
   * Discover accessible Google Merchant accounts for a given Google connection.
   */
  public static async discoverAccounts(
    context: AuthorizedContext,
    connectionId: string
  ) {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);
    const client = MerchantClientRegistry.getClient();
    return await client.listAccessibleAccounts(connectionId);
  }

  /**
   * Map Brand to a specific Google Merchant Center account.
   */
  public static async mapBrandToMerchantAccount(
    context: AuthorizedContext,
    params: {
      brandId: string;
      merchantAccountId: string;
      targetCountry?: string;
      contentLanguage?: string;
      defaultCurrency?: string;
      feedLabel?: string;
    }
  ) {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);

    return await TenantContextService.runWithContext(context, async (tx) => {
      // 1. Verify Brand exists and belongs to authorized tenant
      const brand = await tx.brand.findUnique({
        where: {
          uq_brand_tenant_id: {
            tenantId: context.tenantId,
            id: params.brandId,
          },
        },
      });

      if (!brand) {
        throw createResourceNotFoundError('Brand', params.brandId);
      }

      // 2. Upsert Brand Merchant Configuration
      const config = await tx.merchantBrandConfig.upsert({
        where: {
          uq_merchant_brand_config: {
            tenantId: context.tenantId,
            brandId: params.brandId,
          },
        },
        create: {
          tenantId: context.tenantId,
          brandId: params.brandId,
          merchantAccountId: params.merchantAccountId,
          targetCountry: params.targetCountry || 'IN',
          contentLanguage: params.contentLanguage || 'en',
          defaultCurrency: params.defaultCurrency || 'INR',
          feedLabel: params.feedLabel || null,
          autoSyncEnabled: true,
          lastSyncStatus: 'IDLE',
        },
        update: {
          merchantAccountId: params.merchantAccountId,
          targetCountry: params.targetCountry || 'IN',
          contentLanguage: params.contentLanguage || 'en',
          defaultCurrency: params.defaultCurrency || 'INR',
          feedLabel: params.feedLabel || null,
        },
      });

      return config;
    });
  }

  /**
   * Get Merchant configuration for a Brand.
   */
  public static async getBrandMerchantConfig(
    context: AuthorizedContext,
    brandId: string
  ) {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return await TenantContextService.runWithContext(context, async (tx) => {
      const brand = await tx.brand.findUnique({
        where: {
          uq_brand_tenant_id: {
            tenantId: context.tenantId,
            id: brandId,
          },
        },
      });

      if (!brand) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      return await tx.merchantBrandConfig.findUnique({
        where: {
          uq_merchant_brand_config: {
            tenantId: context.tenantId,
            brandId,
          },
        },
      });
    });
  }

  /**
   * Sync a single product to Google Merchant Center.
   */
  public static async syncProduct(
    context: AuthorizedContext,
    productId: string,
    options: SyncProductOptions = {}
  ): Promise<{ success: boolean; offerId: string; syncStatus: string; error?: string | undefined }> {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);

    return await TenantContextService.runWithContext(context, async (tx) => {
      // 1. Fetch Product with Brand, Media, and StoreProducts
      const product = await tx.product.findUnique({
        where: {
          uq_product_tenant_id: {
            tenantId: context.tenantId,
            id: productId,
          },
        },
        include: {
          brand: true,
          media: {
            orderBy: { sortOrder: 'asc' },
          },
          merchantConfig: true,
          merchantMapping: true,
          storeProducts: {
            include: {
              store: true,
            },
          },
        },
      });

      if (!product) {
        throw createResourceNotFoundError('Product', productId);
      }

      // 2. Fetch Brand Merchant Config
      const brandConfig = await tx.merchantBrandConfig.findUnique({
        where: {
          uq_merchant_brand_config: {
            tenantId: context.tenantId,
            brandId: product.brandId,
          },
        },
      });

      if (!brandConfig) {
        throw new AppError({
          code: 'MERCHANT_NOT_CONFIGURED',
          message: `Brand "${product.brand.name}" has no Google Merchant Center account mapped.`,
          statusCode: 400,
          isOperational: true,
        });
      }

      // 3. Check Eligibility
      const primaryImage = product.media.find((m) => m.type === 'IMAGE' && m.url) || product.media[0];
      const eligibility = MerchantEligibilityService.validate({
        id: product.id,
        name: product.name,
        description: product.description,
        basePrice: product.basePrice ? Number(product.basePrice) : null,
        currency: product.currency,
        publishStatus: product.publishStatus,
        status: product.status,
        sku: product.sku,
        media: product.media.map((m) => ({ url: m.url, type: m.type })),
        brandName: product.merchantConfig?.brandName || product.brand.name,
        gtin: product.merchantConfig?.gtin || null,
        mpn: product.merchantConfig?.mpn || product.sku,
        condition: product.merchantConfig?.condition || 'new',
      });

      if (!eligibility.isEligible) {
        const primaryError = eligibility.issues.find((i) => i.severity === 'ERROR')?.message || 'Product data incomplete';
        // Record mapping with error state
        await tx.merchantProductMapping.upsert({
          where: {
            uq_merchant_prod_mapping_brand: {
              tenantId: context.tenantId,
              brandId: product.brandId,
              productId: product.id,
            },
          },
          create: {
            tenantId: context.tenantId,
            brandId: product.brandId,
            productId: product.id,
            merchantAccountId: brandConfig.merchantAccountId,
            offerId: product.sku,
            syncStatus: 'ERROR',
            lastError: primaryError,
          },
          update: {
            syncStatus: 'ERROR',
            lastError: primaryError,
          },
        });

        return {
          success: false,
          offerId: product.sku,
          syncStatus: 'ERROR',
          error: primaryError,
        };
      }

      const offerId = this.resolveOfferId(product.brand.slug, product.sku);
      const targetCountry = brandConfig.targetCountry || 'IN';
      const contentLanguage = brandConfig.contentLanguage || 'en';
      const priceVal = Number(product.basePrice!).toFixed(2);
      const currency = product.currency || brandConfig.defaultCurrency || 'INR';

      // 4. Build canonical outbound payload
      const outboundPayload: MerchantProductInput = {
        offerId,
        title: product.name,
        description: product.description || product.name,
        link: `https://${product.brand.slug}.localbi.app/products/${product.slug || product.id}`,
        imageLink: primaryImage!.url,
        contentLanguage,
        targetCountry,
        feedLabel: brandConfig.feedLabel || undefined,
        channel: 'online_and_local',
        availability: 'in_stock',
        price: {
          value: priceVal,
          currency,
        },
        condition: (product.merchantConfig?.condition as any) || 'new',
        brand: product.merchantConfig?.brandName || product.brand.name,
        gtin: product.merchantConfig?.gtin || undefined,
        mpn: product.merchantConfig?.mpn || product.sku,
        googleProductCategory: product.merchantConfig?.googleProductCategory || undefined,
        productType: product.merchantConfig?.productType || undefined,
      };

      // 5. Change detection via SHA-256 payload hash
      const payloadHash = this.computePayloadHash(outboundPayload);
      const existingMapping = product.merchantMapping;

      if (
        !options.force &&
        existingMapping &&
        existingMapping.payloadHash === payloadHash &&
        existingMapping.syncStatus === 'APPROVED'
      ) {
        // Payload unchanged, skip unnecessary provider call
        return {
          success: true,
          offerId,
          syncStatus: existingMapping.syncStatus,
        };
      }

      // 6. Submit to Merchant Center via client
      const client = MerchantClientRegistry.getClient();
      const submission = await client.insertProduct({
        merchantAccountId: brandConfig.merchantAccountId,
        product: outboundPayload,
      });

      const now = new Date();
      if (!submission.success) {
        await tx.merchantProductMapping.upsert({
          where: {
            uq_merchant_prod_mapping_brand: {
              tenantId: context.tenantId,
              brandId: product.brandId,
              productId: product.id,
            },
          },
          create: {
            tenantId: context.tenantId,
            brandId: product.brandId,
            productId: product.id,
            merchantAccountId: brandConfig.merchantAccountId,
            offerId,
            targetCountry,
            contentLanguage,
            feedLabel: brandConfig.feedLabel || null,
            syncStatus: 'ERROR',
            lastSubmittedAt: now,
            lastError: submission.error || 'Provider rejected product submission',
          },
          update: {
            merchantAccountId: brandConfig.merchantAccountId,
            offerId,
            syncStatus: 'ERROR',
            lastSubmittedAt: now,
            lastError: submission.error || 'Provider rejected product submission',
          },
        });

        return {
          success: false,
          offerId,
          syncStatus: 'ERROR',
          error: submission.error,
        };
      }

      // 7. Successful submission -> record APPROVED / SUBMITTED mapping
      const mapping = await tx.merchantProductMapping.upsert({
        where: {
          uq_merchant_prod_mapping_brand: {
            tenantId: context.tenantId,
            brandId: product.brandId,
            productId: product.id,
          },
        },
        create: {
          tenantId: context.tenantId,
          brandId: product.brandId,
          productId: product.id,
          merchantAccountId: brandConfig.merchantAccountId,
          offerId,
          targetCountry,
          contentLanguage,
          feedLabel: brandConfig.feedLabel || null,
          channel: 'online_and_local',
          syncStatus: 'APPROVED',
          providerStatus: 'approved',
          payloadHash,
          submittedPrice: new Prisma.Decimal(priceVal),
          submittedCurrency: currency,
          lastSubmittedAt: now,
          lastSuccessfulSyncAt: now,
          lastCheckedAt: now,
          lastError: null,
        },
        update: {
          merchantAccountId: brandConfig.merchantAccountId,
          offerId,
          targetCountry,
          contentLanguage,
          feedLabel: brandConfig.feedLabel || null,
          channel: 'online_and_local',
          syncStatus: 'APPROVED',
          providerStatus: 'approved',
          payloadHash,
          submittedPrice: new Prisma.Decimal(priceVal),
          submittedCurrency: currency,
          lastSubmittedAt: now,
          lastSuccessfulSyncAt: now,
          lastCheckedAt: now,
          lastError: null,
        },
      });

      // 8. Synchronize local inventory for mapped StoreProducts
      if (product.storeProducts && product.storeProducts.length > 0) {
        for (const sp of product.storeProducts) {
          if (!sp.store.storeCode) continue;

          // Price override resolution: StoreProduct.priceOverride ?? Product.basePrice
          const effectivePrice = sp.priceOverride ? Number(sp.priceOverride) : Number(product.basePrice);
          const effectiveAvailability: 'in_stock' | 'out_of_stock' =
            sp.isAvailable && product.publishStatus === 'PUBLISHED' && product.status === 'ACTIVE'
              ? 'in_stock'
              : 'out_of_stock';

          const invPayload: MerchantLocalInventoryInput = {
            storeCode: sp.store.storeCode,
            price: {
              value: effectivePrice.toFixed(2),
              currency,
            },
            availability: effectiveAvailability,
            quantity: sp.quantity ?? 0,
          };

          const invHash = this.computePayloadHash(invPayload);
          const invSub = await client.insertLocalInventory({
            merchantAccountId: brandConfig.merchantAccountId,
            offerId,
            inventory: invPayload,
          });

          await tx.merchantLocalInventoryState.upsert({
            where: {
              uq_merchant_local_inventory_store_prod: {
                tenantId: context.tenantId,
                storeId: sp.storeId,
                productId: product.id,
              },
            },
            create: {
              tenantId: context.tenantId,
              brandId: product.brandId,
              storeId: sp.storeId,
              productId: product.id,
              mappingId: mapping.id,
              storeCode: sp.store.storeCode,
              submittedPrice: new Prisma.Decimal(effectivePrice.toFixed(2)),
              submittedCurrency: currency,
              submittedAvailability: effectiveAvailability,
              submittedQuantity: sp.quantity ?? 0,
              syncStatus: invSub.success ? 'SYNCED' : 'ERROR',
              providerStatus: invSub.success ? 'synced' : 'error',
              payloadHash: invHash,
              lastSubmittedAt: now,
              lastCheckedAt: now,
              lastError: invSub.error || null,
            },
            update: {
              mappingId: mapping.id,
              storeCode: sp.store.storeCode,
              submittedPrice: new Prisma.Decimal(effectivePrice.toFixed(2)),
              submittedCurrency: currency,
              submittedAvailability: effectiveAvailability,
              submittedQuantity: sp.quantity ?? 0,
              syncStatus: invSub.success ? 'SYNCED' : 'ERROR',
              providerStatus: invSub.success ? 'synced' : 'error',
              payloadHash: invHash,
              lastSubmittedAt: now,
              lastCheckedAt: now,
              lastError: invSub.error || null,
            },
          });
        }
      }

      return {
        success: true,
        offerId,
        syncStatus: 'APPROVED',
      };
    });
  }

  /**
   * Bulk Product Sync with partial batch failure handling.
   * Invariant (Section 36): If 90 succeed and 10 fail, preserves 90 successes and reports 10 failures.
   */
  public static async syncProductsBatch(
    context: AuthorizedContext,
    brandId: string,
    productIds?: string[],
    options: SyncProductOptions = {}
  ): Promise<SyncBatchResult> {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);

    // Verify brand ownership first
    await TenantContextService.runWithContext(context, async (tx) => {
      const brand = await tx.brand.findUnique({
        where: {
          uq_brand_tenant_id: {
            tenantId: context.tenantId,
            id: brandId,
          },
        },
      });
      if (!brand) {
        throw createResourceNotFoundError('Brand', brandId);
      }
    });

    // 1. Resolve product IDs to sync
    let targetProductIds = productIds;
    if (!targetProductIds || targetProductIds.length === 0) {
      const prods = await TenantContextService.runWithContext(context, async (tx) => {
        return await tx.product.findMany({
          where: {
            tenantId: context.tenantId,
            brandId,
            publishStatus: 'PUBLISHED',
            status: 'ACTIVE',
          },
          select: { id: true },
        });
      });
      targetProductIds = prods.map((p) => p.id);
    }

    const results: Array<{ productId: string; offerId?: string | undefined; success: boolean; error?: string | undefined }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const pid of targetProductIds) {
      try {
        const res = await this.syncProduct(context, pid, options);
        if (res.success) {
          succeeded++;
          results.push({ productId: pid, offerId: res.offerId, success: true });
        } else {
          failed++;
          results.push({ productId: pid, offerId: res.offerId, success: false, error: res.error });
        }
      } catch (err: any) {
        failed++;
        results.push({ productId: pid, success: false, error: err.message });
      }
    }

    return {
      total: targetProductIds.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Sync local inventory for a specific store.
   */
  public static async syncStoreInventory(
    context: AuthorizedContext,
    storeId: string,
    _options: SyncProductOptions = {}
  ) {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);

    return await TenantContextService.runWithContext(context, async (tx) => {
      const store = await tx.location.findUnique({
        where: {
          uq_location_tenant_id: {
            tenantId: context.tenantId,
            id: storeId,
          },
        },
        include: {
          brand: true,
          storeProducts: {
            include: {
              product: {
                include: {
                  merchantMapping: true,
                },
              },
            },
          },
        },
      });

      if (!store) {
        throw createResourceNotFoundError('Store', storeId);
      }

      if (!store.storeCode) {
        throw new AppError({
          code: 'STORE_CODE_REQUIRED',
          message: `Store "${store.name}" does not have a configured storeCode. storeCode is required for local inventory.`,
          statusCode: 400,
          isOperational: true,
        });
      }

      const brandConfig = await tx.merchantBrandConfig.findUnique({
        where: {
          uq_merchant_brand_config: {
            tenantId: context.tenantId,
            brandId: store.brandId,
          },
        },
      });

      if (!brandConfig) {
        throw new AppError({
          code: 'MERCHANT_NOT_CONFIGURED',
          message: `Brand "${store.brand.name}" has no Google Merchant Center account mapped.`,
          statusCode: 400,
          isOperational: true,
        });
      }

      const client = MerchantClientRegistry.getClient();
      const now = new Date();
      let syncedCount = 0;
      let errorCount = 0;

      for (const sp of store.storeProducts) {
        const prod = sp.product;
        if (!prod || prod.publishStatus !== 'PUBLISHED' || prod.status !== 'ACTIVE') {
          continue;
        }

        const offerId = prod.merchantMapping?.offerId || this.resolveOfferId(store.brand.slug, prod.sku);
        const effectivePrice = sp.priceOverride ? Number(sp.priceOverride) : Number(prod.basePrice || 0);
        const effectiveAvailability: 'in_stock' | 'out_of_stock' =
          sp.isAvailable && prod.publishStatus === 'PUBLISHED' && prod.status === 'ACTIVE'
            ? 'in_stock'
            : 'out_of_stock';

        const invPayload: MerchantLocalInventoryInput = {
          storeCode: store.storeCode,
          price: {
            value: effectivePrice.toFixed(2),
            currency: prod.currency || brandConfig.defaultCurrency || 'INR',
          },
          availability: effectiveAvailability,
          quantity: sp.quantity ?? 0,
        };

        const payloadHash = this.computePayloadHash(invPayload);

        // Check if mapping exists
        let mapping = prod.merchantMapping;
        if (!mapping) {
          mapping = await tx.merchantProductMapping.upsert({
            where: {
              uq_merchant_prod_mapping_brand: {
                tenantId: context.tenantId,
                brandId: store.brandId,
                productId: prod.id,
              },
            },
            create: {
              tenantId: context.tenantId,
              brandId: store.brandId,
              productId: prod.id,
              merchantAccountId: brandConfig.merchantAccountId,
              offerId,
              targetCountry: brandConfig.targetCountry,
              contentLanguage: brandConfig.contentLanguage,
              syncStatus: 'APPROVED',
              providerStatus: 'approved',
              submittedPrice: new Prisma.Decimal(effectivePrice.toFixed(2)),
              submittedCurrency: prod.currency,
              lastSubmittedAt: now,
            },
            update: {},
          });
        }

        const invSub = await client.insertLocalInventory({
          merchantAccountId: brandConfig.merchantAccountId,
          offerId,
          inventory: invPayload,
        });

        if (invSub.success) {
          syncedCount++;
        } else {
          errorCount++;
        }

        await tx.merchantLocalInventoryState.upsert({
          where: {
            uq_merchant_local_inventory_store_prod: {
              tenantId: context.tenantId,
              storeId: store.id,
              productId: prod.id,
            },
          },
          create: {
            tenantId: context.tenantId,
            brandId: store.brandId,
            storeId: store.id,
            productId: prod.id,
            mappingId: mapping.id,
            storeCode: store.storeCode,
            submittedPrice: new Prisma.Decimal(effectivePrice.toFixed(2)),
            submittedCurrency: prod.currency,
            submittedAvailability: effectiveAvailability,
            submittedQuantity: sp.quantity ?? 0,
            syncStatus: invSub.success ? 'SYNCED' : 'ERROR',
            providerStatus: invSub.success ? 'synced' : 'error',
            payloadHash,
            lastSubmittedAt: now,
            lastCheckedAt: now,
            lastError: invSub.error || null,
          },
          update: {
            mappingId: mapping.id,
            storeCode: store.storeCode,
            submittedPrice: new Prisma.Decimal(effectivePrice.toFixed(2)),
            submittedCurrency: prod.currency,
            submittedAvailability: effectiveAvailability,
            submittedQuantity: sp.quantity ?? 0,
            syncStatus: invSub.success ? 'SYNCED' : 'ERROR',
            providerStatus: invSub.success ? 'synced' : 'error',
            payloadHash,
            lastSubmittedAt: now,
            lastCheckedAt: now,
            lastError: invSub.error || null,
          },
        });
      }

      return {
        storeId,
        storeCode: store.storeCode,
        totalProducts: store.storeProducts.length,
        syncedCount,
        errorCount,
      };
    });
  }

  /**
   * Handle product deactivation or unpublishing.
   * Marks mapping REMOVAL_PENDING and removes from Google Merchant Center.
   */
  public static async deactivateProduct(
    context: AuthorizedContext,
    productId: string
  ) {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);

    return await TenantContextService.runWithContext(context, async (tx) => {
      const mapping = await tx.merchantProductMapping.findFirst({
        where: {
          tenantId: context.tenantId,
          productId,
        },
      });

      if (!mapping) return { success: true };

      const client = MerchantClientRegistry.getClient();
      await client.deleteProduct({
        merchantAccountId: mapping.merchantAccountId,
        offerId: mapping.offerId,
      });

      await tx.merchantProductMapping.update({
        where: { id: mapping.id },
        data: {
          syncStatus: 'REMOVED',
          providerStatus: 'removed',
          lastCheckedAt: new Date(),
        },
      });

      return { success: true };
    });
  }
}
