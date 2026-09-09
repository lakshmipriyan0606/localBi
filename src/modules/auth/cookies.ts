import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

/**
 * Cookie Configuration and Management for Stateful Opaque Sessions.
 *
 * Security Controls:
 * - HttpOnly: true (prevents client-side JS/XSS exfiltration)
 * - Secure: true in production (requires TLS)
 * - SameSite: 'lax' (prevents CSRF on state-changing cross-site requests while permitting top-level navigation)
 * - Path: '/'
 * - Cookie name: '__Host-localbi_session' in production (protects domain prefix and enforces HTTPS)
 *   or 'localbi_session' in local development.
 * - Value: Opaque CSPRNG token (contains zero identity or permission claims).
 */

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-localbi_session' : 'localbi_session';

export const SESSION_COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days (matching absolute session lifetime)
};

export interface CookieWriter {
  set(name: string, value: string, options?: Partial<ResponseCookie>): void;
  delete(name: string): void;
  get(name: string): { name: string; value: string } | undefined;
}

export class SessionCookieManager {
  /**
   * Sets the opaque session cookie on the response.
   */
  public static setSessionCookie(cookieStore: CookieWriter, rawToken: string): void {
    cookieStore.set(SESSION_COOKIE_NAME, rawToken, SESSION_COOKIE_OPTIONS);
  }

  /**
   * Clears the session cookie on sign-out or revocation.
   */
  public static clearSessionCookie(cookieStore: CookieWriter): void {
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    });
  }

  /**
   * Reads raw session token from the cookie store.
   */
  public static getSessionToken(cookieStore: {
    get(name: string): { name: string; value: string } | undefined;
  }): string | null {
    // Check primary cookie name first
    const primary = cookieStore.get(SESSION_COOKIE_NAME);
    if (primary?.value) {
      return primary.value;
    }

    // In dev or transition environments, fallback to plain name if __Host- was checked
    if (SESSION_COOKIE_NAME.startsWith('__Host-')) {
      const fallback = cookieStore.get('localbi_session');
      if (fallback?.value) {
        return fallback.value;
      }
    }

    return null;
  }
}
