import crypto from 'node:crypto';
import {
  TelephonyProvider,
  AvailableNumberItem,
  ProvisionNumberResult,
  ForwardingConfigResult,
  ReleaseNumberResult,
  WebhookVerificationParams,
} from './telephony-provider';
import { NormalizedCallWebhookEvent, CallStatus } from './telephony-types';

export class TestTelephonyAdapter implements TelephonyProvider {
  public readonly name = 'TEST_ADAPTER';

  public availableNumbers: AvailableNumberItem[] = [
    {
      phoneNumber: '+914441234567',
      countryCode: 'IN',
      capabilities: { voice: true, sms: false },
    },
    {
      phoneNumber: '+914441234568',
      countryCode: 'IN',
      capabilities: { voice: true, sms: false },
    },
    {
      phoneNumber: '+914441234569',
      countryCode: 'IN',
      capabilities: { voice: true, sms: false },
    },
  ];

  public provisionedNumbers: Map<
    string,
    { providerNumberId: string; destinationNumber: string; status: string; webhookUrl: string }
  > = new Map();

  public failNextForwardingWith?: string | undefined;
  public forceAuthError = false;

  constructor(public defaultSecret: string = 'test_telephony_secret_key_12345') {}

  public static generateSignature(payload: string | Record<string, any>, secret: string): string {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(raw).digest('hex');
  }

  public async listAvailableNumbers(params: {
    countryCode?: string | undefined;
    pattern?: string | undefined;
    limit?: number | undefined;
  }): Promise<AvailableNumberItem[]> {
    if (this.forceAuthError) {
      throw new Error('Telephony provider authentication failed');
    }
    let filtered = [...this.availableNumbers];
    if (params.countryCode) {
      filtered = filtered.filter((n) => n.countryCode === params.countryCode);
    }
    if (params.pattern) {
      filtered = filtered.filter((n) => n.phoneNumber.includes(params.pattern!));
    }
    return filtered.slice(0, params.limit || 10);
  }

  public async provisionNumber(params: {
    phoneNumber: string;
    countryCode: string;
    webhookUrl: string;
    label?: string | undefined;
  }): Promise<ProvisionNumberResult> {
    if (this.forceAuthError) {
      throw new Error('Telephony provider authentication failed');
    }

    const providerNumberId = `pn_${params.phoneNumber.replace('+', '')}`;
    this.provisionedNumbers.set(params.phoneNumber, {
      providerNumberId,
      destinationNumber: '',
      status: 'ACTIVE',
      webhookUrl: params.webhookUrl,
    });

    return {
      success: true,
      providerNumberId,
      phoneNumber: params.phoneNumber,
      status: 'ACTIVE',
    };
  }

  public async configureForwarding(params: {
    providerNumberId?: string | undefined;
    phoneNumber: string;
    destinationNumber: string;
  }): Promise<ForwardingConfigResult> {
    if (this.failNextForwardingWith) {
      const err = this.failNextForwardingWith;
      this.failNextForwardingWith = undefined;
      return { success: false, forwardingNumber: '', error: err };
    }

    const existing = this.provisionedNumbers.get(params.phoneNumber);
    if (existing) {
      existing.destinationNumber = params.destinationNumber;
      this.provisionedNumbers.set(params.phoneNumber, existing);
    }

    return {
      success: true,
      forwardingNumber: params.destinationNumber,
    };
  }

  public async releaseNumber(params: {
    providerNumberId?: string | undefined;
    phoneNumber: string;
  }): Promise<ReleaseNumberResult> {
    this.provisionedNumbers.delete(params.phoneNumber);
    return {
      success: true,
      releasedAt: new Date(),
    };
  }

  public async verifyWebhook(params: WebhookVerificationParams): Promise<boolean> {
    if (!params.signature || !params.secret) {
      return false;
    }
    const expected = TestTelephonyAdapter.generateSignature(params.rawPayload, params.secret);
    return crypto.timingSafeEqual(Buffer.from(params.signature), Buffer.from(expected));
  }

  public generateWebhookSignature(
    rawPayload: Record<string, any>,
    secret?: string
  ): string {
    return TestTelephonyAdapter.generateSignature(rawPayload, secret || this.defaultSecret);
  }

  public async normalizeWebhookEvent(
    rawPayload: Record<string, any>,
    _headers: Record<string, string>
  ): Promise<NormalizedCallWebhookEvent> {
    const rawStatus = (rawPayload['status'] || rawPayload['callStatus'] || 'INITIATED').toUpperCase();
    let callStatus: CallStatus = 'INITIATED';

    if (rawStatus === 'RINGING') callStatus = 'RINGING';
    else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'ANSWERED') callStatus = 'ANSWERED';
    else if (rawStatus === 'COMPLETED') callStatus = 'COMPLETED';
    else if (rawStatus === 'NO_ANSWER' || rawStatus === 'MISSED') callStatus = 'MISSED';
    else if (rawStatus === 'BUSY') callStatus = 'BUSY';
    else if (rawStatus === 'FAILED') callStatus = 'FAILED';
    else if (rawStatus === 'CANCELED' || rawStatus === 'CANCELLED') callStatus = 'CANCELLED';

    const startedAt = rawPayload['startedAt'] ? new Date(rawPayload['startedAt']) : new Date();
    const answeredAt = rawPayload['answeredAt'] ? new Date(rawPayload['answeredAt']) : undefined;
    const endedAt = rawPayload['endedAt'] ? new Date(rawPayload['endedAt']) : undefined;

    return {
      provider: this.name,
      providerEventId: rawPayload['eventId'] || `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      providerCallId: rawPayload['callId'] || rawPayload['callSid'] || `call_${Date.now()}`,
      eventType: rawPayload['eventType'] || rawStatus.toLowerCase(),
      callStatus,
      callerNumber: rawPayload['from'] || rawPayload['callerNumber'] || '',
      destinationNumber: rawPayload['forwardedTo'] || rawPayload['destinationNumber'] || undefined,
      trackingNumber: rawPayload['to'] || rawPayload['trackingNumber'] || '',
      startedAt,
      answeredAt,
      endedAt,
      durationSeconds: Number(rawPayload['duration'] || rawPayload['durationSeconds'] || 0),
      talkDurationSeconds: Number(rawPayload['talkDuration'] || rawPayload['talkDurationSeconds'] || 0),
      recordingUrl: rawPayload['recordingUrl'] || undefined,
      rawPayload,
    };
  }

  public async getCallDetails(params: { providerCallId: string }): Promise<{
    providerCallId: string;
    status: string;
    durationSeconds?: number | undefined;
    recordingUrl?: string | undefined;
  }> {
    return {
      providerCallId: params.providerCallId,
      status: 'COMPLETED',
      durationSeconds: 120,
    };
  }
}
