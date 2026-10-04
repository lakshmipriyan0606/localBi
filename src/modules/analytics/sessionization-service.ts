import { randomUUID } from 'crypto';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import type { TrafficSourceInput } from '@/modules/attribution/attribution-service';
import { AttributionService } from '@/modules/attribution/attribution-service';

export interface DeviceClassification {
  category: 'MOBILE' | 'TABLET' | 'DESKTOP';
  browser: string;
  os: string;
}

export interface SessionActivityInput {
  tenantId: string;
  visitorId: string;
  sessionId: string;
  brandId?: string | null | undefined;
  webSurfaceId?: string | null | undefined;
  path: string;
  landingPath?: string | null | undefined;
  trafficInput: TrafficSourceInput;
  userAgent?: string | null | undefined;
  activeDeltaMs?: number | undefined;
  isHeartbeat?: boolean | undefined;
  isConversion?: boolean | undefined;
  country?: string | null | undefined;
  region?: string | null | undefined;
  city?: string | null | undefined;
}

export interface SessionRecord {
  id: string;
  tenantId: string;
  visitorId: string;
  sessionId: string;
  brandId: string | null;
  webSurfaceId: string | null;
  firstTouchSource: string | null;
  firstTouchMedium: string | null;
  firstTouchCampaign: string | null;
  firstTouchLandingPage: string | null;
  lastTouchSource: string | null;
  lastTouchMedium: string | null;
  lastTouchCampaign: string | null;
  lastTouchPage: string | null;
  devicePlatform: string | null;
  browser: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  isNewSession: boolean;
}

export class SessionizationService {
  /**
   * Default inactivity timeout before a new session is mandated: 30 minutes.
   */
  public static readonly DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  /**
   * Engaged session threshold: 10 seconds of active engagement.
   */
  public static readonly ENGAGED_ACTIVE_MS_THRESHOLD = 10 * 1000;

  /**
   * Idle detection threshold: 60 seconds without pointer/keyboard activity.
   */
  public static readonly IDLE_THRESHOLD_MS = 60 * 1000;

  /**
   * Generates a cryptographically secure, opaque anonymous first-party visitor ID.
   * Free of PII, tenant ID, or device entropy.
   */
  public static generateVisitorId(): string {
    return `vid_${randomUUID().replace(/-/g, '')}`;
  }

  /**
   * Generates a cryptographically secure, opaque session ID.
   */
  public static generateSessionId(): string {
    return `sid_${randomUUID().replace(/-/g, '')}`;
  }

  /**
   * Generates an opaque pageview ID.
   */
  public static generatePageViewId(): string {
    return `pv_${randomUUID().replace(/-/g, '')}`;
  }

  /**
   * Conservative Bot Classifier.
   * Detects known search engines, headless automation, and monitoring agents without false positives.
   */
  public static classifyBot(userAgent?: string | null): boolean {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    const botPatterns = [
      'googlebot',
      'bingbot',
      'yandexbot',
      'duckduckbot',
      'baiduspider',
      'sogou',
      'exabot',
      'facebot',
      'facebookexternalhit',
      'ia_archiver',
      'pingdom',
      'uptimerobot',
      'site24x7',
      'newrelic',
      'lighthouse',
      'headlesschrome',
      'phantomjs',
      'selenium',
      'puppeteer',
      'playwright',
      'python-requests',
      'aiohttp',
      'curl/',
      'wget/',
      'go-http-client',
      'postmanruntime',
    ];

    return botPatterns.some((pattern) => ua.includes(pattern));
  }

  /**
   * Coarse Device & Environment Classifier.
   * Extracts high-level device category, browser family, and OS family without invasive fingerprinting.
   */
  public static classifyDevice(userAgent?: string | null): DeviceClassification {
    if (!userAgent) {
      return { category: 'DESKTOP', browser: 'Unknown', os: 'Unknown' };
    }

    const ua = userAgent;

    // Device Category
    let category: DeviceClassification['category'] = 'DESKTOP';
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      category = 'TABLET';
    } else if (/mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua)) {
      category = 'MOBILE';
    }

    // OS Family
    let os = 'Other';
    if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
    else if (/windows nt/i.test(ua)) os = 'Windows';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/cros/i.test(ua)) os = 'ChromeOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    // Browser Family
    let browser = 'Other';
    if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
    else if (/chrome\//i.test(ua) && !/chromium|opr\//i.test(ua)) browser = 'Google Chrome';
    else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Apple Safari';
    else if (/firefox\//i.test(ua)) browser = 'Mozilla Firefox';
    else if (/opr\//i.test(ua)) browser = 'Opera';

    return { category, browser, os };
  }

  /**
   * Central Session Ingestion & Sessionization Policy.
   * Determines whether an incoming event belongs to an active existing session or triggers a new session.
   * Enforces 30-minute inactivity boundary and maintains acquisition attribution.
   */
  public static async processSessionActivity(
    input: SessionActivityInput,
    timeoutMs: number = SessionizationService.DEFAULT_SESSION_TIMEOUT_MS
  ): Promise<SessionRecord> {
    const {
      tenantId,
      visitorId,
      sessionId,
      brandId,
      webSurfaceId,
      path,
      landingPath,
      trafficInput,
      userAgent,
    } = input;

    const traffic = AttributionService.resolveTrafficSource(trafficInput);
    const device = this.classifyDevice(userAgent);
    const now = new Date();

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Check for existing session record
      const existing = await tx.visitorSession.findUnique({
        where: {
          uq_visitor_session_tenant_session: {
            tenantId,
            sessionId,
          },
        },
      });

      // 2. Evaluate timeout if session exists
      const isExpired = existing
        ? now.getTime() - existing.lastSeenAt.getTime() > timeoutMs
        : false;

      if (!existing || isExpired) {
        // Create new session
        const newSessionId = isExpired ? this.generateSessionId() : sessionId;
        const created = await tx.visitorSession.create({
          data: {
            tenantId,
            visitorId,
            sessionId: newSessionId,
            brandId: brandId || null,
            webSurfaceId: webSurfaceId || null,
            firstTouchSource: traffic.source,
            firstTouchMedium: traffic.medium,
            firstTouchCampaign: traffic.campaign || null,
            firstTouchLandingPage: landingPath || path || '/',
            lastTouchSource: traffic.source,
            lastTouchMedium: traffic.medium,
            lastTouchCampaign: traffic.campaign || null,
            lastTouchPage: path || '/',
            devicePlatform: `${device.category}:${device.os}`,
            browser: device.browser,
            firstSeenAt: now,
            lastSeenAt: now,
          },
        });

        return {
          ...created,
          isNewSession: true,
        };
      }

      // 3. Update existing active session
      const updated = await tx.visitorSession.update({
        where: { id: existing.id },
        data: {
          lastTouchSource: traffic.source,
          lastTouchMedium: traffic.medium,
          lastTouchCampaign: traffic.campaign || existing.lastTouchCampaign,
          lastTouchPage: path || existing.lastTouchPage,
          lastSeenAt: now,
        },
      });

      return {
        ...updated,
        isNewSession: false,
      };
    });
  }

  /**
   * Helper to evaluate whether a session qualifies as an "Engaged Session".
   * Rule: Active engagement >= 10s OR >= 2 pageviews OR has completed a conversion.
   */
  public static isSessionEngaged(params: {
    activeEngagementMs: number;
    pageViewCount: number;
    hasConversion: boolean;
  }): boolean {
    return (
      params.activeEngagementMs >= SessionizationService.ENGAGED_ACTIVE_MS_THRESHOLD ||
      params.pageViewCount >= 2 ||
      params.hasConversion === true
    );
  }
}
