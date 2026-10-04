import { SendEmailOptions, EmailDeliveryResult } from '../email-types';
import { logger } from '@/shared/observability/logger';
import crypto from 'node:crypto';

export class ConsoleMailTransport {
  private static sentHistory: Array<SendEmailOptions & { timestamp: Date; messageId: string }> = [];

  public static async send(options: SendEmailOptions): Promise<EmailDeliveryResult> {
    const messageId = `mock-${crypto.randomUUID()}`;
    const timestamp = new Date();

    this.sentHistory.push({
      ...options,
      timestamp,
      messageId,
    });

    // Cap history size to prevent memory leaks in dev
    if (this.sentHistory.length > 500) {
      this.sentHistory.shift();
    }

    logger.info(
      {
        to: options.to,
        subject: options.subject,
        messageId,
        provider: 'console',
      },
      `[EmailService:Console] Sent email "${options.subject}" to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`
    );

    return {
      success: true,
      messageId,
      provider: 'console',
      timestamp,
    };
  }

  public static getHistory(): Array<SendEmailOptions & { timestamp: Date; messageId: string }> {
    return [...this.sentHistory];
  }

  public static clearHistory(): void {
    this.sentHistory = [];
  }
}
