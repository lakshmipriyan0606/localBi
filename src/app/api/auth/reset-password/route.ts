import { NextRequest, NextResponse } from 'next/server';
import { PasswordResetService } from '../../../../modules/auth/password-reset';
import { AppError } from '../../../../shared/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Token and new password are required' } },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    await PasswordResetService.resetPassword(token, newPassword, { ipAddress, userAgent });

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated. All sessions across all devices have been terminated.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to reset password.' } },
      { status: 500 }
    );
  }
}
