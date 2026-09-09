import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '../../../../modules/auth/auth-service';
import { SessionCookieManager } from '../../../../modules/auth/cookies';
import { AppError } from '../../../../shared/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const result = await AuthService.loginWithPassword(email, password, {
      ipAddress,
      userAgent,
    });

    const cookieStore = await cookies();
    SessionCookieManager.setSessionCookie(cookieStore, result.rawToken);

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected authentication error occurred.' } },
      { status: 500 }
    );
  }
}
