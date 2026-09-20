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

    const isDev = process.env.NODE_ENV !== 'production';
    let message = 'An unexpected authentication error occurred.';

    if (error instanceof Error) {
      if (error.message.includes("Can't reach database server") || error.message.includes('ECONNREFUSED')) {
        message = isDev
          ? `Database offline: Cannot connect to PostgreSQL at 127.0.0.1:5432. Please make sure Docker Desktop is running and run 'docker compose up -d'.`
          : 'Service temporarily unavailable. Please try again shortly.';
      } else if (isDev) {
        message = error.message;
      }
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message } },
      { status: 500 }
    );
  }
}
