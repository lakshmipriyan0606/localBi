import { Prisma } from '@prisma/client';
import { ListingsReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class ListingsReportingAdapter {
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<ListingsReportDto> {
    const { tenant, brand, selectedStoreIds, comparisonRange } = context;

    try {
      const storeFilter = selectedStoreIds.length > 0 ? { storeId: { in: selectedStoreIds } } : {};

      // 1. Fetch directory listings
      const listings = await tx.directoryListing.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          ...storeFilter,
        },
        select: {
          provider: true,
          napOverallStatus: true,
        },
      });

      if (listings.length === 0) {
        return this.emptyReport('NO_DATA');
      }

      // Distinct providers checked
      const distinctProviders = Array.from(new Set(listings.map((l) => l.provider)));
      const providersChecked = distinctProviders.length;

      const healthyCount = listings.filter((l) => l.napOverallStatus === 'MATCH').length;
      const needsReviewCount = listings.filter((l) => l.napOverallStatus !== 'MATCH').length;

      // 2. Fetch open duplicate candidates
      const duplicatesCount = await tx.duplicateListingCandidate.count({
        where: {
          tenantId: tenant.id,
          ...storeFilter,
          status: 'OPEN',
        },
      });

      // Provider breakdown
      const providerSummary = distinctProviders.map((provider) => {
        const provListings = listings.filter((l) => l.provider === provider);
        const healthy = provListings.filter((l) => l.napOverallStatus === 'MATCH').length;
        return {
          provider,
          total: provListings.length,
          healthy,
          issues: provListings.length - healthy,
        };
      });

      const baseline = comparisonRange?.label;

      return {
        state: 'DATA',
        metrics: {
          providersChecked,
          healthyCount: ComparisonEngine.calculate(healthyCount, null, { baselineLabel: baseline }),
          needsReviewCount: ComparisonEngine.calculate(needsReviewCount, null, { baselineLabel: baseline, higherIsBetter: false }),
          duplicatesCount: ComparisonEngine.calculate(duplicatesCount, null, { baselineLabel: baseline, higherIsBetter: false }),
        },
        providerSummary,
      };
    } catch (err) {
      return this.emptyReport('UPSTREAM_ERROR');
    }
  }

  private static emptyReport(state: ModuleReportState): ListingsReportDto {
    return {
      state,
      metrics: {
        providersChecked: 0,
        healthyCount: ComparisonEngine.calculate(0, null),
        needsReviewCount: ComparisonEngine.calculate(0, null),
        duplicatesCount: ComparisonEngine.calculate(0, null),
      },
      providerSummary: [],
    };
  }
}
