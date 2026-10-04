import { SendEmailOptions, EmailDeliveryResult } from '../email-types';
import { logger } from '@/shared/observability/logger';
import axios from 'axios';

export class ResendMailTransport {
  public static async send(
    options: SendEmailOptions,
    apiKey: string,
    defaultFrom: string
  ): Promise<EmailDeliveryResult> {
    const timestamp = new Date();
    const from = options.from || defaultFrom;
    const to = Array.isArray(options.to) ? options.to : [options.to];

    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from,
          to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
          attachments: options.attachments?.map((a) => ({
            filename: a.filename,
            content: typeof a.content === 'string' ? a.content : a.content.toString('base64'),
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const messageId = response.data?.id || `resend-${Date.now()}`;

      logger.info(
        { to, subject: options.subject, messageId, provider: 'resend' },
        'ResendMailTransport: email sent successfully'
      );

      return {
        success: true,
        messageId,
        provider: 'resend',
        timestamp,
      };
    } catch (err: unknown) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
          ? err.message
          : 'Unknown Resend error';

      logger.error(
        { err, to, subject: options.subject, provider: 'resend' },
        `ResendMailTransport: failed to send email: ${errorMessage}`
      );

      return {
        success: false,
        error: errorMessage,
        provider: 'resend',
        timestamp,
      };
    }
  }
}
