export type EmailProviderType = 'resend' | 'smtp' | 'console' | 'mock';

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  tags?: Record<string, string>;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: EmailProviderType;
  timestamp: Date;
}

export interface SendInvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  tenantName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

export interface ReportMetricSummary {
  label: string;
  value: string | number;
  change?: string;
  direction?: 'up' | 'down' | 'neutral';
}

export interface SendReportDeliveryEmailData {
  recipientEmail: string;
  tenantName: string;
  brandName: string;
  reportName: string;
  periodKey: string;
  format?: 'PDF' | 'EMAIL_SUMMARY' | 'CSV';
  metrics?: ReportMetricSummary[];
  reportUrl: string;
  attachments?: EmailAttachment[];
}

export interface SendWelcomeEmailData {
  recipientEmail: string;
  userName: string;
  tenantName: string;
  dashboardUrl: string;
}

export interface SendPasswordResetEmailData {
  recipientEmail: string;
  userName?: string;
  resetUrl: string;
  expiresInMinutes: number;
}
