import { Prisma } from '@prisma/client';
import { MerchantReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class MerchantReportingAdapter {
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<MerchantReportDto> {
    const { tenant, brand, comparisonRange } = context;

    try {
      // 1. Check if Merchant config exists
      const config = await tx.merchantBrandConfig.findFirst({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
        },
      });

      if (!config) {
        return this.emptyReport('NOT_CONNECTED');
      }

      // 2. Fetch products and mappings
      const products = await tx.product.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      const enabledCount = products.length;
      if (enabledCount === 0) {
        return this.emptyReport('NO_DATA');
      }

      const mappings = await tx.merchantProductMapping.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
        },
        select: {
          syncStatus: true,
        },
      });

      const approvedCount = mappings.filter((m) => m.syncStatus === 'APPROVED').length;
      const disapprovedCount = mappings.filter((m) => m.syncStatus === 'DISAPPROVED').length;

      // 3. Fetch local inventory issues
      const inventoryErrors = await tx.merchantProductIssue.count({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          severity: 'ERROR',
        },
      });

      const topIssuesList = await tx.merchantProductIssue.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      const topIssues = topIssuesList.map((i) => ({
        issueCode: i.code,
        affectedProducts: 1,
        severity: i.severity,
      }));

      const baseline = comparisonRange?.label;

      return {
        state: 'DATA',
        metrics: {
          enabledProducts: enabledCount,
          approved: ComparisonEngine.calculate(approvedCount, null, { baselineLabel: baseline }),
          disapproved: ComparisonEngine.calculate(disapprovedCount, null, { baselineLabel: baseline, higherIsBetter: false }),
          inventoryErrors: ComparisonEngine.calculate(inventoryErrors, null, { baselineLabel: baseline, higherIsBetter: false }),
        },
        topIssues,
      };
    } catch (err) {
      return this.emptyReport('UPSTREAM_ERROR');
    }
  }

  private static emptyReport(state: ModuleReportState): MerchantReportDto {
    return {
      state,
      metrics: {
        enabledProducts: 0,
        approved: ComparisonEngine.calculate(0, null),
        disapproved: ComparisonEngine.calculate(0, null),
        inventoryErrors: ComparisonEngine.calculate(0, null),
      },
      topIssues: [],
    };
  }
}
