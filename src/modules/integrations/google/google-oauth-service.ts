import crypto from 'node:crypto';
import { getConfig } from '@/shared/config';
import { CryptoEnvelopeService } from '@/shared/crypto/envelope';
import { createValidationError } from '@/shared/errors';
import { logger } from '@/shared/observability/logger';

export interface OAuthStatePayload {
  tenantId: string;
  userId: string;
  nonce: string;
  returnUrl?: string | undefined;
  iat: number;
}

export interface GoogleTokenResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
  sub: string;
  email: string;
  grantedScopes: string[];
}

export class GoogleOAuthService {
  public static readonly REQUIRED_SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/webmasters.readonly',
  ];

  /**
   * Generates a tamper-proof, HMAC-SHA256 signed state parameter binding the initiating
   * user and tenant context to prevent CSRF and tenant-switch confusion.
   */
  public static generateState(tenantId: string, userId: string, returnUrl?: string): string {
    const config = getConfig();
    const payload: OAuthStatePayload = {
      tenantId,
      userId,
      nonce: crypto.randomBytes(16).toString('hex'),
      returnUrl,
      iat: Date.now(),
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadJson, 'utf8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', config.SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    return `${payloadB64}.${signature}`;
  }

  /**
   * Verifies and decodes the HMAC-SHA256 signed OAuth state parameter.
   * Enforces a 15-minute maximum validity window and timing-safe signature comparison.
   */
  public static verifyState(stateToken: string): OAuthStatePayload {
    const config = getConfig();
    const parts = stateToken.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw createValidationError('Invalid or malformed OAuth state token format');
    }

    const [payloadB64, providedSig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', config.SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    const providedBuf = Buffer.from(providedSig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');

    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      logger.warn({ stateToken: `${stateToken.slice(0, 8)}...` }, 'OAuth state signature verification failed');
      throw createValidationError('OAuth state tampering detected or signature invalid');
    }

    try {
      const payload: OAuthStatePayload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8')
      );

      // Enforce 15-minute maximum state lifetime
      const maxAgeMs = 15 * 60 * 1000;
      if (Date.now() - payload.iat > maxAgeMs) {
        throw createValidationError('OAuth state has expired. Please initiate connection again.');
      }

      return payload;
    } catch (err: unknown) {
      if ((err as Error).message.includes('expired')) {
        throw err;
      }
      throw createValidationError('Failed to parse OAuth state payload');
    }
  }

  /**
   * Builds the official Google OAuth 2.0 authorization URL.
   */
  public static getAuthorizationUrl(tenantId: string, userId: string, returnUrl?: string): string {
    const config = getConfig();
    const state = this.generateState(tenantId, userId, returnUrl);

    const redirectUri = config.GOOGLE_REDIRECT_URI || `${config.APP_URL}/api/integrations/google/callback`;
    const clientId = config.GOOGLE_CLIENT_ID || 'mock-google-client-id';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.REQUIRED_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'select_account consent', // Force account picker and ensure a refresh token is issued
      state,
      include_granted_scopes: 'true',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchanges an authorization code for tokens via Google OAuth token endpoint.
   */
  public static async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const config = getConfig();
    const redirectUri = config.GOOGLE_REDIRECT_URI || `${config.APP_URL}/api/integrations/google/callback`;
    const clientId = config.GOOGLE_CLIENT_ID;
    const clientSecret = config.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, errorText }, 'Google OAuth token exchange failed');
      throw new Error(`Google OAuth token exchange failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Decode ID token or query userinfo to resolve subject and email
    let sub = '';
    let email = '';

    if (data.id_token) {
      try {
        const payloadBase64 = data.id_token.split('.')[1];
        if (payloadBase64) {
          const parsed = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
          sub = parsed.sub;
          email = parsed.email;
        }
      } catch {
        // Fallback to userinfo below
      }
    }

    if (!sub || !email) {
      // Query userinfo endpoint
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (userinfoRes.ok) {
        const userinfo = await userinfoRes.json();
        sub = userinfo.sub;
        email = userinfo.email;
      }
    }

    const grantedScopes = data.scope ? data.scope.split(' ') : this.REQUIRED_SCOPES;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresIn: data.expires_in || 3600,
      sub: sub || 'unknown-sub',
      email: email || 'unknown-email@example.com',
      grantedScopes,
    };
  }

  /**
   * Refreshes an access token using a stored AES-256-GCM encrypted refresh token.
   */
  public static async refreshAccessToken(
    encryptedRefreshTokenJson: string,
    tenantId: string,
    connectionId: string
  ): Promise<string> {
    const config = getConfig();
    const clientId = config.GOOGLE_CLIENT_ID;
    const clientSecret = config.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured.');
    }

    // Decrypt refresh token
    let rawRefreshToken: string;
    try {
      const envelope = JSON.parse(encryptedRefreshTokenJson);
      rawRefreshToken = CryptoEnvelopeService.decrypt({
        envelope,
        tenantId,
        connectionId,
      });
    } catch (err) {
      throw err;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: rawRefreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, connectionId }, 'Google token refresh failed');
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Revokes a token at Google OAuth endpoint.
   */
  public static async revokeToken(token: string): Promise<boolean> {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
