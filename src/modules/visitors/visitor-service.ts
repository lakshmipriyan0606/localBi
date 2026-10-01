import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';

export interface VisitorSession {
  id: string;
  tenantSlug: string;
  deviceFingerprint: string;
  identifiedUser: {
    phone?: string | undefined;
    name?: string | undefined;
    email?: string | undefined;
  } | null;
  isIdentified: boolean;
  intentLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'HOT';
  pageViews: Array<{
    url: string;
    title: string;
    timestamp: string;
    dwellTimeSeconds?: number | undefined;
  }>;
  deviceInfo: {
    platform: string;
    browser: string;
    screenResolution: string;
    timezone: string;
  };
  trafficSource: {
    referrer: string;
    channel: 'Google Search' | 'Instagram' | 'Direct' | 'WhatsApp' | 'Paid Ads';
    utmCampaign?: string | undefined;
  };
  conversions: Array<{
    type: 'WHATSAPP_CLICK' | 'MENU_VIEW' | 'REVIEW_CLICK' | 'PHONE_CALL';
    timestamp: string;
  }>;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface VisitorStats {
  totalVisitors: number;
  identifiedCount: number;
  highIntentCount: number;
  whatsappInquiries: number;
  topChannels: Array<{ channel: string; count: number; percentage: number }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectChannel(referrer: string): VisitorSession['trafficSource']['channel'] {
  const ref = (referrer || '').toLowerCase();
  if (ref.includes('google')) return 'Google Search';
  if (ref.includes('instagram')) return 'Instagram';
  if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'WhatsApp';
  if (ref.includes('ad') || ref.includes('campaign')) return 'Paid Ads';
  return 'Direct';
}

async function resolveTenantId(tenantSlug: string): Promise<string | null> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

function dbRowToSession(row: {
  id: string;
  tenantSlug: string;
  deviceFingerprint: string;
  isIdentified: boolean;
  identifiedUser: unknown;
  intentLevel: string;
  pageViews: unknown;
  deviceInfo: unknown;
  trafficSource: unknown;
  conversions: unknown;
  firstSeenAt: Date;
  lastSeenAt: Date;
}): VisitorSession {
  return {
    id: row.id,
    tenantSlug: row.tenantSlug,
    deviceFingerprint: row.deviceFingerprint,
    isIdentified: row.isIdentified,
    identifiedUser: (row.identifiedUser as VisitorSession['identifiedUser']) ?? null,
    intentLevel: row.intentLevel as VisitorSession['intentLevel'],
    pageViews: (row.pageViews as VisitorSession['pageViews']) ?? [],
    deviceInfo: (row.deviceInfo as VisitorSession['deviceInfo']) ?? {
      platform: 'Unknown',
      browser: 'Unknown',
      screenResolution: '1920x1080',
      timezone: 'UTC',
    },
    trafficSource: (row.trafficSource as VisitorSession['trafficSource']) ?? {
      referrer: '',
      channel: 'Direct',
    },
    conversions: (row.conversions as VisitorSession['conversions']) ?? [],
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// VisitorService — fully DB-backed
// ---------------------------------------------------------------------------

export class VisitorService {
  /**
   * Record a real-time event from the tracking pixel.
   * Uses upsert so a visitor returning multiple times merges into one row.
   */
  static async recordEvent(params: {
    tenantSlug: string;
    deviceFingerprint: string;
    url: string;
    title?: string | undefined;
    platform?: string | undefined;
    browser?: string | undefined;
    screenResolution?: string | undefined;
    timezone?: string | undefined;
    referrer?: string | undefined;
    dwellTimeSeconds?: number | undefined;
    eventType?: 'page_view' | 'whatsapp_click' | 'phone_call' | 'menu_view' | undefined;
  }): Promise<VisitorSession> {
    const tenantId = await resolveTenantId(params.tenantSlug);
    if (!tenantId) throw new Error(`Tenant not found: ${params.tenantSlug}`);

    const now = new Date();
    const channel = detectChannel(params.referrer ?? '');

    // Fetch existing row (if any) — we need to merge arrays
    const existing = await prisma.micrositeVisitor.findUnique({
      where: {
        uq_visitor_fingerprint: {
          tenantId,
          deviceFingerprint: params.deviceFingerprint,
        },
      },
    });

    // Build updated fields
    const pageViews: VisitorSession['pageViews'] = existing
      ? (existing.pageViews as VisitorSession['pageViews'])
      : [];
    const conversions: VisitorSession['conversions'] = existing
      ? (existing.conversions as VisitorSession['conversions'])
      : [];
    let intentLevel: VisitorSession['intentLevel'] = (existing?.intentLevel as VisitorSession['intentLevel']) ?? 'LOW';

    const deviceInfo: VisitorSession['deviceInfo'] = {
      platform: params.platform ?? (existing?.deviceInfo as VisitorSession['deviceInfo'])?.platform ?? 'Unknown Device',
      browser: params.browser ?? (existing?.deviceInfo as VisitorSession['deviceInfo'])?.browser ?? 'Unknown Browser',
      screenResolution:
        params.screenResolution ??
        (existing?.deviceInfo as VisitorSession['deviceInfo'])?.screenResolution ??
        '1920x1080',
      timezone: params.timezone ?? (existing?.deviceInfo as VisitorSession['deviceInfo'])?.timezone ?? 'Asia/Kolkata',
    };

    const trafficSource: VisitorSession['trafficSource'] = existing
      ? (existing.trafficSource as VisitorSession['trafficSource'])
      : { referrer: params.referrer ?? '', channel };

    const eventType = params.eventType ?? 'page_view';

    if (eventType === 'page_view') {
      const lastView = pageViews[pageViews.length - 1];
      const isQuickDuplicate =
        lastView &&
        lastView.url === params.url &&
        Date.now() - new Date(lastView.timestamp).getTime() < 5000;

      if (!isQuickDuplicate) {
        pageViews.push({
          url: params.url,
          title: params.title ?? 'Page View',
          timestamp: now.toISOString(),
          dwellTimeSeconds: params.dwellTimeSeconds ?? 15,
        });
      }

      if (pageViews.length >= 3 && intentLevel !== 'HOT') intentLevel = 'HIGH';
      else if (pageViews.length >= 2 && intentLevel === 'LOW') intentLevel = 'MEDIUM';
    } else if (eventType === 'whatsapp_click') {
      conversions.push({ type: 'WHATSAPP_CLICK', timestamp: now.toISOString() });
      intentLevel = 'HOT';
    } else if (eventType === 'phone_call') {
      conversions.push({ type: 'PHONE_CALL', timestamp: now.toISOString() });
      intentLevel = 'HOT';
    } else if (eventType === 'menu_view') {
      conversions.push({ type: 'MENU_VIEW', timestamp: now.toISOString() });
      if (intentLevel !== 'HOT') intentLevel = 'HIGH';
    }

    const row = await prisma.micrositeVisitor.upsert({
      where: {
        uq_visitor_fingerprint: {
          tenantId,
          deviceFingerprint: params.deviceFingerprint,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: {
        tenantId,
        tenantSlug: params.tenantSlug,
        deviceFingerprint: params.deviceFingerprint,
        isIdentified: false,
        identifiedUser: Prisma.JsonNull,
        intentLevel,
        pageViews:      pageViews      as unknown as Prisma.InputJsonValue,
        deviceInfo:     deviceInfo     as unknown as Prisma.InputJsonValue,
        trafficSource:  trafficSource  as unknown as Prisma.InputJsonValue,
        conversions:    conversions    as unknown as Prisma.InputJsonValue,
        firstSeenAt: now,
        lastSeenAt: now,
      } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: {
        intentLevel,
        pageViews:   pageViews   as unknown as Prisma.InputJsonValue,
        deviceInfo:  deviceInfo  as unknown as Prisma.InputJsonValue,
        conversions: conversions as unknown as Prisma.InputJsonValue,
        lastSeenAt: now,
      } as any,
    });

    return dbRowToSession(row);
  }

  /**
   * Stitch a phone/name to an anonymous device fingerprint.
   */
  static async identifyVisitor(params: {
    deviceFingerprint: string;
    phone: string;
    name?: string | undefined;
    email?: string | undefined;
  }): Promise<VisitorSession | null> {
    // We need to find by fingerprint across all tenants (caller may not know tenantId)
    const existing = await prisma.micrositeVisitor.findFirst({
      where: { deviceFingerprint: params.deviceFingerprint },
    });
    if (!existing) return null;

    const prevUser = (existing.identifiedUser as Partial<VisitorSession['identifiedUser']> | null) ?? {};

    const row = await prisma.micrositeVisitor.update({
      where: { id: existing.id },
      data: {
        isIdentified: true,
        intentLevel: 'HOT',
        identifiedUser: {
          phone: params.phone,
          name: params.name ?? prevUser?.name,
          email: params.email ?? prevUser?.email,
        },
        lastSeenAt: new Date(),
      },
    });

    return dbRowToSession(row);
  }

  /**
   * Get all visitors for a given tenant, ordered by most recent first.
   */
  static async getTenantVisitors(tenantSlug: string): Promise<VisitorSession[]> {
    const tenantId = await resolveTenantId(tenantSlug);
    if (!tenantId) return [];

    const rows = await prisma.micrositeVisitor.findMany({
      where: { tenantId },
      orderBy: { lastSeenAt: 'desc' },
    });

    return rows.map(dbRowToSession);
  }

  /**
   * Aggregated intelligence stats for a tenant.
   */
  static async getTenantVisitorStats(tenantSlug: string): Promise<VisitorStats> {
    const visitors = await this.getTenantVisitors(tenantSlug);

    const totalVisitors = visitors.length;
    const identifiedCount = visitors.filter((v) => v.isIdentified).length;
    const highIntentCount = visitors.filter(
      (v) => v.intentLevel === 'HOT' || v.intentLevel === 'HIGH'
    ).length;

    let whatsappInquiries = 0;
    const channelCounts: Record<string, number> = {};

    for (const v of visitors) {
      whatsappInquiries += v.conversions.filter((c) => c.type === 'WHATSAPP_CLICK').length;
      const ch = v.trafficSource.channel;
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    }

    const topChannels = Object.entries(channelCounts).map(([channel, count]) => ({
      channel,
      count,
      percentage: totalVisitors > 0 ? Math.round((count / totalVisitors) * 100) : 0,
    }));

    return { totalVisitors, identifiedCount, highIntentCount, whatsappInquiries, topChannels };
  }

  /**
   * Hard-delete all visitor sessions for a tenant (admin reset).
   */
  static async clearRealVisitors(tenantSlug: string): Promise<void> {
    const tenantId = await resolveTenantId(tenantSlug);
    if (!tenantId) return;
    await prisma.micrositeVisitor.deleteMany({ where: { tenantId } });
  }
}
