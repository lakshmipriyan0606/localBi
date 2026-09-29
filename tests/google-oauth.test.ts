import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { GoogleOAuthService } from '../src/modules/integrations/google/google-oauth-service';
import { CryptoEnvelopeService } from '../src/shared/crypto/envelope';
import { getConfig } from '../src/shared/config';

describe('Google OAuth 2.0 State Security & Token Management', () => {
  const tenantId = '01JB000000000000000000000A';
  const userId = 'user_01jb0000000000000000000001';

  it('generates a valid, signed state token containing tenant and user context', () => {
    const returnUrl = `/t/abc-dental/integrations`;
    const stateToken = GoogleOAuthService.generateState(tenantId, userId, returnUrl);

    expect(stateToken).toContain('.');
    const [payloadB64, sig] = stateToken.split('.');
    expect(payloadB64).toBeDefined();
    expect(sig).toBeDefined();

    const decoded = GoogleOAuthService.verifyState(stateToken);
    expect(decoded.tenantId).toBe(tenantId);
    expect(decoded.userId).toBe(userId);
    expect(decoded.returnUrl).toBe(returnUrl);
    expect(decoded.nonce).toHaveLength(32); // 16 bytes hex
    expect(Date.now() - decoded.iat).toBeLessThan(5000);
  });

  it('rejects state token if signature has been tampered with', () => {
    const stateToken = GoogleOAuthService.generateState(tenantId, userId);
    const [payloadB64, sig] = stateToken.split('.');

    // Tamper with signature
    const tamperedSig = (sig || '').slice(0, -2) + 'XX';
    const tamperedToken = `${payloadB64}.${tamperedSig}`;

    expect(() => GoogleOAuthService.verifyState(tamperedToken)).toThrow(/tampering detected|signature invalid/i);
  });

  it('rejects state token if payload has been modified', () => {
    const stateToken = GoogleOAuthService.generateState(tenantId, userId);
    const [, sig] = stateToken.split('.');

    // Modify payload (e.g. switch tenantId)
    const forgedPayload = {
      tenantId: '01JB000000000000000000000B', // Different tenant!
      userId,
      nonce: '1234567890abcdef',
      iat: Date.now(),
    };
    const forgedB64 = Buffer.from(JSON.stringify(forgedPayload)).toString('base64url');
    const forgedToken = `${forgedB64}.${sig}`;

    expect(() => GoogleOAuthService.verifyState(forgedToken)).toThrow(/tampering detected|signature invalid/i);
  });

  it('rejects expired state tokens older than 15 minutes', () => {
    const config = getConfig();
    const expiredPayload = {
      tenantId,
      userId,
      nonce: 'abcdef1234567890',
      iat: Date.now() - (16 * 60 * 1000), // 16 minutes ago
    };
    const payloadB64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const sig = crypto
      .createHmac('sha256', config.SESSION_SECRET)
      .update(payloadB64)
      .digest('base64url');

    const expiredToken = `${payloadB64}.${sig}`;
    expect(() => GoogleOAuthService.verifyState(expiredToken)).toThrow(/expired/i);
  });

  it('builds official Google authorization URL with offline access and prompt=consent', () => {
    const authUrl = GoogleOAuthService.getAuthorizationUrl(tenantId, userId, '/t/abc-dental/integrations');
    const url = new URL(authUrl);

    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.pathname).toBe('/o/oauth2/v2/auth');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('response_type')).toBe('code');

    const scopes = url.searchParams.get('scope') || '';
    expect(scopes).toContain('business.manage');
    expect(scopes).toContain('webmasters.readonly');
  });

  it('encrypts and decrypts Google refresh token with tenant and connection AAD binding', () => {
    const connectionId = 'conn_01jb000000000000000000001';
    const secretRefreshToken = '1//04mock_google_oauth_refresh_token_secret_xyz';

    const envelope = CryptoEnvelopeService.encrypt({
      plaintext: secretRefreshToken,
      tenantId,
      connectionId,
    });

    expect(envelope.v).toBe(1);
    expect(envelope.alg).toBe('AES-256-GCM');
    expect(envelope.ct).not.toBe(secretRefreshToken);

    const decrypted = CryptoEnvelopeService.decrypt({
      envelope,
      tenantId,
      connectionId,
    });
    expect(decrypted).toBe(secretRefreshToken);

    // Cross-tenant transplant must fail
    expect(() =>
      CryptoEnvelopeService.decrypt({
        envelope,
        tenantId: 'other_tenant_id',
        connectionId,
      })
    ).toThrow();
  });

  it('enforces one-time nonce consumption for replay protection', async () => {
    const stateToken = GoogleOAuthService.generateState(tenantId, userId);
    const decoded = GoogleOAuthService.verifyState(stateToken);

    // First consumption succeeds
    const firstConsume = await GoogleOAuthService.consumeNonce(decoded.nonce);
    expect(firstConsume).toBe(true);

    // Replay consumption fails
    const secondConsume = await GoogleOAuthService.consumeNonce(decoded.nonce);
    expect(secondConsume).toBe(false);
  });

  it('binds browser session hash and detects session mismatch', () => {
    const sessionTokenA = 'session_token_alpha_1234567890';
    const sessionTokenB = 'session_token_bravo_0987654321';

    const stateToken = GoogleOAuthService.generateState(
      tenantId,
      userId,
      '/client/abc/integrations',
      sessionTokenA
    );

    // Verifying with correct session token succeeds
    const decoded = GoogleOAuthService.verifyState(stateToken, sessionTokenA);
    expect(decoded.sessionHash).toBeDefined();

    // Verifying with different session token throws session mismatch
    expect(() =>
      GoogleOAuthService.verifyState(stateToken, sessionTokenB)
    ).toThrow(/session/i);
  });

  it('deduplicates concurrent access token refreshes using single-flight mutex', async () => {
    GoogleOAuthService.clearCacheForTest();

    const connectionId = 'conn_singleflight_test';
    const envelope = CryptoEnvelopeService.encrypt({
      plaintext: '1//refresh_token_test',
      tenantId,
      connectionId,
    });
    const envelopeJson = JSON.stringify(envelope);

    // Fire 5 concurrent refresh requests
    const promises = Array.from({ length: 5 }).map(() =>
      GoogleOAuthService.refreshAccessToken(envelopeJson, tenantId, connectionId)
    );

    const results = await Promise.all(promises);

    // All results must be identical
    expect(results).toHaveLength(5);
    const firstToken = results[0];
    for (const token of results) {
      expect(token).toBe(firstToken);
    }

    // Subsequent call without forceRefresh returns cached token
    const cachedToken = await GoogleOAuthService.refreshAccessToken(envelopeJson, tenantId, connectionId);
    expect(cachedToken).toBe(firstToken);
  });
});

