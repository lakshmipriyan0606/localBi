import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import {
  CallDto,
  CallStatus,
  CallSummaryDto,
  PhoneUtils,
  StoreCallSummaryDto,
} from './telephony-types';

export interface GetCallSummaryInput {
  tenantId: string;
  brandId?: string | undefined;
  storeId?: string | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

export interface ListCallsInput {
  tenantId: string;
  brandId?: string | undefined;
  storeId?: string | undefined;
  status?: CallStatus | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  hasFullPiiAccess?: boolean | undefined;
}

export interface CallFunnelMetricsDto {
  browserCallClicks: number;
  realInboundCalls: number;
  answeredInboundCalls: number;
  missedInboundCalls: number;
  clickToCallDropOffCount: number;
  clickToCallConnectionRate: number;
}

export class CallDashboardService {
  /**
   * Computes high-level call performance summary for a tenant/brand/store.
   */
  public static async getCallSummary(
    input: GetCallSummaryInput
  ): Promise<CallSummaryDto> {
    const { tenantId, brandId, storeId, startDate, endDate } = input;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const where: any = { tenantId };
      if (brandId) where.brandId = brandId;
      if (storeId) where.storeId = storeId;
      if (startDate || endDate) {
        where.startedAt = {};
        if (startDate) where.startedAt.gte = startDate;
        if (endDate) where.startedAt.lte = endDate;
      }

      const calls = await tx.call.findMany({
        where,
        select: {
          id: true,
          status: true,
          durationSeconds: true,
          talkDurationSeconds: true,
          callerNumber: true,
          pageId: true,
          source: true,
        },
      });

      const totalCalls = calls.length;
      let answeredCalls = 0;
      let missedCalls = 0;
      let busyCalls = 0;
      let failedCalls = 0;
      let totalDuration = 0;
      let totalTalkDuration = 0;
      const callerSet = new Set<string>();
      const pageCounts: Record<string, number> = {};
      const sourceCounts: Record<string, number> = {};

      for (const c of calls) {
        totalDuration += c.durationSeconds;
        totalTalkDuration += c.talkDurationSeconds;

        if (c.callerNumber) {
          callerSet.add(c.callerNumber);
        }

        if (c.source) {
          sourceCounts[c.source] = (sourceCounts[c.source] || 0) + 1;
        }

        if (c.pageId) {
          pageCounts[c.pageId] = (pageCounts[c.pageId] || 0) + 1;
        }

        switch (c.status) {
          case 'ANSWERED':
            answeredCalls++;
            break;
          case 'COMPLETED':
            if (c.talkDurationSeconds > 0) {
              answeredCalls++;
            } else {
              missedCalls++;
            }
            break;
          case 'MISSED':
            missedCalls++;
            break;
          case 'BUSY':
            busyCalls++;
            break;
          case 'FAILED':
          case 'CANCELLED':
            failedCalls++;
            break;
          default:
            break;
        }
      }

      const answerRatePercentage =
        totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 1000) / 10 : 0;
      const avgDurationSeconds =
        totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      const avgTalkDurationSeconds =
        answeredCalls > 0 ? Math.round(totalTalkDuration / answeredCalls) : 0;

      const topPages = Object.entries(pageCounts)
        .map(([pageId, count]) => ({ pageId, calls: count }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 5);

      return {
        totalCalls,
        answeredCalls,
        missedCalls,
        busyCalls,
        failedCalls,
        answerRatePercentage,
        avgDurationSeconds,
        avgTalkDurationSeconds,
        uniqueCallersCount: callerSet.size,
        topCallGeneratingPages: topPages,
        topCallSources: sourceCounts,
      };
    });
  }

  /**
   * Aggregates call performance metrics broken down by individual store location.
   */
  public static async getStoreCallSummaries(input: {
    tenantId: string;
    brandId: string;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
  }): Promise<StoreCallSummaryDto[]> {
    const { tenantId, brandId, startDate, endDate } = input;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Fetch all stores for this brand
      const stores = await tx.location.findMany({
        where: { tenantId, brandId },
        select: {
          id: true,
          name: true,
          storeCode: true,
          phone: true,
          virtualNumbers: {
            where: { status: 'ACTIVE' },
            select: { phoneNumber: true },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
      });

      // 2. Fetch calls for this brand
      const where: any = { tenantId, brandId };
      if (startDate || endDate) {
        where.startedAt = {};
        if (startDate) where.startedAt.gte = startDate;
        if (endDate) where.startedAt.lte = endDate;
      }

      const calls = await tx.call.findMany({
        where,
        select: {
          storeId: true,
          status: true,
          talkDurationSeconds: true,
        },
      });

      // 3. Group by storeId
      const storeMetrics: Record<
        string,
        { total: number; answered: number; missed: number; totalTalk: number }
      > = {};

      for (const s of stores) {
        storeMetrics[s.id] = { total: 0, answered: 0, missed: 0, totalTalk: 0 };
      }

      for (const c of calls) {
        if (!c.storeId || !storeMetrics[c.storeId]) continue;
        const m = storeMetrics[c.storeId]!;
        m.total++;
        if (c.status === 'ANSWERED' || (c.status === 'COMPLETED' && c.talkDurationSeconds > 0)) {
          m.answered++;
          m.totalTalk += c.talkDurationSeconds;
        } else if (c.status === 'MISSED' || (c.status === 'COMPLETED' && c.talkDurationSeconds === 0)) {
          m.missed++;
        }
      }

      return stores.map((s) => {
        const m = storeMetrics[s.id] || { total: 0, answered: 0, missed: 0, totalTalk: 0 };
        const answerRatePercentage =
          m.total > 0 ? Math.round((m.answered / m.total) * 1000) / 10 : 0;
        const avgTalkDurationSeconds =
          m.answered > 0 ? Math.round(m.totalTalk / m.answered) : 0;

        return {
          storeId: s.id,
          storeName: s.name,
          storeCode: s.storeCode,
          trackingNumber: s.virtualNumbers[0]?.phoneNumber || null,
          realPhone: s.phone || null,
          totalCalls: m.total,
          answeredCalls: m.answered,
          missedCalls: m.missed,
          answerRatePercentage,
          avgTalkDurationSeconds,
        };
      });
    });
  }

  /**
   * Returns a paginated list of calls with role-based PII masking.
   */
  public static async listCalls(input: ListCallsInput): Promise<{
    items: CallDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const {
      tenantId,
      brandId,
      storeId,
      status,
      page = 1,
      limit = 20,
      hasFullPiiAccess = false,
    } = input;

    const skip = Math.max(0, (page - 1) * limit);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const where: any = { tenantId };
      if (brandId) where.brandId = brandId;
      if (storeId) where.storeId = storeId;
      if (status) where.status = status;

      const [total, calls] = await Promise.all([
        tx.call.count({ where }),
        tx.call.findMany({
          where,
          include: {
            store: { select: { id: true, name: true } },
            virtualNumber: { select: { phoneNumber: true } },
            lead: { select: { id: true, status: true } },
          },
          orderBy: { startedAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      const items: CallDto[] = calls.map((c) => {
        // Enforce role-based caller PII masking
        const callerNumber = hasFullPiiAccess
          ? c.callerNumber || c.callerNumberMasked || 'Unknown'
          : c.callerNumberMasked || PhoneUtils.maskPhoneNumber(c.callerNumber, false);

        return {
          id: c.id,
          tenantId: c.tenantId,
          brandId: c.brandId,
          storeId: c.storeId,
          storeName: c.store?.name || null,
          webSurfaceId: c.webSurfaceId,
          pageId: c.pageId,
          productId: c.productId,
          virtualNumberId: c.virtualNumberId,
          trackingNumber: c.virtualNumber?.phoneNumber || '',
          provider: c.provider,
          providerCallId: c.providerCallId,
          direction: c.direction,
          callerNumber,
          destinationNumber: c.destinationNumber,
          status: c.status as CallStatus,
          startedAt: c.startedAt,
          answeredAt: c.answeredAt,
          endedAt: c.endedAt,
          durationSeconds: c.durationSeconds,
          talkDurationSeconds: c.talkDurationSeconds,
          recordingUrl: hasFullPiiAccess ? c.recordingUrl : null,
          attributionConfidence: c.attributionConfidence as any,
          source: c.source,
          medium: c.medium,
          campaign: c.campaign,
          attributionSessionId: c.attributionSessionId,
          leadId: c.leadId,
          leadStatus: c.lead?.status || null,
          createdAt: c.createdAt,
        };
      });

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    });
  }

  /**
   * Compares browser click intent (`CALL_CLICK` AttributionEvents) against actual
   * incoming telephony calls (`Call`), measuring the Click-to-Call connection rate.
   */
  public static async getCallFunnelComparison(input: {
    tenantId: string;
    brandId?: string | undefined;
    storeId?: string | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
  }): Promise<CallFunnelMetricsDto> {
    const { tenantId, brandId, storeId, startDate, endDate } = input;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Browser CALL_CLICK attribution events
      const eventWhere: any = {
        tenantId,
        eventType: 'CALL_CLICK',
      };
      if (brandId) eventWhere.brandId = brandId;
      if (storeId) eventWhere.storeId = storeId;
      if (startDate || endDate) {
        eventWhere.timestamp = {};
        if (startDate) eventWhere.timestamp.gte = startDate;
        if (endDate) eventWhere.timestamp.lte = endDate;
      }

      const browserCallClicks = await tx.attributionEvent.count({
        where: eventWhere,
      });

      // 2. Real telephony provider calls
      const callWhere: any = { tenantId };
      if (brandId) callWhere.brandId = brandId;
      if (storeId) callWhere.storeId = storeId;
      if (startDate || endDate) {
        callWhere.startedAt = {};
        if (startDate) callWhere.startedAt.gte = startDate;
        if (endDate) callWhere.startedAt.lte = endDate;
      }

      const calls = await tx.call.findMany({
        where: callWhere,
        select: {
          status: true,
          talkDurationSeconds: true,
        },
      });

      const realInboundCalls = calls.length;
      let answeredInboundCalls = 0;
      let missedInboundCalls = 0;

      for (const c of calls) {
        if (c.status === 'ANSWERED' || (c.status === 'COMPLETED' && c.talkDurationSeconds > 0)) {
          answeredInboundCalls++;
        } else {
          missedInboundCalls++;
        }
      }

      const clickToCallDropOffCount = Math.max(0, browserCallClicks - realInboundCalls);
      const clickToCallConnectionRate =
        browserCallClicks > 0
          ? Math.round((answeredInboundCalls / browserCallClicks) * 1000) / 10
          : 0;

      return {
        browserCallClicks,
        realInboundCalls,
        answeredInboundCalls,
        missedInboundCalls,
        clickToCallDropOffCount,
        clickToCallConnectionRate,
      };
    });
  }

  /**
   * Exports calls to CSV format with formula injection protection and role-based masking.
   */
  public static async exportCallsCsv(input: {
    tenantId: string;
    brandId?: string | undefined;
    storeId?: string | undefined;
    hasFullPiiAccess?: boolean | undefined;
  }): Promise<string> {
    const { tenantId, brandId, storeId, hasFullPiiAccess = false } = input;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const where: any = { tenantId };
      if (brandId) where.brandId = brandId;
      if (storeId) where.storeId = storeId;

      const calls = await tx.call.findMany({
        where,
        include: {
          store: { select: { name: true, storeCode: true } },
          virtualNumber: { select: { phoneNumber: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: 1000,
      });

      const headers = [
        'Call ID',
        'Date & Time',
        'Store Name',
        'Tracking Number',
        'Caller Number',
        'Status',
        'Duration (s)',
        'Talk Duration (s)',
        'Source',
      ];

      const rows: string[] = [headers.join(',')];

      for (const c of calls) {
        const caller = hasFullPiiAccess
          ? c.callerNumber || c.callerNumberMasked || 'Unknown'
          : c.callerNumberMasked || PhoneUtils.maskPhoneNumber(c.callerNumber, false);

        const row = [
          PhoneUtils.sanitizeCsvField(c.id),
          PhoneUtils.sanitizeCsvField(c.startedAt.toISOString()),
          PhoneUtils.sanitizeCsvField(c.store?.name || 'Unassigned'),
          PhoneUtils.sanitizeCsvField(c.virtualNumber?.phoneNumber || ''),
          PhoneUtils.sanitizeCsvField(caller),
          PhoneUtils.sanitizeCsvField(c.status),
          PhoneUtils.sanitizeCsvField(c.durationSeconds),
          PhoneUtils.sanitizeCsvField(c.talkDurationSeconds),
          PhoneUtils.sanitizeCsvField(c.source || 'phone_call'),
        ];

        rows.push(row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
      }

      return rows.join('\r\n');
    });
  }
}
