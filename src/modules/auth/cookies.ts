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
  process.env.NODE_ENV === 'production' && !process.env.VERCEL
    ? '__Host-localbi_session'
    : 'localbi_session';


export const SESSION_COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days (matching absolute session lifetime)
};

export type CookieWriter = Awaited<ReturnType<typeof import('next/headers').cookies>>;

export class SessionCookieManager {
  /**
   * Sets the opaque session cookie on the response.
   */
  public static setSessionCookie(cookieStore: CookieWriter, rawToken: string): void {
    cookieStore.set(SESSION_COOKIE_NAME, rawToken, SESSION_COOKIE_OPTIONS);
    // Also set fallback non-prefixed cookie for proxies or browsers with strict host prefix policies
    if (SESSION_COOKIE_NAME !== 'localbi_session') {
      cookieStore.set('localbi_session', rawToken, SESSION_COOKIE_OPTIONS);
    }
  }

  /**
   * Clears the session cookie on sign-out or revocation.
   */
  public static clearSessionCookie(cookieStore: CookieWriter): void {
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    });
    if (SESSION_COOKIE_NAME !== 'localbi_session') {
      cookieStore.set('localbi_session', '', {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: 0,
      });
    }
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

    // Check fallback standard name
    const fallback = cookieStore.get('localbi_session');
    if (fallback?.value) {
      return fallback.value;
    }

    // Check host-prefixed fallback
    const hostFallback = cookieStore.get('__Host-localbi_session');
    if (hostFallback?.value) {
      return hostFallback.value;
    }

    return null;
  }
}
