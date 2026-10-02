import { NormalizedCallWebhookEvent } from './telephony-types';

export interface AvailableNumberItem {
  phoneNumber: string; // E.164
  countryCode: string;
  monthlyCost?: number | undefined;
  currency?: string | undefined;
  capabilities: {
    voice: boolean;
    sms: boolean;
  };
}

export interface ProvisionNumberResult {
  success: boolean;
  providerNumberId: string;
  phoneNumber: string;
  status: 'ACTIVE' | 'PROVISIONING' | 'ERROR';
  error?: string | undefined;
}

export interface ForwardingConfigResult {
  success: boolean;
  forwardingNumber: string;
  error?: string | undefined;
}

export interface ReleaseNumberResult {
  success: boolean;
  releasedAt: Date;
  error?: string | undefined;
}

export interface WebhookVerificationParams {
  rawPayload: string | Record<string, any>;
  signature: string;
  headers: Record<string, string>;
  secret: string;
  url?: string | undefined;
}

export interface TelephonyProvider {
  readonly name: string;

  /**
   * Search available pool numbers that can be provisioned.
   */
  listAvailableNumbers(params: {
    countryCode?: string | undefined;
    pattern?: string | undefined;
    limit?: number | undefined;
  }): Promise<AvailableNumberItem[]>;

  /**
   * Provision a virtual tracking number from the provider.
   */
  provisionNumber(params: {
    phoneNumber: string;
    countryCode: string;
    webhookUrl: string;
    label?: string | undefined;
  }): Promise<ProvisionNumberResult>;

  /**
   * Update destination forwarding for a virtual number.
   */
  configureForwarding(params: {
    providerNumberId?: string | undefined;
    phoneNumber: string;
    destinationNumber: string;
  }): Promise<ForwardingConfigResult>;

  /**
   * Release a virtual tracking number back to the provider.
   */
  releaseNumber(params: {
    providerNumberId?: string | undefined;
    phoneNumber: string;
  }): Promise<ReleaseNumberResult>;

  /**
   * Verify authenticity of an inbound webhook using cryptographic signature.
   */
  verifyWebhook(params: WebhookVerificationParams): Promise<boolean>;

  /**
   * Normalize vendor-specific webhook payload into LocalBi canonical structure.
   */
  normalizeWebhookEvent(
    rawPayload: Record<string, any>,
    headers: Record<string, string>
  ): Promise<NormalizedCallWebhookEvent>;

  /**
   * Fetch call metadata directly from provider API if needed for reconciliation.
   */
  getCallDetails(params: { providerCallId: string }): Promise<{
    providerCallId: string;
    status: string;
    durationSeconds?: number | undefined;
    recordingUrl?: string | undefined;
  }>;
}
