import { SendInvitationEmailData } from '../email-types';

export function renderInvitationEmail(data: SendInvitationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `You've been invited to join ${data.tenantName} on localBi`;
  const expiryFormatted = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(data.expiresAt);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 32px 40px; text-align: left; }
    .brand { font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
    .brand span { color: #38bdf8; }
    .content { padding: 40px; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .badge-box { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #0284c7; }
    .badge-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
    .badge-label { color: #64748b; font-weight: 500; }
    .badge-value { color: #0f172a; font-weight: 600; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25); }
    .btn:hover { background-color: #0369a1; }
    .link-alt { font-size: 13px; color: #64748b; word-break: break-all; margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">local<span>Bi</span></div>
    </div>
    <div class="content">
      <h1>You're invited to collaborate</h1>
      <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
      <p><strong>${data.inviterName}</strong> has invited you to join the organization <strong>${data.tenantName}</strong> on localBi — Local Business Intelligence platform.</p>
      
      <div class="badge-box">
        <div class="badge-row">
          <span class="badge-label">Organization:</span>
          <span class="badge-value">${data.tenantName}</span>
        </div>
        <div class="badge-row">
          <span class="badge-label">Assigned Role:</span>
          <span class="badge-value">${data.role}</span>
        </div>
        <div class="badge-row">
          <span class="badge-label">Invitation Valid Until:</span>
          <span class="badge-value">${expiryFormatted} UTC</span>
        </div>
      </div>

      <div class="btn-container">
        <a href="${data.inviteUrl}" class="btn" target="_blank">Accept Invitation & Join Team</a>
      </div>

      <p class="link-alt">
        If the button above doesn't work, copy and paste this URL into your browser:<br>
        <a href="${data.inviteUrl}" style="color: #0284c7;">${data.inviteUrl}</a>
      </p>
    </div>
    <div class="footer">
      This invitation was intended for ${data.recipientEmail}. If you were not expecting this invitation, you can safely ignore this email.
    </div>
  </div>
</body>
</html>`;

  const text = `You've been invited to join ${data.tenantName} on localBi

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

${data.inviterName} has invited you to join ${data.tenantName} on localBi as a ${data.role}.

To accept this invitation, please visit the following link:
${data.inviteUrl}

This invitation will expire on ${expiryFormatted} UTC.

If you were not expecting this email, please ignore it.
© localBi Local Business Intelligence
`;

  return { subject, html, text };
}
