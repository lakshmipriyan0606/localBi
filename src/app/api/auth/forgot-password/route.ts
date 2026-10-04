import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetService } from '../../../../modules/auth/password-reset';
import { AppError } from '../../../../shared/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Email address is required' } },
        { status: 400 }
      );
    }

    const result = await PasswordResetService.requestPasswordReset(email);

    if (result.rawToken) {
      const { getConfig } = await import('../../../../shared/config');
      const { EmailService } = await import('../../../../modules/email/email-service');
      const config = getConfig();
      const resetUrl = `${config.APP_URL}/auth/reset-password?token=${result.rawToken}`;

      EmailService.sendPasswordReset({
        recipientEmail: email,
        resetUrl,
        expiresInMinutes: 15,
      }).catch(() => {
        // Preserves non-enumeration security property
      });
    }

    return NextResponse.json({
      success: true,
      message: result.genericMessage,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to process password reset request.' } },
      { status: 500 }
    );
  }
}
