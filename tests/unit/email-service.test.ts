import { describe, it, expect, beforeEach } from 'vitest';
import { EmailService } from '@/modules/email/email-service';
import { renderInvitationEmail } from '@/modules/email/templates/invitation-template';
import { renderReportDeliveryEmail } from '@/modules/email/templates/report-delivery-template';
import { renderWelcomeEmail } from '@/modules/email/templates/welcome-template';
import { renderPasswordResetEmail } from '@/modules/email/templates/password-reset-template';

describe('Phase 21 — Email Delivery Service', () => {
  beforeEach(() => {
    EmailService.clearSentHistory();
  });

  describe('Core Email Dispatch & Mock Transport', () => {
    it('dispatches email through console/mock transport and records in history', async () => {
      const result = await EmailService.send({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test body</p>',
        text: 'Test body',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('console');
      expect(result.messageId).toBeDefined();

      const history = EmailService.getSentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].to).toBe('user@example.com');
      expect(history[0].subject).toBe('Test Subject');
    });

    it('clears history properly', async () => {
      await EmailService.send({
        to: 'test@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
      });
      expect(EmailService.getSentHistory()).toHaveLength(1);

      EmailService.clearSentHistory();
      expect(EmailService.getSentHistory()).toHaveLength(0);
    });
  });

  describe('Invitation Email', () => {
    it('renders valid invitation HTML and plain text with correct tokens and details', () => {
      const expiresAt = new Date('2026-10-15T12:00:00.000Z');
      const rendered = renderInvitationEmail({
        recipientEmail: 'sarah@client.com',
        recipientName: 'Sarah Connor',
        inviterName: 'John Doe',
        tenantName: 'Acme Corp',
        role: 'CLIENT_ADMIN',
        inviteUrl: 'https://localbi.app/auth/accept-invite?token=abc123xyz',
        expiresAt,
      });

      expect(rendered.subject).toContain("You've been invited to join Acme Corp on localBi");
      expect(rendered.html).toContain('Sarah Connor');
      expect(rendered.html).toContain('John Doe');
      expect(rendered.html).toContain('Acme Corp');
      expect(rendered.html).toContain('CLIENT_ADMIN');
      expect(rendered.html).toContain('https://localbi.app/auth/accept-invite?token=abc123xyz');

      expect(rendered.text).toContain('John Doe has invited you');
      expect(rendered.text).toContain('https://localbi.app/auth/accept-invite?token=abc123xyz');
    });

    it('dispatches invitation email via EmailService.sendInvitation', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const result = await EmailService.sendInvitation({
        recipientEmail: 'invitee@test.com',
        inviterName: 'Admin Bob',
        tenantName: 'TechCorp',
        role: 'STORE_MANAGER',
        inviteUrl: 'https://app.localbi.com/invite/tok123',
        expiresAt,
      });

      expect(result.success).toBe(true);
      const history = EmailService.getSentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].to).toBe('invitee@test.com');
      expect(history[0].subject).toContain('TechCorp');
    });
  });

  describe('Report Delivery Email', () => {
    it('renders report delivery email with metrics and periodKey', () => {
      const rendered = renderReportDeliveryEmail({
        recipientEmail: 'cmo@enterprise.com',
        tenantName: 'MegaCorp',
        brandName: 'Brand Alpha',
        reportName: 'Weekly Executive Brief',
        periodKey: 'weekly_2026_w40',
        metrics: [
          { label: 'GBP Calls', value: '1,420', change: '+12%', direction: 'up' },
          { label: 'Organic Clicks', value: '45.2K', change: '-3%', direction: 'down' },
        ],
        reportUrl: 'https://app.localbi.com/t/megacorp/reports/executive?snapshotId=snap123',
      });

      expect(rendered.subject).toContain('Weekly Executive Brief');
      expect(rendered.subject).toContain('Brand Alpha');
      expect(rendered.html).toContain('1,420');
      expect(rendered.html).toContain('GBP Calls');
      expect(rendered.html).toContain('Organic Clicks');
      expect(rendered.html).toContain('snap123');
      expect(rendered.text).toContain('GBP Calls: 1,420 (+12%)');
    });

    it('dispatches report delivery email through EmailService.sendReport', async () => {
      const result = await EmailService.sendReport({
        recipientEmail: 'exec@acme.com',
        tenantName: 'Acme',
        brandName: 'Acme Retail',
        reportName: 'Monthly SEO Summary',
        periodKey: 'monthly_2026_10',
        reportUrl: 'https://app.localbi.com/t/acme/reports/exec',
      });

      expect(result.success).toBe(true);
      const history = EmailService.getSentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].to).toBe('exec@acme.com');
      expect(history[0].subject).toContain('Monthly SEO Summary');
    });
  });

  describe('Welcome Email', () => {
    it('renders welcome template with onboarding guidance', () => {
      const rendered = renderWelcomeEmail({
        recipientEmail: 'newbie@localbi.app',
        userName: 'Alex',
        tenantName: 'Retail Co',
        dashboardUrl: 'https://app.localbi.com/t/retail/dashboard',
      });

      expect(rendered.subject).toContain('Welcome to localBi');
      expect(rendered.html).toContain('Alex');
      expect(rendered.html).toContain('Retail Co');
      expect(rendered.html).toContain('Connect your Google Integrations');
      expect(rendered.html).toContain('https://app.localbi.com/t/retail/dashboard');
    });

    it('dispatches welcome email through EmailService.sendWelcome', async () => {
      const result = await EmailService.sendWelcome({
        recipientEmail: 'alex@retail.com',
        userName: 'Alex',
        tenantName: 'Retail Co',
        dashboardUrl: 'https://app.localbi.com/t/retail/dashboard',
      });

      expect(result.success).toBe(true);
      const history = EmailService.getSentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].to).toBe('alex@retail.com');
      expect(history[0].subject).toContain('Welcome to localBi');
    });
  });

  describe('Password Reset Email', () => {
    it('renders password reset email with direct link and expiration', () => {
      const rendered = renderPasswordResetEmail({
        recipientEmail: 'user@localbi.com',
        userName: 'Charlie',
        resetUrl: 'https://localbi.app/auth/reset-password?token=resettok',
        expiresInMinutes: 15,
      });

      expect(rendered.subject).toContain('Reset your localBi password');
      expect(rendered.html).toContain('Charlie');
      expect(rendered.html).toContain('15 minutes');
      expect(rendered.html).toContain('https://localbi.app/auth/reset-password?token=resettok');
      expect(rendered.text).toContain('https://localbi.app/auth/reset-password?token=resettok');
    });

    it('dispatches password reset email through EmailService.sendPasswordReset', async () => {
      const result = await EmailService.sendPasswordReset({
        recipientEmail: 'user@localbi.com',
        userName: 'Charlie',
        resetUrl: 'https://localbi.app/auth/reset-password?token=resettok',
        expiresInMinutes: 15,
      });

      expect(result.success).toBe(true);
      const history = EmailService.getSentHistory();
      expect(history).toHaveLength(1);
      expect(history[0].to).toBe('user@localbi.com');
      expect(history[0].subject).toContain('Reset your localBi password');
    });
  });
});
