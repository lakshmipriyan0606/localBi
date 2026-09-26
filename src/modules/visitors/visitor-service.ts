import fs from 'node:fs';
import path from 'node:path';

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

const realVisitorStore: Map<string, VisitorSession> = new Map();

// Persistence path for real captured visitors
const isTestEnv = process.env['NODE_ENV'] === 'test' || Boolean(process.env['VITEST']);
const DATA_DIR = path.join(process.cwd(), '.data');
const VISITORS_FILE = path.join(DATA_DIR, 'real_visitors.json');

function initRealVisitorStore() {
  if (isTestEnv) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    realVisitorStore.clear();
    if (fs.existsSync(VISITORS_FILE)) {
      const raw = fs.readFileSync(VISITORS_FILE, 'utf-8');
      if (raw.trim()) {
        const list: VisitorSession[] = JSON.parse(raw);
        for (const item of list) {
          realVisitorStore.set(item.deviceFingerprint, item);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load real visitors from disk:', err);
  }
}

function saveRealVisitorsToDisk() {
  if (isTestEnv) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(realVisitorStore.values());
    fs.writeFileSync(VISITORS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save real visitors to disk:', err);
  }
}

initRealVisitorStore();

export class VisitorService {
  /**
   * Record real-time event dispatched from tracking pixel
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
    let session = realVisitorStore.get(params.deviceFingerprint);

    if (!session) {
      // Determine channel from referrer
      let channel: VisitorSession['trafficSource']['channel'] = 'Direct';
      const ref = (params.referrer || '').toLowerCase();
      if (ref.includes('google')) channel = 'Google Search';
      else if (ref.includes('instagram')) channel = 'Instagram';
      else if (ref.includes('whatsapp') || ref.includes('wa.me')) channel = 'WhatsApp';
      else if (ref.includes('ad') || ref.includes('campaign')) channel = 'Paid Ads';

      session = {
        id: `vis-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantSlug: params.tenantSlug,
        deviceFingerprint: params.deviceFingerprint,
        identifiedUser: null,
        isIdentified: false,
        intentLevel: 'LOW',
        pageViews: [],
        deviceInfo: {
          platform: params.platform || 'Unknown Device',
          browser: params.browser || 'Unknown Browser',
          screenResolution: params.screenResolution || '1920x1080',
          timezone: params.timezone || 'Asia/Kolkata',
        },
        trafficSource: {
          referrer: params.referrer || '',
          channel,
        },
        conversions: [],
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      };
    } else {
      if (params.platform) session.deviceInfo.platform = params.platform;
      if (params.browser) session.deviceInfo.browser = params.browser;
      if (params.screenResolution) session.deviceInfo.screenResolution = params.screenResolution;
      if (params.timezone) session.deviceInfo.timezone = params.timezone;
    }

    session.lastSeenAt = new Date().toISOString();

    if (params.eventType === 'page_view' || !params.eventType) {
      const lastView = session.pageViews[session.pageViews.length - 1];
      const isQuickDuplicate =
        lastView &&
        lastView.url === params.url &&
        Date.now() - new Date(lastView.timestamp).getTime() < 5000;

      if (!isQuickDuplicate) {
        session.pageViews.push({
          url: params.url,
          title: params.title || 'Page View',
          timestamp: new Date().toISOString(),
          dwellTimeSeconds: params.dwellTimeSeconds || 15,
        });
      }

      if (session.pageViews.length >= 3) {
        if (session.intentLevel !== 'HOT') session.intentLevel = 'HIGH';
      } else if (session.pageViews.length >= 2) {
        if (session.intentLevel === 'LOW') session.intentLevel = 'MEDIUM';
      }
    } else if (params.eventType === 'whatsapp_click') {
      session.conversions.push({
        type: 'WHATSAPP_CLICK',
        timestamp: new Date().toISOString(),
      });
      session.intentLevel = 'HOT';
    } else if (params.eventType === 'phone_call') {
      session.conversions.push({
        type: 'PHONE_CALL',
        timestamp: new Date().toISOString(),
      });
      session.intentLevel = 'HOT';
    } else if (params.eventType === 'menu_view') {
      session.conversions.push({
        type: 'MENU_VIEW',
        timestamp: new Date().toISOString(),
      });
      if (session.intentLevel !== 'HOT') session.intentLevel = 'HIGH';
    }

    realVisitorStore.set(params.deviceFingerprint, session);
    saveRealVisitorsToDisk();
    return session;
  }

  /**
   * Stitch phone/name to an anonymous device fingerprint
   */
  static async identifyVisitor(params: {
    deviceFingerprint: string;
    phone: string;
    name?: string | undefined;
    email?: string | undefined;
  }): Promise<VisitorSession | null> {
    const session = realVisitorStore.get(params.deviceFingerprint);
    if (!session) return null;

    session.identifiedUser = {
      phone: params.phone,
      name: params.name || session.identifiedUser?.name,
      email: params.email || session.identifiedUser?.email,
    };
    session.isIdentified = true;
    session.intentLevel = 'HOT';

    realVisitorStore.set(params.deviceFingerprint, session);
    saveRealVisitorsToDisk();
    return session;
  }

  /**
   * Get real visitors for a tenant
   */
  static async getTenantVisitors(tenantSlug: string): Promise<VisitorSession[]> {
    initRealVisitorStore();
    return Array.from(realVisitorStore.values())
      .filter((s) => s.tenantSlug === tenantSlug)
      .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  }

  /**
   * Calculate aggregated intelligence stats from real data
   */
  static async getTenantVisitorStats(tenantSlug: string): Promise<VisitorStats> {
    const visitors = await this.getTenantVisitors(tenantSlug);

    const totalVisitors = visitors.length;
    const identifiedCount = visitors.filter((v) => v.isIdentified).length;
    const highIntentCount = visitors.filter((v) => v.intentLevel === 'HOT' || v.intentLevel === 'HIGH').length;

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

    return {
      totalVisitors,
      identifiedCount,
      highIntentCount,
      whatsappInquiries,
      topChannels,
    };
  }

  /**
   * Helper to clear real visitors if the client wants a fresh reset
   */
  static async clearRealVisitors(tenantSlug: string): Promise<void> {
    for (const [key, session] of realVisitorStore.entries()) {
      if (session.tenantSlug === tenantSlug) {
        realVisitorStore.delete(key);
      }
    }
    saveRealVisitorsToDisk();
  }
}
