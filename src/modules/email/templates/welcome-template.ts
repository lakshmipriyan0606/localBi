import { SendWelcomeEmailData } from '../email-types';

export function renderWelcomeEmail(data: SendWelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to localBi — Let's get started`;

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
    .steps { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .step-item { display: flex; align-items: flex-start; margin-bottom: 16px; }
    .step-item:last-child { margin-bottom: 0; }
    .step-num { background: #0284c7; color: #ffffff; font-weight: 700; font-size: 12px; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; margin-top: 2px; }
    .step-title { font-weight: 600; font-size: 14px; color: #0f172a; margin-bottom: 2px; }
    .step-desc { font-size: 13px; color: #64748b; line-height: 1.4; }
    .btn-container { text-align: center; margin: 32px 0 20px 0; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25); }
    .footer { background: #f8fafc; padding: 24px 40px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">local<span>Bi</span></div>
    </div>
    <div class="content">
      <h1>Welcome to localBi, ${data.userName}!</h1>
      <p>Your account for <strong>${data.tenantName}</strong> is ready. localBi gives you unified intelligence across your local search presence, Google Business Profiles, website analytics, and local search rankings.</p>

      <div class="steps">
        <div class="step-item">
          <div class="step-num">1</div>
          <div>
            <div class="step-title">Connect your Google Integrations</div>
            <div class="step-desc">Link your GBP locations, Google Search Console, and GA4 properties to start ingesting metrics.</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div>
            <div class="step-title">Track Geo-Grid Local Rankings</div>
            <div class="step-desc">Configure keyword rank heatmaps across your business locations to see who dominates nearby.</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div>
            <div class="step-title">Audit Directory Listings</div>
            <div class="step-desc">Verify NAP (Name, Address, Phone) consistency across Google, Apple Maps, Bing, and Yelp.</div>
          </div>
        </div>
      </div>

      <div class="btn-container">
        <a href="${data.dashboardUrl}" class="btn" target="_blank">Go to Your Dashboard</a>
      </div>
    </div>
    <div class="footer">
      localBi &bull; Local Business Intelligence Platform for ${data.tenantName}
    </div>
  </div>
</body>
</html>`;

  const text = `Welcome to localBi, ${data.userName}!

Your account for ${data.tenantName} is ready.

Next steps:
1. Connect Google Integrations (GBP, GSC, GA4)
2. Track Geo-Grid Local Rankings
3. Audit Directory Listings & Citations

Access your dashboard here:
${data.dashboardUrl}

© localBi Local Business Intelligence
`;

  return { subject, html, text };
}
