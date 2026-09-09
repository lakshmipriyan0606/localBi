import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '../../../../modules/auth/auth-service';
import { SessionCookieManager } from '../../../../modules/auth/cookies';

export async function POST() {
  const cookieStore = await cookies();
  const rawToken = SessionCookieManager.getSessionToken(cookieStore);

  if (rawToken) {
    await AuthService.logout(rawToken);
  }

  SessionCookieManager.clearSessionCookie(cookieStore);

  return NextResponse.json({ success: true });
}
