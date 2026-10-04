import { SendReportDeliveryEmailData } from '../email-types';

export function renderReportDeliveryEmail(data: SendReportDeliveryEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `[Report] ${data.reportName} — ${data.brandName} (${data.periodKey})`;

  const metricsHtml = data.metrics && data.metrics.length > 0
    ? `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 24px 0;">
        ${data.metrics.map(m => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
            <div style="font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase;">${m.label}</div>
            <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px;">${m.value}</div>
            ${m.change ? `
              <div style="font-size: 12px; font-weight: 600; margin-top: 2px; color: ${m.direction === 'up' ? '#16a34a' : m.direction === 'down' ? '#dc2626' : '#64748b'};">
                ${m.direction === 'up' ? '▲ ' : m.direction === 'down' ? '▼ ' : ''}${m.change} vs prev
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `
    : '';

  const metricsText = data.metrics && data.metrics.length > 0
    ? '\nKey Metrics:\n' + data.metrics.map(m => `- ${m.label}: ${m.value} ${m.change ? `(${m.change})` : ''}`).join('\n') + '\n'
    : '';

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
    .tag { display: inline-block; background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; margin-top: 8px; }
    .content { padding: 40px; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px; }
    .meta-subtitle { font-size: 14px; color: #64748b; margin-bottom: 24px; }
    p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .btn-container { text-align: center; margin: 32px 0 20px 0; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25); }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">local<span>Bi</span></div>
      <div class="tag">Scheduled Report · ${data.periodKey}</div>
    </div>
    <div class="content">
      <h1>${data.reportName}</h1>
      <div class="meta-subtitle">
        Brand: <strong>${data.brandName}</strong> &bull; Organization: <strong>${data.tenantName}</strong>
      </div>
      <p>Your periodic performance report has been compiled and is ready for review.</p>

      ${metricsHtml}

      <div class="btn-container">
        <a href="${data.reportUrl}" class="btn" target="_blank">View Full Interactive Report</a>
      </div>

      <p style="font-size: 13px; color: #94a3b8; text-align: center;">
        Format: ${data.format || 'Interactive'} &bull; Delivery Period: ${data.periodKey}
      </p>
    </div>
    <div class="footer">
      Sent automatically by localBi for ${data.tenantName}. You received this because you are configured as a recipient for this report schedule.
    </div>
  </div>
</body>
</html>`;

  const text = `${data.reportName} — ${data.brandName} (${data.periodKey})

Organization: ${data.tenantName}
Brand: ${data.brandName}
Period: ${data.periodKey}
${metricsText}
To view your full interactive report, visit:
${data.reportUrl}

Sent automatically by localBi for ${data.tenantName}.
`;

  return { subject, html, text };
}
