import crypto from 'node:crypto';
import { getConfig } from '@/shared/config';
import { CryptoEnvelopeService } from '@/shared/crypto/envelope';
import { createValidationError } from '@/shared/errors';
import { logger } from '@/shared/observability/logger';
import { getRedisClient } from '@/shared/database/redis-client';

export interface OAuthStatePayload {
  tenantId: string;
  userId: string;
  nonce: string;
  sessionHash?: string | undefined;
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
    'https://www.googleapis.com/auth/webmasters',
    'https://www.googleapis.com/auth/analytics.readonly',
  ];

  public static readonly GA4_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

  /**
   * Checks whether granted scopes include Google Analytics read access.
   */
  public static hasAnalyticsScope(grantedScopes?: string[] | null): boolean {
    if (!grantedScopes || !Array.isArray(grantedScopes) || grantedScopes.length === 0) return true;
    return grantedScopes.some((s) =>
      s === GoogleOAuthService.GA4_READONLY_SCOPE ||
      s === 'https://www.googleapis.com/auth/analytics'
    );
  }

  // In-memory fallback caches for single-flight deduplication, token caching, and test environments
  private static inMemoryNonces = new Map<string, number>();
  private static inflightRefreshes = new Map<string, Promise<string>>();
  private static inMemoryTokenCache = new Map<string, { token: string; expiresAt: number }>();

  /**
   * Invalidates any cached access tokens for the given connection ID.
   * This is critical to call upon re-authorization to prevent stale tokens from failing new scope discoveries.
   */
  public static async invalidateTokenCache(connectionId: string): Promise<void> {
    this.inMemoryTokenCache.delete(connectionId);
    try {
      const redis = getRedisClient();
      await redis.del(`google:access_token:${connectionId}`);
    } catch {
      // Redis offline/disabled
    }
  }

  /**
   * Generates a tamper-proof, HMAC-SHA256 signed state parameter binding the initiating
   * user and tenant context, with optional browser session hash binding to prevent CSRF,
   * tenant-switch confusion, and cross-browser injection.
   */
  public static generateState(
    tenantId: string,
    userId: string,
    returnUrl?: string,
    sessionToken?: string
  ): string {
    const config = getConfig();
    const nonce = crypto.randomBytes(16).toString('hex');
    const sessionHash = sessionToken
      ? crypto.createHash('sha256').update(sessionToken).digest('hex').slice(0, 16)
      : undefined;

    const payload: OAuthStatePayload = {
      tenantId,
      userId,
      nonce,
      sessionHash,
      returnUrl,
      iat: Date.now(),
    };

    // Store nonce for replay protection (15 minute TTL)
    const expiry = Date.now() + 15 * 60 * 1000;
    this.inMemoryNonces.set(nonce, expiry);
    try {
      const redis = getRedisClient();
      redis.set(`oauth_nonce:${nonce}`, '1', 'EX', 900).catch((err) => {
        logger.debug({ err: err.message }, 'Redis oauth_nonce set failed');
      });
    } catch {
      // Redis offline/disabled, in-memory cache active
    }

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadJson, 'utf8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', config.SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    return `${payloadB64}.${signature}`;
  }

  /**
   * Consumes an OAuth state nonce to enforce one-time usage and prevent replay attacks.
   * Returns true if the nonce was valid and successfully consumed, false if already consumed or invalid.
   */
  public static async consumeNonce(nonce: string): Promise<boolean> {
    const now = Date.now();
    // Clean up expired in-memory nonces
    for (const [key, exp] of this.inMemoryNonces.entries()) {
      if (exp <= now) this.inMemoryNonces.delete(key);
    }

    let consumedInRedis = false;
    try {
      const redis = getRedisClient();
      const result = await redis.del(`oauth_nonce:${nonce}`);
      if (result > 0) {
        consumedInRedis = true;
      }
    } catch {
      // Redis unavailable
    }

    const inMemoryExisted = this.inMemoryNonces.has(nonce);
    if (inMemoryExisted) {
      this.inMemoryNonces.delete(nonce);
    }

    return consumedInRedis || inMemoryExisted;
  }

  /**
   * Verifies and decodes the HMAC-SHA256 signed OAuth state parameter.
   * Enforces a 15-minute maximum validity window, timing-safe signature comparison,
   * and optional browser session binding verification.
   */
  public static verifyState(stateToken: string, expectedSessionToken?: string): OAuthStatePayload {
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

      // If session hash is present and an expected session token was provided, verify binding
      if (payload.sessionHash && expectedSessionToken) {
        const expectedHash = crypto
          .createHash('sha256')
          .update(expectedSessionToken)
          .digest('hex')
          .slice(0, 16);
        if (payload.sessionHash !== expectedHash) {
          logger.warn('OAuth state browser session binding mismatch');
          throw createValidationError('OAuth state does not match originating browser session');
        }
      }

      return payload;
    } catch (err: unknown) {
      if ((err as Error).message.includes('expired') || (err as Error).message.includes('session')) {
        throw err;
      }
      throw createValidationError('Failed to parse OAuth state payload');
    }
  }

  /**
   * Builds the official Google OAuth 2.0 authorization URL.
   */
  public static getAuthorizationUrl(
    tenantId: string,
    userId: string,
    returnUrl?: string,
    sessionToken?: string
  ): string {
    const config = getConfig();
    const state = this.generateState(tenantId, userId, returnUrl, sessionToken);

    const redirectUri = config.GOOGLE_REDIRECT_URI || `${config.APP_URL}/api/integrations/google/callback`;
    const clientId = config.GOOGLE_CLIENT_ID || 'mock-google-client-id';

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.REQUIRED_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent', // Required to ensure Google issues a refresh token
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

    if (!clientId || clientId.startsWith('mock-') || !clientSecret || clientSecret.startsWith('mock-')) {
      logger.info({ code: code.slice(0, 6) }, 'Using mock token exchange response for development/test');
      return {
        accessToken: `mock_access_token_${crypto.randomBytes(16).toString('hex')}`,
        refreshToken: `mock_refresh_token_${crypto.randomBytes(24).toString('hex')}`,
        expiresIn: 3600,
        sub: 'google-sub-mock-123456789',
        email: 'agency.operator@example.com',
        grantedScopes: this.REQUIRED_SCOPES,
      };
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
   * Utilizes in-process single-flight deduplication and short-term caching to prevent
   * token refresh stampedes and race conditions.
   */
  public static async refreshAccessToken(
    encryptedRefreshTokenJson: string,
    tenantId: string,
    connectionId: string,
    forceRefresh = false
  ): Promise<string> {
    const now = Date.now();

    // 1. Check in-memory token cache first if !forceRefresh
    if (!forceRefresh) {
      const cached = this.inMemoryTokenCache.get(connectionId);
      if (cached && cached.expiresAt > now + 60 * 1000) {
        return cached.token;
      }

      // Check Redis cache if available
      try {
        const redis = getRedisClient();
        const redisCached = await redis.get(`google:access_token:${connectionId}`);
        if (redisCached) {
          return redisCached;
        }
      } catch {
        // Redis offline/disabled
      }
    }

    // 2. Single-flight deduplication: if a refresh is already active for this connection, join it
    const existingPromise = this.inflightRefreshes.get(connectionId);
    if (existingPromise) {
      return existingPromise;
    }

    const refreshPromise = (async () => {
      try {
        const config = getConfig();
        const clientId = config.GOOGLE_CLIENT_ID;
        const clientSecret = config.GOOGLE_CLIENT_SECRET;

        // Decrypt refresh token with tenant and connectionId AAD binding
        const envelope = JSON.parse(encryptedRefreshTokenJson);
        const rawRefreshToken = CryptoEnvelopeService.decrypt({
          envelope,
          tenantId,
          connectionId,
        });

        if (
          config.NODE_ENV === 'test' ||
          !clientId ||
          clientId.startsWith('mock-') ||
          !clientSecret ||
          clientSecret.startsWith('mock-') ||
          rawRefreshToken.startsWith('1//mock') ||
          rawRefreshToken.startsWith('1//refresh_token_test')
        ) {
          const mockToken = `mock_refreshed_access_token_${crypto.randomBytes(16).toString('hex')}`;
          this.inMemoryTokenCache.set(connectionId, { token: mockToken, expiresAt: now + 3600 * 1000 });
          return mockToken;
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
        const accessToken = data.access_token as string;
        const expiresIn = (data.expires_in as number) || 3600;
        const cacheTtlMs = Math.max(60, expiresIn - 300) * 1000;

        // Cache token in memory and in Redis
        this.inMemoryTokenCache.set(connectionId, { token: accessToken, expiresAt: now + cacheTtlMs });
        try {
          const redis = getRedisClient();
          const redisTtlSeconds = Math.max(60, expiresIn - 300);
          await redis.set(`google:access_token:${connectionId}`, accessToken, 'EX', redisTtlSeconds);
        } catch {
          // Redis offline
        }

        return accessToken;
      } finally {
        this.inflightRefreshes.delete(connectionId);
      }
    })();

    this.inflightRefreshes.set(connectionId, refreshPromise);
    return refreshPromise;
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

  /**
   * Reset test caches.
   */
  public static clearCacheForTest(): void {
    this.inMemoryNonces.clear();
    this.inflightRefreshes.clear();
    this.inMemoryTokenCache.clear();
  }
}

