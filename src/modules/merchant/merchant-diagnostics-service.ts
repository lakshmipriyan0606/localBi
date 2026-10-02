import { Prisma } from '@prisma/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { AppError } from '@/shared/errors';
import { MerchantClientRegistry, MerchantIssueSeverity } from './merchant-client';

export interface IngestDiagnosticsResult {
  offerId: string;
  previousStatus?: string | null | undefined;
  newStatus: string;
  newIssuesCount: number;
  resolvedIssuesCount: number;
}

export class MerchantDiagnosticsService {
  /**
   * Reconcile and ingest diagnostics for a mapped product from Merchant Center.
   * Tracks issue lifecycle and marks recovered issues as resolved.
   */
  public static async syncProductDiagnostics(
    context: AuthorizedContext,
    productId: string
  ): Promise<IngestDiagnosticsResult> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return await TenantContextService.runWithContext(context, async (tx) => {
      const mapping = await tx.merchantProductMapping.findFirst({
        where: {
          tenantId: context.tenantId,
          productId,
        },
      });

      if (!mapping) {
        throw new AppError({
          code: 'MERCHANT_MAPPING_NOT_FOUND',
          message: `Product "${productId}" has not been submitted to Google Merchant Center.`,
          statusCode: 404,
          isOperational: true,
        });
      }

      const client = MerchantClientRegistry.getClient();
      const statusRes = await client.getProductStatus({
        merchantAccountId: mapping.merchantAccountId,
        offerId: mapping.offerId,
      });

      const now = new Date();
      const incomingIssues = statusRes.issues || [];
      const incomingIssueCodes = new Set(incomingIssues.map((i) => i.code));

      // 1. Fetch current active issues for this mapping
      const currentIssues = await tx.merchantProductIssue.findMany({
        where: {
          tenantId: context.tenantId,
          mappingId: mapping.id,
          isResolved: false,
        },
      });

      let newIssuesCount = 0;
      let resolvedIssuesCount = 0;

      // 2. Mark missing issues as resolved (Diagnostic Recovery - Section 75)
      for (const cur of currentIssues) {
        if (!incomingIssueCodes.has(cur.code)) {
          await tx.merchantProductIssue.update({
            where: { id: cur.id },
            data: {
              isResolved: true,
              resolvedAt: now,
              lastSeenAt: now,
            },
          });
          resolvedIssuesCount++;
        }
      }

      // 3. Upsert current incoming issues
      for (const iss of incomingIssues) {
        const existing = currentIssues.find((c) => c.code === iss.code);
        if (existing) {
          await tx.merchantProductIssue.update({
            where: { id: existing.id },
            data: {
              lastSeenAt: now,
              severity: iss.severity,
              message: iss.message,
              detail: iss.detail || null,
              attributeName: iss.attributeName || null,
            },
          });
        } else {
          await tx.merchantProductIssue.create({
            data: {
              tenantId: context.tenantId,
              brandId: mapping.brandId,
              mappingId: mapping.id,
              productId: mapping.productId,
              code: iss.code,
              severity: iss.severity,
              attributeName: iss.attributeName || null,
              message: iss.message,
              detail: iss.detail || null,
              firstSeenAt: now,
              lastSeenAt: now,
              isResolved: false,
            },
          });
          newIssuesCount++;
        }
      }

      // 4. Update mapping providerStatus
      const previousStatus = mapping.providerStatus;
      const newStatus = statusRes.status;
      const syncStatus = newStatus === 'approved' ? 'APPROVED' : newStatus === 'disapproved' ? 'DISAPPROVED' : 'PROCESSING';

      await tx.merchantProductMapping.update({
        where: { id: mapping.id },
        data: {
          providerStatus: newStatus,
          syncStatus,
          lastCheckedAt: now,
        },
      });

      return {
        offerId: mapping.offerId,
        previousStatus,
        newStatus,
        newIssuesCount,
        resolvedIssuesCount,
      };
    });
  }

  /**
   * List diagnostics and issues for a Brand.
   */
  public static async listBrandIssues(
    context: AuthorizedContext,
    brandId: string,
    filters: {
      severity?: MerchantIssueSeverity;
      isResolved?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return await TenantContextService.runWithContext(context, async (tx) => {
      const where: Prisma.MerchantProductIssueWhereInput = {
        tenantId: context.tenantId,
        brandId,
        ...(filters.severity ? { severity: filters.severity } : {}),
        ...(filters.isResolved !== undefined ? { isResolved: filters.isResolved } : { isResolved: false }),
      };

      const [items, total] = await Promise.all([
        tx.merchantProductIssue.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                basePrice: true,
              },
            },
          },
          orderBy: { lastSeenAt: 'desc' },
          take: filters.limit || 50,
          skip: filters.offset || 0,
        }),
        tx.merchantProductIssue.count({ where }),
      ]);

      return { items, total };
    });
  }
}
