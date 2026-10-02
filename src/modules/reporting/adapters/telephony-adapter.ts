import { Prisma } from '@prisma/client';
import { TelephonyReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class TelephonyReportingAdapter {
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<TelephonyReportDto> {
    const { tenant, brand, selectedStoreIds, dateRange, comparisonRange } = context;

    try {
      const curStart = new Date(dateRange.startDate + 'T00:00:00.000Z');
      const curEnd = new Date(dateRange.endDate + 'T23:59:59.999Z');

      const storeFilter = selectedStoreIds.length > 0 ? { storeId: { in: selectedStoreIds } } : {};

      // 1. Current Period Calls
      const currentCalls = await tx.call.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          ...storeFilter,
          startedAt: { gte: curStart, lte: curEnd },
        },
        include: {
          store: {
            select: { name: true },
          },
        },
        orderBy: { startedAt: 'desc' },
      });

      const curCount = currentCalls.length;
      const curAnswered = currentCalls.filter(
        (c) => c.status === 'COMPLETED' || c.status === 'ANSWERED'
      ).length;
      const curAnsweredRate = curCount > 0 ? (curAnswered / curCount) * 100 : 0;
      const curTalkSeconds = currentCalls.reduce((sum, c) => sum + (c.talkDurationSeconds || 0), 0);
      const curTalkMinutes = Number((curTalkSeconds / 60).toFixed(1));
      const curAvgDuration = curCount > 0 ? Math.round(curTalkSeconds / curCount) : 0;

      // 2. Comparison Period Calls
      let prevCount: number | null = null;
      let prevAnsweredRate: number | null = null;
      let prevTalkMinutes: number | null = null;
      let prevAvgDuration: number | null = null;

      if (comparisonRange?.enabled) {
        const prevStart = new Date(comparisonRange.startDate + 'T00:00:00.000Z');
        const prevEnd = new Date(comparisonRange.endDate + 'T23:59:59.999Z');

        const prevCalls = await tx.call.findMany({
          where: {
            tenantId: tenant.id,
            brandId: brand.id,
            ...storeFilter,
            startedAt: { gte: prevStart, lte: prevEnd },
          },
          select: {
            status: true,
            talkDurationSeconds: true,
          },
        });

        prevCount = prevCalls.length;
        const prevAnswered = prevCalls.filter(
          (c) => c.status === 'COMPLETED' || c.status === 'ANSWERED'
        ).length;
        prevAnsweredRate = prevCount > 0 ? (prevAnswered / prevCount) * 100 : 0;
        const prevTalkSecs = prevCalls.reduce((sum, c) => sum + (c.talkDurationSeconds || 0), 0);
        prevTalkMinutes = Number((prevTalkSecs / 60).toFixed(1));
        prevAvgDuration = prevCount > 0 ? Math.round(prevTalkSecs / prevCount) : 0;
      }

      const baseline = comparisonRange?.label;

      const recentCalls = currentCalls.slice(0, 5).map((c) => ({
        id: c.id,
        startedAt: c.startedAt.toISOString(),
        storeName: c.store?.name || 'Unassigned Store',
        callerMasked: c.callerNumberMasked || 'Anonymous',
        status: c.status,
        duration: c.durationSeconds,
      }));

      const hasData = curCount > 0;
      const state: ModuleReportState = hasData ? 'DATA' : 'NO_DATA';

      return {
        state,
        metrics: {
          inboundCalls: ComparisonEngine.calculate(curCount, prevCount, { baselineLabel: baseline }),
          answeredRate: ComparisonEngine.calculate(curAnsweredRate, prevAnsweredRate, { baselineLabel: baseline }),
          totalTalkMinutes: ComparisonEngine.calculate(curTalkMinutes, prevTalkMinutes, { baselineLabel: baseline }),
          avgDurationSeconds: ComparisonEngine.calculate(curAvgDuration, prevAvgDuration, { baselineLabel: baseline }),
        },
        recentCalls,
      };
    } catch (err) {
      return {
        state: 'UPSTREAM_ERROR',
        metrics: {
          inboundCalls: ComparisonEngine.calculate(0, null),
          answeredRate: ComparisonEngine.calculate(0, null),
          totalTalkMinutes: ComparisonEngine.calculate(0, null),
          avgDurationSeconds: ComparisonEngine.calculate(0, null),
        },
        recentCalls: [],
      };
    }
  }
}
