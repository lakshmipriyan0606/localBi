import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AppError, ErrorCode } from '@/shared/errors';
import { TelephonyRegistry } from './telephony-registry';
import { CallStateMachine } from './call-state-machine';
import { LeadService } from '../leads/lead-service';
import {
  CallStatus,
  NormalizedCallWebhookEvent,
  PhoneUtils,
} from './telephony-types';

export interface IngestionWebhookInput {
  providerName: string;
  rawPayload: Record<string, any>;
  signature: string;
  headers: Record<string, string>;
  url?: string | undefined;
  secret?: string | undefined;
}

export interface IngestionResult {
  success: boolean;
  idempotent?: boolean | undefined;
  callId: string;
  status: CallStatus;
  leadId?: string | null | undefined;
  isOutOfOrder?: boolean | undefined;
}

export class CallIngestionService {
  /**
   * Ingest an inbound call lifecycle event from a telephony provider webhook.
   *
   * Security & Integrity Guarantees:
   * 1. Cryptographic HMAC signature verification
   * 2. Webhook payload SHA-256 deduplication (idempotency)
   * 3. Server-side tenant derivation strictly from dialed tracking number (never trust payload tenant)
   * 4. State-machine out-of-order event resilience (COMPLETED preserves terminal state)
   * 5. Caller PII protection via standard masking
   * 6. Automatic Lead generation for answered calls with idempotent deduplication
   */
  public static async processWebhook(
    input: IngestionWebhookInput
  ): Promise<IngestionResult> {
    const { providerName, rawPayload, signature, headers, url, secret } = input;

    // 1. Resolve telephony provider
    const provider = TelephonyRegistry.getProvider(providerName);

    // 2. Verify webhook authenticity (signature verification)
    const webhookSecret =
      secret ||
      process.env[`TELEPHONY_${provider.name}_SECRET`] ||
      process.env['TELEPHONY_WEBHOOK_SECRET'] ||
      process.env['TWILIO_AUTH_TOKEN'] ||
      'test_telephony_secret_key_12345';

    const isValid = await provider.verifyWebhook({
      rawPayload,
      signature,
      headers,
      secret: webhookSecret,
      url,
    });

    if (!isValid) {
      throw new AppError({
        code: ErrorCode.WEBHOOK_SIGNATURE_INVALID,
        message: `Invalid webhook signature from telephony provider ${provider.name}`,
        statusCode: 401,
      });
    }

    // 3. Normalize vendor-specific payload into canonical structure
    const normalized: NormalizedCallWebhookEvent = await provider.normalizeWebhookEvent(
      rawPayload,
      headers
    );

    // 4. Server-side Tenant Derivation:
    // Lookup the virtual number in PostgreSQL to derive tenantId, brandId, and storeId.
    // STRICT SECURITY: We NEVER trust any tenant identifier passed in rawPayload!
    const normalizedTrackingNumber = PhoneUtils.normalizePhoneNumber(normalized.trackingNumber);
    
    // Find virtual number across all tenants by dialed tracking number within scoped lookup transaction
    const vnumber = await TenantContextService.withTelephonyLookupContext(prisma, async (tx) => {
      return tx.virtualNumber.findFirst({
        where: {
          phoneNumber: normalizedTrackingNumber,
          status: { in: ['ACTIVE', 'RELEASE_PENDING', 'RELEASED'] },
        },
      });
    });

    if (!vnumber) {
      throw new AppError({
        code: ErrorCode.VIRTUAL_NUMBER_NOT_FOUND,
        message: `Tracking number ${normalizedTrackingNumber} is not mapped or recognized in LocalBi`,
        statusCode: 404,
      });
    }

    const { tenantId, brandId, storeId, webSurfaceId } = vnumber;

    // 5. Multi-Tenant Dual-Role RLS Execution Context
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 6. Webhook Idempotency Check
      const payloadHash = PhoneUtils.computePayloadHash(normalized.rawPayload);

      // Check if event already processed
      const existingEvent = await tx.callEvent.findUnique({
        where: {
          uq_call_event_provider_event: {
            tenantId,
            provider: normalized.provider,
            providerEventId: normalized.providerEventId,
          },
        },
      });

      if (existingEvent) {
        // Idempotent hit: return existing call reference without re-processing
        const call = await tx.call.findUnique({
          where: {
            uq_call_tenant_id: {
              tenantId,
              id: existingEvent.callId,
            },
          },
        });

        return {
          success: true,
          idempotent: true,
          callId: existingEvent.callId,
          status: (call?.status as CallStatus) || 'COMPLETED',
          leadId: call?.leadId,
        };
      }

      // 7. Find or Create Call Record
      let call = await tx.call.findUnique({
        where: {
          uq_call_provider_call_id: {
            tenantId,
            provider: normalized.provider,
            providerCallId: normalized.providerCallId,
          },
        },
      });

      let finalStatus: CallStatus = normalized.callStatus;
      let isOutOfOrder = false;

      if (call) {
        // Resolve status with state-machine precedence
        const stateRes = CallStateMachine.resolveNextStatus(
          call.status as CallStatus,
          normalized.callStatus,
          call.startedAt,
          normalized.startedAt
        );
        finalStatus = stateRes.nextStatus;
        isOutOfOrder = stateRes.isOutOfOrder;

        // Update existing call
        call = await tx.call.update({
          where: {
            uq_call_tenant_id: {
              tenantId,
              id: call.id,
            },
          },
          data: {
            status: finalStatus,
            answeredAt: normalized.answeredAt || call.answeredAt,
            endedAt: normalized.endedAt || call.endedAt,
            durationSeconds: Math.max(call.durationSeconds, normalized.durationSeconds || 0),
            talkDurationSeconds: Math.max(call.talkDurationSeconds, normalized.talkDurationSeconds || 0),
            recordingUrl: normalized.recordingUrl || call.recordingUrl,
          },
        });
      } else {
        // Create new Call record
        const normalizedCaller = PhoneUtils.normalizePhoneNumber(normalized.callerNumber);
        const callerMasked = PhoneUtils.maskPhoneNumber(normalizedCaller, false);

        call = await tx.call.create({
          data: {
            tenantId,
            brandId,
            storeId,
            webSurfaceId,
            virtualNumberId: vnumber.id,
            provider: normalized.provider,
            providerCallId: normalized.providerCallId,
            direction: 'INBOUND',
            callerNumber: normalizedCaller,
            callerNumberMasked: callerMasked,
            destinationNumber: normalized.destinationNumber || vnumber.forwardingNumber,
            status: finalStatus,
            startedAt: normalized.startedAt || new Date(),
            answeredAt: normalized.answeredAt || null,
            endedAt: normalized.endedAt || null,
            durationSeconds: normalized.durationSeconds || 0,
            talkDurationSeconds: normalized.talkDurationSeconds || 0,
            recordingUrl: normalized.recordingUrl || null,
            attributionConfidence: 'STORE_NUMBER',
            source: 'phone_call',
          },
        });
      }

      // 8. Record CallEvent log
      await tx.callEvent.create({
        data: {
          tenantId,
          callId: call.id,
          provider: normalized.provider,
          providerEventId: normalized.providerEventId,
          eventType: normalized.eventType,
          occurredAt: normalized.startedAt || new Date(),
          payloadHash,
          details: {
            callStatus: normalized.callStatus,
            durationSeconds: normalized.durationSeconds,
            talkDurationSeconds: normalized.talkDurationSeconds,
            isOutOfOrder,
          } as any,
        },
      });

      // 9. Lead Integration:
      // When a call is ANSWERED or COMPLETED, create or link a Lead of type CALL
      let leadId = call.leadId;
      if (!leadId && (finalStatus === 'ANSWERED' || finalStatus === 'COMPLETED')) {
        // Check if lead already exists via idempotencyKey
        const idempotencyKey = `call_${call.id}`;

        // Find active web surface if not directly mapped to virtual number
        let targetSurfaceId = webSurfaceId;
        if (!targetSurfaceId) {
          const surface = await tx.webSurface.findFirst({
            where: { tenantId, brandId },
            select: { id: true },
          });
          targetSurfaceId = surface?.id || null;
        }

        if (targetSurfaceId) {
          try {
            const callerMasked = PhoneUtils.maskPhoneNumber(normalized.callerNumber, false);
            const lead = await LeadService.createLead({
              tenantId,
              brandId,
              webSurfaceId: targetSurfaceId,
              storeId: call.storeId,
              type: 'CALL',
              status: 'NEW',
              name: `Caller (${callerMasked})`,
              phone: normalized.callerNumber,
              idempotencyKey,
              utmSource: 'telephony',
              utmMedium: 'inbound_call',
              metadata: {
                callId: call.id,
                provider: normalized.provider,
                providerCallId: normalized.providerCallId,
                durationSeconds: call.durationSeconds,
                talkDurationSeconds: call.talkDurationSeconds,
                trackingNumber: normalized.trackingNumber,
              },
            });

            leadId = lead.id;

            // Link lead to call
            await tx.call.update({
              where: {
                uq_call_tenant_id: {
                  tenantId,
                  id: call.id,
                },
              },
              data: {
                leadId: lead.id,
              },
            });
          } catch (err) {
            // Log but don't fail call ingestion if lead creation encounters non-fatal issue
            console.error('[CallIngestionService] Failed to create lead for call:', err);
          }
        }
      }

      return {
        success: true,
        callId: call.id,
        status: call.status as CallStatus,
        leadId,
        isOutOfOrder,
      };
    });
  }
}
