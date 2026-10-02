import { Prisma } from '@prisma/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { createResourceNotFoundError } from '@/shared/errors';
import { MerchantEligibilityService } from './merchant-eligibility-service';

export interface BrandMerchantDashboard {
  brandId: string;
  brandName: string;
  merchantAccountId?: string | null | undefined;
  targetCountry: string;
  defaultCurrency: string;
  autoSyncEnabled: boolean;
  lastReconciledAt?: Date | null | undefined;
  summary: {
    totalCatalogProducts: number;
    submittedProducts: number;
    approvedProducts: number;
    pendingProducts: number;
    disapprovedProducts: number;
    errorProducts: number;
    notSubmittedProducts: number;
    approvalRate: number; // Disclosed formula: (approved / submitted) * 100
  };
  inventory: {
    participatingStores: number;
    totalInventoryRecords: number;
    syncedRecords: number;
    errorRecords: number;
  };
  topIssues: Array<{
    code: string;
    severity: string;
    count: number;
    message: string;
  }>;
}

export interface StoreInventoryDashboard {
  storeId: string;
  storeName: string;
  storeCode?: string | null;
  brandId: string;
  brandName: string;
  summary: {
    totalProducts: number;
    availableProducts: number;
    syncedInventory: number;
    inventoryErrors: number;
  };
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    basePrice: number;
    priceOverride?: number | null;
    effectivePrice: number;
    isAvailable: boolean;
    quantity: number;
    syncStatus: string;
    lastError?: string | null;
    lastSubmittedAt?: Date | null;
  }>;
}

export class MerchantDashboardService {
  /**
   * Aggregate Brand-level Google Merchant Center metrics.
   */
  public static async getBrandDashboard(
    context: AuthorizedContext,
    brandId: string
  ): Promise<BrandMerchantDashboard> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return await TenantContextService.runWithContext(context, async (tx) => {
      // 1. Verify Brand
      const brand = await tx.brand.findUnique({
        where: {
          uq_brand_tenant_id: {
            tenantId: context.tenantId,
            id: brandId,
          },
        },
        include: {
          merchantBrandConfig: true,
        },
      });

      if (!brand) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      // 2. Count catalog products
      const totalCatalogProducts = await tx.product.count({
        where: {
          tenantId: context.tenantId,
          brandId,
          publishStatus: 'PUBLISHED',
          status: 'ACTIVE',
        },
      });

      // 3. Count product mappings by status
      const mappings = await tx.merchantProductMapping.findMany({
        where: {
          tenantId: context.tenantId,
          brandId,
        },
        select: {
          syncStatus: true,
          providerStatus: true,
        },
      });

      const submittedProducts = mappings.length;
      let approvedProducts = 0;
      let pendingProducts = 0;
      let disapprovedProducts = 0;
      let errorProducts = 0;

      for (const m of mappings) {
        if (m.syncStatus === 'APPROVED' || m.providerStatus === 'approved') {
          approvedProducts++;
        } else if (m.syncStatus === 'DISAPPROVED' || m.providerStatus === 'disapproved') {
          disapprovedProducts++;
        } else if (m.syncStatus === 'ERROR') {
          errorProducts++;
        } else if (['QUEUED', 'SYNCING', 'SUBMITTED', 'PROCESSING'].includes(m.syncStatus)) {
          pendingProducts++;
        }
      }

      const notSubmittedProducts = Math.max(0, totalCatalogProducts - submittedProducts);
      const approvalRate = submittedProducts > 0 ? Math.round((approvedProducts / submittedProducts) * 1000) / 10 : 0;

      // 4. Local inventory stats
      const [totalInventoryRecords, syncedRecords, errorRecords, storeCountResult] = await Promise.all([
        tx.merchantLocalInventoryState.count({
          where: { tenantId: context.tenantId, brandId },
        }),
        tx.merchantLocalInventoryState.count({
          where: { tenantId: context.tenantId, brandId, syncStatus: 'SYNCED' },
        }),
        tx.merchantLocalInventoryState.count({
          where: { tenantId: context.tenantId, brandId, syncStatus: 'ERROR' },
        }),
        tx.location.count({
          where: {
            tenantId: context.tenantId,
            brandId,
            storeCode: { not: null },
            isArchived: false,
          },
        }),
      ]);

      // 5. Active issues aggregated by code
      const activeIssues = await tx.merchantProductIssue.findMany({
        where: {
          tenantId: context.tenantId,
          brandId,
          isResolved: false,
        },
        select: {
          code: true,
          severity: true,
          message: true,
        },
      });

      const issueMap = new Map<string, { code: string; severity: string; message: string; count: number }>();
      for (const iss of activeIssues) {
        const existing = issueMap.get(iss.code);
        if (existing) {
          existing.count++;
        } else {
          issueMap.set(iss.code, {
            code: iss.code,
            severity: iss.severity,
            message: iss.message,
            count: 1,
          });
        }
      }

      const topIssues = Array.from(issueMap.values()).sort((a, b) => b.count - a.count);

      return {
        brandId: brand.id,
        brandName: brand.name,
        merchantAccountId: brand.merchantBrandConfig?.merchantAccountId || null,
        targetCountry: brand.merchantBrandConfig?.targetCountry || 'IN',
        defaultCurrency: brand.merchantBrandConfig?.defaultCurrency || 'INR',
        autoSyncEnabled: brand.merchantBrandConfig?.autoSyncEnabled ?? true,
        lastReconciledAt: brand.merchantBrandConfig?.lastReconciledAt || null,
        summary: {
          totalCatalogProducts,
          submittedProducts,
          approvedProducts,
          pendingProducts,
          disapprovedProducts,
          errorProducts,
          notSubmittedProducts,
          approvalRate,
        },
        inventory: {
          participatingStores: storeCountResult,
          totalInventoryRecords,
          syncedRecords,
          errorRecords,
        },
        topIssues,
      };
    });
  }

  /**
   * Aggregate Store-level Local Inventory dashboard.
   */
  public static async getStoreInventoryDashboard(
    context: AuthorizedContext,
    storeId: string
  ): Promise<StoreInventoryDashboard> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

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
              product: true,
            },
          },
          merchantLocalInventories: true,
        },
      });

      if (!store) {
        throw createResourceNotFoundError('Store', storeId);
      }

      const invMap = new Map<string, any>();
      for (const inv of store.merchantLocalInventories) {
        invMap.set(inv.productId, inv);
      }

      let availableProducts = 0;
      let syncedInventory = 0;
      let inventoryErrors = 0;

      const items = store.storeProducts.map((sp) => {
        if (sp.isAvailable) availableProducts++;
        const inv = invMap.get(sp.productId);
        const basePrice = Number(sp.product.basePrice || 0);
        const priceOverride = sp.priceOverride ? Number(sp.priceOverride) : null;
        const effectivePrice = priceOverride !== null ? priceOverride : basePrice;

        const syncStatus = inv ? inv.syncStatus : 'NOT_SYNCED';
        if (syncStatus === 'SYNCED') syncedInventory++;
        if (syncStatus === 'ERROR') inventoryErrors++;

        return {
          productId: sp.productId,
          name: sp.product.name,
          sku: sp.product.sku,
          basePrice,
          priceOverride,
          effectivePrice,
          isAvailable: sp.isAvailable,
          quantity: sp.quantity ?? 0,
          syncStatus,
          lastError: inv?.lastError || null,
          lastSubmittedAt: inv?.lastSubmittedAt || null,
        };
      });

      return {
        storeId: store.id,
        storeName: store.name,
        storeCode: store.storeCode,
        brandId: store.brandId,
        brandName: store.brand.name,
        summary: {
          totalProducts: items.length,
          availableProducts,
          syncedInventory,
          inventoryErrors,
        },
        items,
      };
    });
  }

  /**
   * Paginated list of products for the Merchant Explorer table.
   */
  public static async listBrandProducts(
    context: AuthorizedContext,
    brandId: string,
    options: {
      page?: number | undefined;
      limit?: number | undefined;
      search?: string | undefined;
      status?: string | undefined; // ALL, APPROVED, PENDING, DISAPPROVED, NOT_SUBMITTED, ERROR
      categoryId?: string | undefined;
    } = {}
  ) {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    return await TenantContextService.runWithContext(context, async (tx) => {
      const where: Prisma.ProductWhereInput = {
        tenantId: context.tenantId,
        brandId,
        ...(options.categoryId ? { categoryId: options.categoryId } : {}),
        ...(options.search
          ? {
              OR: [
                { name: { contains: options.search, mode: 'insensitive' } },
                { sku: { contains: options.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      if (options.status && options.status !== 'ALL') {
        if (options.status === 'NOT_SUBMITTED') {
          where.merchantMapping = null;
        } else {
          where.merchantMapping = {
            syncStatus: options.status,
          };
        }
      }

      const [products, total] = await Promise.all([
        tx.product.findMany({
          where,
          include: {
            brand: true,
            media: { take: 1, orderBy: { sortOrder: 'asc' } },
            merchantConfig: true,
            merchantMapping: true,
            storeProducts: {
              select: {
                storeId: true,
                isAvailable: true,
                priceOverride: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.product.count({ where }),
      ]);

      const items = products.map((p) => {
        const eligibility = MerchantEligibilityService.validate({
          id: p.id,
          name: p.name,
          description: p.description,
          basePrice: p.basePrice ? Number(p.basePrice) : null,
          currency: p.currency,
          publishStatus: p.publishStatus,
          status: p.status,
          sku: p.sku,
          media: p.media.map((m) => ({ url: m.url, type: m.type })),
          brandName: p.merchantConfig?.brandName ?? p.brand?.name ?? null,
          gtin: p.merchantConfig?.gtin ?? null,
          mpn: p.merchantConfig?.mpn ?? p.sku ?? null,
          condition: p.merchantConfig?.condition ?? null,
        });

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          basePrice: Number(p.basePrice || 0),
          currency: p.currency,
          publishStatus: p.publishStatus,
          status: p.status,
          imageUrl: p.media[0]?.url || null,
          eligibility: {
            status: eligibility.status,
            isEligible: eligibility.isEligible,
            issuesCount: eligibility.issues.length,
          },
          merchantStatus: p.merchantMapping?.syncStatus || 'NOT_SUBMITTED',
          providerStatus: p.merchantMapping?.providerStatus || null,
          lastSubmittedAt: p.merchantMapping?.lastSubmittedAt || null,
          lastError: p.merchantMapping?.lastError || null,
          storeCoverageCount: p.storeProducts.length,
        };
      });

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }
}
