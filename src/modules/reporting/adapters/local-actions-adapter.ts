import { Prisma, AttributionEventType } from '@prisma/client';
import { LocalActionsReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class LocalActionsReportingAdapter {
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<LocalActionsReportDto> {
    const { tenant, brand, selectedStoreIds, dateRange, comparisonRange } = context;

    try {
      const curStart = new Date(dateRange.startDate + 'T00:00:00.000Z');
      const curEnd = new Date(dateRange.endDate + 'T23:59:59.999Z');

      const storeFilter = selectedStoreIds.length > 0 ? { storeId: { in: selectedStoreIds } } : {};

      // 1. Current Period Counts
      const currentEvents = await tx.attributionEvent.groupBy({
        by: ['eventType'],
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          ...storeFilter,
          occurredAt: { gte: curStart, lte: curEnd },
        },
        _count: { id: true },
      });

      const getCount = (type: AttributionEventType) => {
        return currentEvents.find((e) => e.eventType === type)?._count.id || 0;
      };

      const curCalls = getCount(AttributionEventType.CALL_CLICK);
      const curWhatsapp = getCount(AttributionEventType.WHATSAPP_CLICK);
      const curDirections = getCount(AttributionEventType.DIRECTIONS_CLICK);
      const curForms = getCount(AttributionEventType.FORM_SUBMIT);
      const curBookings = getCount(AttributionEventType.BOOKING_COMPLETE);
      const curTotal = curCalls + curWhatsapp + curDirections + curForms + curBookings;

      // 2. Comparison Period Counts
      let prevCalls: number | null = null;
      let prevWhatsapp: number | null = null;
      let prevDirections: number | null = null;
      let prevForms: number | null = null;
      let prevBookings: number | null = null;
      let prevTotal: number | null = null;

      if (comparisonRange?.enabled) {
        const prevStart = new Date(comparisonRange.startDate + 'T00:00:00.000Z');
        const prevEnd = new Date(comparisonRange.endDate + 'T23:59:59.999Z');

        const prevEvents = await tx.attributionEvent.groupBy({
          by: ['eventType'],
          where: {
            tenantId: tenant.id,
            brandId: brand.id,
            ...storeFilter,
            occurredAt: { gte: prevStart, lte: prevEnd },
          },
          _count: { id: true },
        });

        const getPrevCount = (type: AttributionEventType) => {
          return prevEvents.find((e) => e.eventType === type)?._count.id || 0;
        };

        prevCalls = getPrevCount(AttributionEventType.CALL_CLICK);
        prevWhatsapp = getPrevCount(AttributionEventType.WHATSAPP_CLICK);
        prevDirections = getPrevCount(AttributionEventType.DIRECTIONS_CLICK);
        prevForms = getPrevCount(AttributionEventType.FORM_SUBMIT);
        prevBookings = getPrevCount(AttributionEventType.BOOKING_COMPLETE);
        prevTotal = prevCalls + prevWhatsapp + prevDirections + prevForms + prevBookings;
      }

      const baseline = comparisonRange?.label;

      const byChannel = [
        { channel: 'Phone Calls', count: curCalls, percentage: curTotal > 0 ? (curCalls / curTotal) * 100 : 0 },
        { channel: 'WhatsApp Chats', count: curWhatsapp, percentage: curTotal > 0 ? (curWhatsapp / curTotal) * 100 : 0 },
        { channel: 'Direction Requests', count: curDirections, percentage: curTotal > 0 ? (curDirections / curTotal) * 100 : 0 },
        { channel: 'Form Submissions', count: curForms, percentage: curTotal > 0 ? (curForms / curTotal) * 100 : 0 },
        { channel: 'Bookings', count: curBookings, percentage: curTotal > 0 ? (curBookings / curTotal) * 100 : 0 },
      ].sort((a, b) => b.count - a.count);

      const hasData = curTotal > 0;
      const state: ModuleReportState = hasData ? 'DATA' : 'NO_DATA';

      return {
        state,
        metrics: {
          calls: ComparisonEngine.calculate(curCalls, prevCalls, { baselineLabel: baseline }),
          whatsapp: ComparisonEngine.calculate(curWhatsapp, prevWhatsapp, { baselineLabel: baseline }),
          directions: ComparisonEngine.calculate(curDirections, prevDirections, { baselineLabel: baseline }),
          formLeads: ComparisonEngine.calculate(curForms, prevForms, { baselineLabel: baseline }),
          bookings: ComparisonEngine.calculate(curBookings, prevBookings, { baselineLabel: baseline }),
          totalActions: ComparisonEngine.calculate(curTotal, prevTotal, { baselineLabel: baseline }),
        },
        byChannel,
      };
    } catch (err) {
      return {
        state: 'UPSTREAM_ERROR',
        metrics: {
          calls: ComparisonEngine.calculate(0, null),
          whatsapp: ComparisonEngine.calculate(0, null),
          directions: ComparisonEngine.calculate(0, null),
          formLeads: ComparisonEngine.calculate(0, null),
          bookings: ComparisonEngine.calculate(0, null),
          totalActions: ComparisonEngine.calculate(0, null),
        },
        byChannel: [],
      };
    }
  }
}
