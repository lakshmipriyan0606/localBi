import crypto from 'node:crypto';

export type CallStatus =
  | 'INITIATED'
  | 'RINGING'
  | 'ANSWERED'
  | 'COMPLETED'
  | 'MISSED'
  | 'BUSY'
  | 'FAILED'
  | 'CANCELLED';

export type VirtualNumberStatus =
  | 'AVAILABLE'
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'RELEASE_PENDING'
  | 'RELEASED'
  | 'ERROR';

export type AttributionConfidence =
  | 'STORE_NUMBER'
  | 'SESSION_DNI'
  | 'CALL_CLICK_CORRELATED'
  | 'DIRECT'
  | 'UNKNOWN';

export interface VirtualNumberDto {
  id: string;
  tenantId: string;
  brandId: string;
  storeId?: string | null | undefined;
  webSurfaceId?: string | null | undefined;
  provider: string;
  providerNumberId?: string | null | undefined;
  phoneNumber: string;
  countryCode: string;
  forwardingNumber?: string | null | undefined;
  status: VirtualNumberStatus;
  capabilities?: Record<string, any> | null | undefined;
  createdAt: Date;
  activatedAt?: Date | null | undefined;
  releasedAt?: Date | null | undefined;
}

export interface CallDto {
  id: string;
  tenantId: string;
  brandId: string;
  storeId?: string | null | undefined;
  storeName?: string | null | undefined;
  webSurfaceId?: string | null | undefined;
  pageId?: string | null | undefined;
  productId?: string | null | undefined;
  virtualNumberId: string;
  trackingNumber: string;
  provider: string;
  providerCallId: string;
  direction: string;
  callerNumber: string; // Masked or unmasked depending on authorization
  destinationNumber?: string | null | undefined;
  status: CallStatus;
  startedAt: Date;
  answeredAt?: Date | null | undefined;
  endedAt?: Date | null | undefined;
  durationSeconds: number;
  talkDurationSeconds: number;
  recordingUrl?: string | null | undefined;
  attributionConfidence: AttributionConfidence;
  source?: string | null | undefined;
  medium?: string | null | undefined;
  campaign?: string | null | undefined;
  attributionSessionId?: string | null | undefined;
  leadId?: string | null | undefined;
  leadStatus?: string | null | undefined;
  createdAt: Date;
}

export interface CallEventDto {
  id: string;
  callId: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  occurredAt: Date;
  payloadHash: string;
  details?: Record<string, any> | null | undefined;
}

export interface CallSummaryDto {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  busyCalls: number;
  failedCalls: number;
  answerRatePercentage: number;
  avgDurationSeconds: number;
  avgTalkDurationSeconds: number;
  uniqueCallersCount: number;
  topCallGeneratingPages?: Array<{ pageId: string; path?: string; calls: number }> | undefined;
  topCallSources?: Record<string, number> | undefined;
}

export interface StoreCallSummaryDto {
  storeId: string;
  storeName: string;
  storeCode?: string | null | undefined;
  trackingNumber?: string | null | undefined;
  realPhone?: string | null | undefined;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  answerRatePercentage: number;
  avgTalkDurationSeconds: number;
}

export interface NormalizedCallWebhookEvent {
  provider: string;
  providerEventId: string;
  providerCallId: string;
  eventType: string; // initiated, ringing, answered, completed, missed, etc.
  callStatus: CallStatus;
  callerNumber: string; // E.164 (e.g. +919840155667)
  destinationNumber?: string | undefined; // Forwarded destination (e.g. +919840155667)
  trackingNumber: string; // The virtual number dialed by caller
  startedAt: Date;
  answeredAt?: Date | undefined;
  endedAt?: Date | undefined;
  durationSeconds?: number | undefined;
  talkDurationSeconds?: number | undefined;
  recordingUrl?: string | undefined;
  rawPayload: Record<string, any>;
}

export class PhoneUtils {
  /**
   * Normalizes a phone number to standard format with country code.
   * Strips spaces, dashes, parentheses.
   */
  public static normalizePhoneNumber(raw: string, defaultCountryCode = '+91'): string {
    if (!raw) return '';
    const cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, '');
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    if (cleaned.startsWith('00')) {
      return `+${cleaned.slice(2)}`;
    }
    if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      return `${defaultCountryCode}${cleaned}`;
    }
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `${defaultCountryCode}${cleaned.slice(1)}`;
    }
    return `+${cleaned}`;
  }

  /**
   * Validates if a normalized phone number satisfies standard international rules.
   */
  public static isValidE164(phone: string): boolean {
    if (!phone) return false;
    // Standard E.164: + followed by 7 to 15 digits
    return /^\+[1-9]\d{6,14}$/.test(phone);
  }

  /**
   * Masks a phone number for non-privileged viewers to protect PII.
   * Example: +919840155667 -> +91 ******5667
   */
  public static maskPhoneNumber(phone: string | null | undefined, hasFullPiiAccess = false): string {
    if (!phone) return '';
    if (hasFullPiiAccess) return phone;

    const norm = phone.trim();
    if (norm.length <= 6) {
      return '******';
    }

    // Preserve country prefix if present (+91) and last 4 digits
    if (norm.startsWith('+') && norm.length >= 10) {
      const prefix = norm.slice(0, 3); // e.g. +91
      const suffix = norm.slice(-4);   // e.g. 5667
      return `${prefix} ******${suffix}`;
    }

    const suffix = norm.slice(-4);
    return `******${suffix}`;
  }

  /**
   * Computes a deterministic SHA-256 hash of a payload for idempotency.
   */
  public static computePayloadHash(data: Record<string, any>): string {
    const keys = Object.keys(data).sort();
    const clean: Record<string, any> = {};
    for (const k of keys) {
      if (data[k] !== undefined && data[k] !== null) {
        clean[k] = data[k];
      }
    }
    return crypto.createHash('sha256').update(JSON.stringify(clean)).digest('hex');
  }

  /**
   * Prevents CSV formula injection for spreadsheet safety.
   */
  public static sanitizeCsvField(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/^[=\+\-\@\t\r]/.test(str)) {
      return `'${str}`;
    }
    return str;
  }
}
