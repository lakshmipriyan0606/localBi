import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '../../../../modules/auth/cookies';
import { SessionService } from '../../../../modules/auth/session-service';
import { ContextResolver } from '../../../../modules/auth/context-resolver';
import { AppError } from '../../../../shared/errors';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { user } = await ContextResolver.requireAuthenticatedUser(rawToken);

    const sessions = await SessionService.listUserSessions(user.id, rawToken || undefined);

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve active sessions.' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { user } = await ContextResolver.requireAuthenticatedUser(rawToken);

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const revokeAll = searchParams.get('all') === 'true';

    if (revokeAll) {
      await SessionService.revokeAllUserSessions(user.id);
      SessionCookieManager.clearSessionCookie(cookieStore);
      return NextResponse.json({ success: true, message: 'All sessions revoked.' });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'sessionId parameter is required' } },
        { status: 400 }
      );
    }

    await SessionService.revokeSessionByIdForUser(sessionId, user.id);

    return NextResponse.json({ success: true, message: 'Session revoked.' });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to revoke session.' } },
      { status: 500 }
    );
  }
}
