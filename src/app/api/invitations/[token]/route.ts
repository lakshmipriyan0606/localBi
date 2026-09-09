import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { InvitationService } from '../../../../modules/invitations/invitation-service';
import { SessionService } from '../../../../modules/auth/session-service';
import { SessionCookieManager } from '../../../../modules/auth/cookies';
import { AppError } from '../../../../shared/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const details = await InvitationService.getInvitationByToken(token);
    return NextResponse.json({ success: true, invitation: details });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to resolve invitation.' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { fullName, password } = body;

    const cookieStore = await cookies();
    const currentSessionToken = SessionCookieManager.getSessionToken(cookieStore);
    let existingUserId: string | undefined;
    if (currentSessionToken) {
      try {
        const sessionRes = await SessionService.resolveSession(currentSessionToken);
        if (sessionRes) {
          existingUserId = sessionRes.user.id;
        }
      } catch {
        // Ignore invalid session and proceed with new registration
      }
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const result = await InvitationService.acceptInvitation(
      token,
      { fullName, password },
      existingUserId,
      { ipAddress, userAgent }
    );

    SessionCookieManager.setSessionCookie(cookieStore, result.rawToken);

    return NextResponse.json({
      success: true,
      user: result.user,
      message: 'Invitation successfully accepted.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to accept invitation.' } },
      { status: 500 }
    );
  }
}
