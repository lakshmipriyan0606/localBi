import { getConfig } from '@/shared/config';
import { logger } from '@/shared/observability/logger';
import {
  SendEmailOptions,
  EmailDeliveryResult,
  SendInvitationEmailData,
  SendReportDeliveryEmailData,
  SendWelcomeEmailData,
  SendPasswordResetEmailData,
  EmailProviderType,
} from './email-types';
import { ConsoleMailTransport } from './transports/console-transport';
import { ResendMailTransport } from './transports/resend-transport';
import { renderInvitationEmail } from './templates/invitation-template';
import { renderReportDeliveryEmail } from './templates/report-delivery-template';
import { renderWelcomeEmail } from './templates/welcome-template';
import { renderPasswordResetEmail } from './templates/password-reset-template';

export class EmailService {
  /**
   * Resolves the active email provider based on environment configuration.
   */
  public static getProvider(): EmailProviderType {
    const config = getConfig();
    if (config.EMAIL_PROVIDER === 'resend' && config.RESEND_API_KEY) {
      return 'resend';
    }
    if (config.EMAIL_PROVIDER === 'smtp' && config.SMTP_HOST) {
      return 'smtp';
    }
    return config.EMAIL_PROVIDER || 'console';
  }

  /**
   * Sends a generic email using the configured transport.
   */
  public static async send(options: SendEmailOptions): Promise<EmailDeliveryResult> {
    const config = getConfig();
    const provider = this.getProvider();
    const from = options.from || config.EMAIL_FROM;

    logger.debug(
      { to: options.to, subject: options.subject, provider },
      'EmailService: dispatching email'
    );

    if (provider === 'resend' && config.RESEND_API_KEY) {
      return ResendMailTransport.send(options, config.RESEND_API_KEY, from);
    }

    // Default to Console/Mock transport
    return ConsoleMailTransport.send({ ...options, from });
  }

  /**
   * Sends a team member invitation email.
   */
  public static async sendInvitation(
    data: SendInvitationEmailData
  ): Promise<EmailDeliveryResult> {
    const { subject, html, text } = renderInvitationEmail(data);
    return this.send({
      to: data.recipientEmail,
      subject,
      html,
      text,
      tags: { type: 'invitation', tenant: data.tenantName },
    });
  }

  /**
   * Sends an executive report delivery email.
   */
  public static async sendReport(
    data: SendReportDeliveryEmailData
  ): Promise<EmailDeliveryResult> {
    const { subject, html, text } = renderReportDeliveryEmail(data);
    return this.send({
      to: data.recipientEmail,
      subject,
      html,
      text,
      attachments: data.attachments,
      tags: { type: 'report-delivery', period: data.periodKey },
    });
  }

  /**
   * Sends an onboarding welcome email.
   */
  public static async sendWelcome(
    data: SendWelcomeEmailData
  ): Promise<EmailDeliveryResult> {
    const { subject, html, text } = renderWelcomeEmail(data);
    return this.send({
      to: data.recipientEmail,
      subject,
      html,
      text,
      tags: { type: 'welcome' },
    });
  }

  /**
   * Sends a password reset request email.
   */
  public static async sendPasswordReset(
    data: SendPasswordResetEmailData
  ): Promise<EmailDeliveryResult> {
    const { subject, html, text } = renderPasswordResetEmail(data);
    return this.send({
      to: data.recipientEmail,
      subject,
      html,
      text,
      tags: { type: 'password-reset' },
    });
  }

  /**
   * Returns delivery history from the mock/console transport (useful for test assertions).
   */
  public static getSentHistory() {
    return ConsoleMailTransport.getHistory();
  }

  /**
   * Clears delivery history from the mock/console transport.
   */
  public static clearSentHistory() {
    ConsoleMailTransport.clearHistory();
  }
}
