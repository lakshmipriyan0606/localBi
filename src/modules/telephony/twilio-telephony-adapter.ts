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
import { AppError } from '@/shared/errors';

export class TwilioTelephonyAdapter implements TelephonyProvider {
  public readonly name = 'TWILIO';

  public async listAvailableNumbers(_params: {
    countryCode?: string | undefined;
    pattern?: string | undefined;
    limit?: number | undefined;
  }): Promise<AvailableNumberItem[]> {
    if (!process.env['TWILIO_ACCOUNT_SID'] || !process.env['TWILIO_AUTH_TOKEN']) {
      throw new AppError({
        code: 'TELEPHONY_PROVIDER_ERROR',
        message: 'Twilio telephony credentials are not configured.',
        statusCode: 503,
        isOperational: true,
      });
    }
    return [];
  }

  public async provisionNumber(_params: {
    phoneNumber: string;
    countryCode: string;
    webhookUrl: string;
    label?: string | undefined;
  }): Promise<ProvisionNumberResult> {
    if (!process.env['TWILIO_ACCOUNT_SID'] || !process.env['TWILIO_AUTH_TOKEN']) {
      throw new AppError({
        code: 'TELEPHONY_PROVIDER_ERROR',
        message: 'Twilio telephony credentials are not configured.',
        statusCode: 503,
        isOperational: true,
      });
    }
    return {
      success: false,
      providerNumberId: '',
      phoneNumber: _params.phoneNumber,
      status: 'ERROR',
      error: 'Twilio automated provisioning requires configured account SID.',
    };
  }

  public async configureForwarding(_params: {
    providerNumberId?: string | undefined;
    phoneNumber: string;
    destinationNumber: string;
  }): Promise<ForwardingConfigResult> {
    if (!process.env['TWILIO_ACCOUNT_SID'] || !process.env['TWILIO_AUTH_TOKEN']) {
      throw new AppError({
        code: 'TELEPHONY_PROVIDER_ERROR',
        message: 'Twilio telephony credentials are not configured.',
        statusCode: 503,
        isOperational: true,
      });
    }
    return {
      success: false,
      forwardingNumber: _params.destinationNumber,
      error: 'Twilio automated forwarding requires configured account SID.',
    };
  }

  public async releaseNumber(_params: {
    providerNumberId?: string | undefined;
    phoneNumber: string;
  }): Promise<ReleaseNumberResult> {
    if (!process.env['TWILIO_ACCOUNT_SID'] || !process.env['TWILIO_AUTH_TOKEN']) {
      throw new AppError({
        code: 'TELEPHONY_PROVIDER_ERROR',
        message: 'Twilio telephony credentials are not configured.',
        statusCode: 503,
        isOperational: true,
      });
    }
    return {
      success: false,
      releasedAt: new Date(),
      error: 'Twilio automated release requires configured account SID.',
    };
  }

  /**
   * Twilio Webhook Signature Validation (RFC 2104 HMAC-SHA1).
   * Constructs data string from full URL and sorted POST parameters.
   */
  public async verifyWebhook(params: WebhookVerificationParams): Promise<boolean> {
    const { rawPayload, signature, secret, url } = params;
    if (!signature || !secret) {
      return false;
    }

    try {
      let data = url || '';
      if (typeof rawPayload === 'object' && rawPayload !== null) {
        const keys = Object.keys(rawPayload).sort();
        for (const k of keys) {
          data += `${k}${rawPayload[k]}`;
        }
      } else if (typeof rawPayload === 'string') {
        data += rawPayload;
      }

      const expected = crypto.createHmac('sha1', secret).update(Buffer.from(data, 'utf-8')).digest('base64');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  public async normalizeWebhookEvent(
    rawPayload: Record<string, any>,
    headers: Record<string, string>
  ): Promise<NormalizedCallWebhookEvent> {
    const rawStatus = (rawPayload['CallStatus'] || rawPayload['status'] || 'initiated').toLowerCase();
    let callStatus: CallStatus = 'INITIATED';

    if (rawStatus === 'ringing') callStatus = 'RINGING';
    else if (rawStatus === 'in-progress' || rawStatus === 'answered') callStatus = 'ANSWERED';
    else if (rawStatus === 'completed') callStatus = 'COMPLETED';
    else if (rawStatus === 'no-answer') callStatus = 'MISSED';
    else if (rawStatus === 'busy') callStatus = 'BUSY';
    else if (rawStatus === 'failed') callStatus = 'FAILED';
    else if (rawStatus === 'canceled' || rawStatus === 'cancelled') callStatus = 'CANCELLED';

    const duration = rawPayload['CallDuration'] || rawPayload['duration'] || 0;
    const providerCallId = rawPayload['CallSid'] || rawPayload['callSid'] || '';
    const providerEventId =
      headers['x-twilio-event-id'] ||
      `${providerCallId}_${rawStatus}_${rawPayload['SequenceNumber'] || Date.now()}`;

    return {
      provider: this.name,
      providerEventId,
      providerCallId,
      eventType: rawStatus,
      callStatus,
      callerNumber: rawPayload['From'] || rawPayload['from'] || '',
      destinationNumber: rawPayload['ForwardedFrom'] || rawPayload['To'] || undefined,
      trackingNumber: rawPayload['Called'] || rawPayload['To'] || '',
      startedAt: new Date(rawPayload['Timestamp'] || Date.now()),
      durationSeconds: parseInt(duration, 10) || 0,
      talkDurationSeconds: parseInt(duration, 10) || 0,
      recordingUrl: rawPayload['RecordingUrl'] || undefined,
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
      status: 'UNKNOWN',
    };
  }
}
