import { Prisma } from '@prisma/client';
import { OpportunitiesSummaryDto, ModuleReportState } from '../reporting-types';
import { ClientReportContext } from '../client-report-context-service';

export class OpportunitiesReportingAdapter {
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<OpportunitiesSummaryDto> {
    const { tenant, brand } = context;

    try {
      const opportunities = await tx.opportunity.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
        },
        select: {
          id: true,
          title: true,
          priority: true,
          priorityScore: true,
          status: true,
        },
        orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
      });

      const openCount = opportunities.filter((o) => o.status === 'OPEN').length;
      const highPriorityCount = opportunities.filter((o) => o.status === 'OPEN' && o.priority === 'HIGH').length;
      const completedCount = opportunities.filter((o) => o.status === 'COMPLETED').length;

      const topOpportunities = opportunities
        .filter((o) => o.status === 'OPEN')
        .slice(0, 5)
        .map((o) => ({
          id: o.id,
          title: o.title,
          priority: o.priority,
          impactScore: o.priorityScore,
          status: o.status,
        }));

      const state: ModuleReportState = opportunities.length > 0 ? 'DATA' : 'NO_DATA';

      return {
        state,
        metrics: {
          openCount,
          highPriorityCount,
          completedCount,
        },
        topOpportunities,
      };
    } catch (err) {
      return {
        state: 'UPSTREAM_ERROR',
        metrics: {
          openCount: 0,
          highPriorityCount: 0,
          completedCount: 0,
        },
        topOpportunities: [],
      };
    }
  }
}
