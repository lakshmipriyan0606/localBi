import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { EmailService } from '@/modules/email/email-service';
import { getConfig } from '@/shared/config';
import { handleRouteError } from '@/shared/errors';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json().catch(() => ({}));
    const recipientEmail = body.to || authorizedContext.email;

    const config = getConfig();

    const result = await EmailService.send({
      to: recipientEmail,
      subject: `[Test] localBi Email Verification — ${tenantSlug}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #0284c7;">localBi Email Delivery Test</h2>
          <p>This is a verification email from your localBi instance.</p>
          <ul>
            <li><strong>Tenant:</strong> ${tenantSlug}</li>
            <li><strong>Configured Provider:</strong> ${EmailService.getProvider()}</li>
            <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          </ul>
          <p style="color: #16a34a; font-weight: bold;">✔ Email pipeline is functioning properly!</p>
        </div>
      `,
      text: `localBi Email Delivery Test\nTenant: ${tenantSlug}\nProvider: ${EmailService.getProvider()}\nTimestamp: ${new Date().toISOString()}\nStatus: Success`,
    });

    return NextResponse.json({
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
      recipient: recipientEmail,
      error: result.error,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to send test email.');
  }
}
