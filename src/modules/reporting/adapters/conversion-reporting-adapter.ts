import { Prisma } from '@prisma/client';
import { UnifiedConversionsReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class ConversionReportingAdapter {
  /**
   * Sourced from AttributionEvent (clicks) and Leads / Tracked Calls (confirmed conversions).
   * STRICT GUARDRAIL: Clearly separates unconfirmed website actions (e.g. clicks)
   * from verified conversions (form leads, completed calls). Never sums them indiscriminately.
   */
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<UnifiedConversionsReportDto> {
    const { tenant, brand, selectedStoreIds, dateRange, comparisonRange } = context;

    try {
      const curStart = new Date(dateRange.startDate + 'T00:00:00.000Z');
      const curEnd = new Date(dateRange.endDate + 'T23:59:59.999Z');

      const storeFilter =
        selectedStoreIds && selectedStoreIds.length > 0 ? { storeId: { in: selectedStoreIds } } : {};

      // 1. Current Website Actions (AttributionEvent)
      const currentEvents = await tx.attributionEvent.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          ...storeFilter,
          timestamp: { gte: curStart, lte: curEnd },
        },
        select: { eventType: true },
      });

      // 2. Current Confirmed Leads
      const currentLeads = await tx.lead.count({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          ...storeFilter,
          createdAt: { gte: curStart, lte: curEnd },
        },
      });

      // 3. Current Confirmed Calls (Telephony Call model)
      const currentCalls = await tx.call.count({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          ...storeFilter,
          startedAt: { gte: curStart, lte: curEnd },
        },
      });

      // Comparison period metrics
      let prevEvents: typeof currentEvents = [];
      let prevLeads: number | null = null;
      let prevCalls: number | null = null;

      if (comparisonRange?.enabled) {
        const prevStart = new Date(comparisonRange.startDate + 'T00:00:00.000Z');
        const prevEnd = new Date(comparisonRange.endDate + 'T23:59:59.999Z');

        prevEvents = await tx.attributionEvent.findMany({
          where: {
            tenantId: tenant.id,
            brandId: brand.id,
            ...storeFilter,
            timestamp: { gte: prevStart, lte: prevEnd },
          },
          select: { eventType: true },
        });

        prevLeads = await tx.lead.count({
          where: {
            tenantId: tenant.id,
            brandId: brand.id,
            ...storeFilter,
            createdAt: { gte: prevStart, lte: prevEnd },
          },
        });

        prevCalls = await tx.call.count({
          where: {
            tenantId: tenant.id,
            brandId: brand.id,
            ...storeFilter,
            startedAt: { gte: prevStart, lte: prevEnd },
          },
        });
      }

      // Aggregate current event types
      const curCallClicks = currentEvents.filter((e) => e.eventType === 'CALL_CLICK').length;
      const curWhatsappClicks = currentEvents.filter((e) => e.eventType === 'WHATSAPP_CLICK').length;
      const curDirectionsClicks = currentEvents.filter((e) => e.eventType === 'DIRECTIONS_CLICK').length;
      const curFormStarts = currentEvents.filter((e) => e.eventType === 'FORM_START').length;
      const curTotalActions = currentEvents.length;

      // Aggregate comparison event types
      const prevCallClicks = comparisonRange?.enabled
        ? prevEvents.filter((e) => e.eventType === 'CALL_CLICK').length
        : null;
      const prevWhatsappClicks = comparisonRange?.enabled
        ? prevEvents.filter((e) => e.eventType === 'WHATSAPP_CLICK').length
        : null;
      const prevDirectionsClicks = comparisonRange?.enabled
        ? prevEvents.filter((e) => e.eventType === 'DIRECTIONS_CLICK').length
        : null;
      const prevFormStarts = comparisonRange?.enabled
        ? prevEvents.filter((e) => e.eventType === 'FORM_START').length
        : null;
      const prevTotalActions = comparisonRange?.enabled ? prevEvents.length : null;

      const curTotalConfirmed = currentLeads + currentCalls;
      const prevTotalConfirmed =
        comparisonRange?.enabled && prevLeads !== null && prevCalls !== null
          ? prevLeads + prevCalls
          : null;

      const state: ModuleReportState =
        currentEvents.length > 0 || curTotalConfirmed > 0 ? 'DATA' : 'NO_DATA';

      return {
        state,
        websiteActions: {
          callClicks: ComparisonEngine.calculate(curCallClicks, prevCallClicks, 'INTEGER'),
          whatsappClicks: ComparisonEngine.calculate(curWhatsappClicks, prevWhatsappClicks, 'INTEGER'),
          directionsClicks: ComparisonEngine.calculate(curDirectionsClicks, prevDirectionsClicks, 'INTEGER'),
          formStarts: ComparisonEngine.calculate(curFormStarts, prevFormStarts, 'INTEGER'),
          totalActions: ComparisonEngine.calculate(curTotalActions, prevTotalActions, 'INTEGER'),
        },
        confirmedConversions: {
          formLeads: ComparisonEngine.calculate(currentLeads, prevLeads, 'INTEGER'),
          trackedCalls: ComparisonEngine.calculate(currentCalls, prevCalls, 'INTEGER'),
          bookings: ComparisonEngine.calculate(0, null, 'INTEGER'),
          totalConfirmed: ComparisonEngine.calculate(curTotalConfirmed, prevTotalConfirmed, 'INTEGER'),
        },
        byChannel: [
          { channel: 'Phone Calls', actions: curCallClicks, confirmed: currentCalls },
          { channel: 'WhatsApp', actions: curWhatsappClicks, confirmed: 0 },
          { channel: 'Directions', actions: curDirectionsClicks, confirmed: 0 },
          { channel: 'Lead Forms', actions: curFormStarts, confirmed: currentLeads },
        ],
      };
    } catch {
      return this.emptyReport('UPSTREAM_ERROR');
    }
  }

  public static emptyReport(state: ModuleReportState = 'NO_DATA'): UnifiedConversionsReportDto {
    return {
      state,
      websiteActions: {
        callClicks: ComparisonEngine.calculate(0, null, 'INTEGER'),
        whatsappClicks: ComparisonEngine.calculate(0, null, 'INTEGER'),
        directionsClicks: ComparisonEngine.calculate(0, null, 'INTEGER'),
        formStarts: ComparisonEngine.calculate(0, null, 'INTEGER'),
        totalActions: ComparisonEngine.calculate(0, null, 'INTEGER'),
      },
      confirmedConversions: {
        formLeads: ComparisonEngine.calculate(0, null, 'INTEGER'),
        trackedCalls: ComparisonEngine.calculate(0, null, 'INTEGER'),
        bookings: ComparisonEngine.calculate(0, null, 'INTEGER'),
        totalConfirmed: ComparisonEngine.calculate(0, null, 'INTEGER'),
      },
      byChannel: [],
    };
  }
}
