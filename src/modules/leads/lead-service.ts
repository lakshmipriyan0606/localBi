import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AttributionService } from '../attribution/attribution-service';
import type { LeadType, LeadStatus, AttributionEventType } from '@prisma/client';

export interface CreateLeadInput {
  tenantId: string;
  brandId: string;
  webSurfaceId: string;
  pageId?: string | null | undefined;
  storeId?: string | null | undefined;
  productId?: string | null | undefined;
  visitorId?: string | null | undefined;
  sessionId?: string | null | undefined;
  type?: LeadType | undefined;
  status?: LeadStatus | undefined;
  name?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  message?: string | null | undefined;
  idempotencyKey?: string | null | undefined;
  referrer?: string | null | undefined;
  currentPath?: string | null | undefined;
  landingPath?: string | null | undefined;
  utmSource?: string | null | undefined;
  utmMedium?: string | null | undefined;
  utmCampaign?: string | null | undefined;
  utmContent?: string | null | undefined;
  utmTerm?: string | null | undefined;
  gclid?: string | null | undefined;
  isSpam?: boolean | undefined;
  metadata?: Record<string, unknown> | null | undefined;
}

export interface ListLeadsInput {
  tenantId: string;
  brandId?: string | undefined;
  webSurfaceId?: string | undefined;
  storeId?: string | undefined;
  productId?: string | undefined;
  type?: LeadType | undefined;
  status?: LeadStatus | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
}

export interface LeadStatsDto {
  totalLeads: number;
  formLeads: number;
  callLeads: number;
  whatsappLeads: number;
  bookingLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  spamLeads: number;
}

export class LeadService {
  /**
   * Creates a customer inquiry lead with idempotency protection and first/last-touch attribution snapshot.
   */
  public static async createLead(input: CreateLeadInput) {
    const {
      tenantId,
      brandId,
      webSurfaceId,
      pageId,
      storeId,
      productId,
      visitorId,
      sessionId,
      type = 'FORM',
      name,
      phone,
      email,
      message,
      idempotencyKey,
      referrer,
      currentPath,
      landingPath,
      isSpam = false,
      metadata,
    } = input;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Check idempotency: If key provided and already processed, return existing lead
      if (idempotencyKey) {
        const existing = await tx.lead.findUnique({
          where: {
            uq_lead_tenant_idempotency: {
              tenantId,
              idempotencyKey,
            },
          },
          include: {
            store: { select: { id: true, name: true, city: true } },
            product: { select: { id: true, name: true, sku: true } },
          },
        });

        if (existing) {
          return existing;
        }
      }

      // 2. Resolve traffic attribution snapshot
      const currentTraffic = AttributionService.resolveTrafficSource({
        referrer,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        utmContent: input.utmContent,
        utmTerm: input.utmTerm,
        gclid: input.gclid,
      });

      // 3. Inspect existing session to retrieve preserved first-touch parameters
      let firstTouchSource = currentTraffic.source;
      let firstTouchMedium = currentTraffic.medium;
      let firstTouchCampaign = currentTraffic.campaign || null;
      let firstTouchLandingPage = landingPath || currentPath || '/';

      if (sessionId) {
        const session = await tx.visitorSession.findUnique({
          where: {
            uq_visitor_session_tenant_session: {
              tenantId,
              sessionId,
            },
          },
        });

        if (session) {
          firstTouchSource = session.firstTouchSource || firstTouchSource;
          firstTouchMedium = session.firstTouchMedium || firstTouchMedium;
          firstTouchCampaign = session.firstTouchCampaign || firstTouchCampaign;
          firstTouchLandingPage = session.firstTouchLandingPage || firstTouchLandingPage;
        }
      }

      // 4. Record associated FORM_SUBMIT AttributionEvent
      let eventType: AttributionEventType = 'FORM_SUBMIT';
      if (type === 'CALL') eventType = 'CALL_CLICK';
      if (type === 'WHATSAPP') eventType = 'WHATSAPP_CLICK';
      if (type === 'BOOKING') eventType = 'BOOKING_COMPLETE';

      const attrEvent = await tx.attributionEvent.create({
        data: {
          tenantId,
          brandId,
          webSurfaceId,
          pageId: pageId || null,
          storeId: storeId || null,
          productId: productId || null,
          visitorId: visitorId || null,
          sessionId: sessionId || null,
          eventType,
          source: currentTraffic.source,
          medium: currentTraffic.medium,
          campaign: currentTraffic.campaign || null,
          landingPath: landingPath || null,
          currentPath: currentPath || null,
          referrer: referrer || null,
          utmSource: currentTraffic.utmSource || null,
          utmMedium: currentTraffic.utmMedium || null,
          utmCampaign: currentTraffic.utmCampaign || null,
          utmContent: currentTraffic.utmContent || null,
          utmTerm: currentTraffic.utmTerm || null,
          gclid: currentTraffic.gclid || null,
        },
      });

      // 5. Create Lead record with immutable attribution snapshot and sanitized PII
      return tx.lead.create({
        data: {
          tenantId,
          brandId,
          webSurfaceId,
          pageId: pageId || null,
          storeId: storeId || null,
          productId: productId || null,
          visitorId: visitorId || null,
          sessionId: sessionId || null,
          type,
          status: isSpam ? 'SPAM' : 'NEW',
          name: name ? name.trim().slice(0, 100) : null,
          phone: phone ? phone.trim().slice(0, 50) : null,
          email: email ? email.trim().toLowerCase().slice(0, 100) : null,
          message: message ? message.trim().slice(0, 2000) : null,
          sourceEventId: attrEvent.id,
          idempotencyKey: idempotencyKey || null,
          firstTouchSource,
          firstTouchMedium,
          firstTouchCampaign,
          firstTouchLandingPage,
          lastTouchSource: currentTraffic.source,
          lastTouchMedium: currentTraffic.medium,
          lastTouchCampaign: currentTraffic.campaign || null,
          lastTouchPage: currentPath || '/',
          metadata: metadata ? (metadata as any) : undefined,
        },
        include: {
          store: { select: { id: true, name: true, city: true } },
          product: { select: { id: true, name: true, sku: true } },
        },
      });
    });
  }

  /**
   * Lists leads for admin workspace with pagination and filters.
   */
  public static async listLeads(input: ListLeadsInput) {
    const {
      tenantId,
      brandId,
      webSurfaceId,
      storeId,
      productId,
      type,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      search,
    } = input;

    const skip = Math.max(0, (page - 1) * limit);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const where: any = {
        tenantId,
        ...(brandId ? { brandId } : {}),
        ...(webSurfaceId ? { webSurfaceId } : {}),
        ...(storeId ? { storeId } : {}),
        ...(productId ? { productId } : {}),
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      };

      if (startDate || endDate) {
        where.createdAt = {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        };
      }

      if (search && search.trim().length > 0) {
        const query = search.trim();
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ];
      }

      const [total, leads] = await Promise.all([
        tx.lead.count({ where }),
        tx.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            brand: { select: { id: true, name: true } },
            webSurface: { select: { id: true, type: true } },
            store: { select: { id: true, name: true, city: true } },
            product: { select: { id: true, name: true, sku: true } },
          },
        }),
      ]);

      return {
        leads,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  /**
   * Updates lead status (e.g. from NEW to CONTACTED, QUALIFIED, CONVERTED).
   */
  public static async updateLeadStatus(params: {
    tenantId: string;
    leadId: string;
    status: LeadStatus;
  }) {
    const { tenantId, leadId, status } = params;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const lead = await tx.lead.findFirst({
        where: { id: leadId, tenantId },
      });

      if (!lead) {
        throw new Error(`Lead with ID ${leadId} not found`);
      }

      return tx.lead.update({
        where: { id: leadId },
        data: { status },
      });
    });
  }

  /**
   * Retrieves summary lead counts by type and status.
   */
  public static async getLeadStats(params: {
    tenantId: string;
    brandId?: string | undefined;
    webSurfaceId?: string | undefined;
    storeId?: string | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
  }): Promise<LeadStatsDto> {
    const { tenantId, brandId, webSurfaceId, storeId, startDate, endDate } = params;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const where: any = {
        tenantId,
        ...(brandId ? { brandId } : {}),
        ...(webSurfaceId ? { webSurfaceId } : {}),
        ...(storeId ? { storeId } : {}),
      };

      if (startDate || endDate) {
        where.createdAt = {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        };
      }

      const [byType, byStatus, totalLeads] = await Promise.all([
        tx.lead.groupBy({
          by: ['type'],
          where,
          _count: { _all: true },
        }),
        tx.lead.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        tx.lead.count({ where }),
      ]);

      const typeMap = new Map(byType.map((t) => [t.type, t._count._all]));
      const statusMap = new Map(byStatus.map((s) => [s.status, s._count._all]));

      return {
        totalLeads,
        formLeads: typeMap.get('FORM') || 0,
        callLeads: typeMap.get('CALL') || 0,
        whatsappLeads: typeMap.get('WHATSAPP') || 0,
        bookingLeads: typeMap.get('BOOKING') || 0,
        newLeads: statusMap.get('NEW') || 0,
        contactedLeads: statusMap.get('CONTACTED') || 0,
        qualifiedLeads: statusMap.get('QUALIFIED') || 0,
        convertedLeads: statusMap.get('CONVERTED') || 0,
        spamLeads: statusMap.get('SPAM') || 0,
      };
    });
  }
}
