export interface SendPasswordResetEmailData {
  recipientEmail: string;
  userName?: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function renderPasswordResetEmail(data: SendPasswordResetEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Reset your localBi password`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 32px 40px; }
    .brand { font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
    .brand span { color: #38bdf8; }
    .content { padding: 40px; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
    .notice { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #92400e; margin: 20px 0; }
    .btn-container { text-align: center; margin: 32px 0 20px 0; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25); }
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
      <h1>Password Reset Request</h1>
      <p>Hello${data.userName ? ` ${data.userName}` : ''},</p>
      <p>We received a request to reset your password for your localBi account. Click the button below to choose a new password.</p>

      <div class="notice">
        This link is single-use and will expire in <strong>${data.expiresInMinutes} minutes</strong>.
      </div>

      <div class="btn-container">
        <a href="${data.resetUrl}" class="btn" target="_blank">Reset Password</a>
      </div>

      <p class="link-alt">
        If you did not request a password reset, no action is needed and your account remains secure.<br><br>
        Direct URL: <a href="${data.resetUrl}" style="color: #0284c7;">${data.resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      localBi &bull; Local Business Intelligence Security
    </div>
  </div>
</body>
</html>`;

  const text = `Reset your localBi password

Hello${data.userName ? ` ${data.userName}` : ''},

We received a request to reset your password for your localBi account.

Click the link below to choose a new password (expires in ${data.expiresInMinutes} minutes):
${data.resetUrl}

If you did not request this reset, you can safely ignore this email.
`;

  return { subject, html, text };
}
