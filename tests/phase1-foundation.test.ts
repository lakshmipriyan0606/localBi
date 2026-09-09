import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  Action,
  AuthorizationService,
  AuthorizedContext,
  Role,
  ScopeMode,
} from '../src/shared/authorization/policy';
import { CryptoEnvelopeService } from '../src/shared/crypto/envelope';
import {
  ErrorCode,
  createAuthenticationRequiredError,
  createBrandAccessDeniedError,
  createLocationAccessDeniedError,
  createPolicyGateLockedError,
  createTenantAccessDeniedError,
  createValidationError,
} from '../src/shared/errors';
import { TenantContextService } from '../src/shared/database/tenant-context';

describe('Phase 1 Foundation: Centralized Authorization Policy', () => {
  const tenantId = '01JB0000000000000000000001';
  const brand1 = '01JB00000000000000000000B1';
  const brand2 = '01JB00000000000000000000B2';
  const loc1 = '01JB00000000000000000000L1';
  const loc2 = '01JB00000000000000000000L2';

  it('Client Owner should have tenant-wide capabilities across all actions', () => {
    const ownerContext: AuthorizedContext = {
      userId: 'user-owner',
      tenantId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    expect(AuthorizationService.can(ownerContext, Action.TENANT_UPDATE)).toBe(true);
    expect(AuthorizationService.can(ownerContext, Action.BRAND_CREATE)).toBe(true);
    expect(AuthorizationService.can(ownerContext, Action.LOCATION_CLOSE)).toBe(true);
    expect(AuthorizationService.can(ownerContext, Action.USER_INVITE)).toBe(true);
    expect(AuthorizationService.can(ownerContext, Action.INTEGRATION_CONNECT)).toBe(true);
    expect(AuthorizationService.can(ownerContext, Action.DASHBOARD_EXPORT)).toBe(true);

    // ScopeMode.ALL allows access to any brand and location within the tenant
    expect(AuthorizationService.canAccessBrand(ownerContext, brand1)).toBe(true);
    expect(AuthorizationService.canAccessBrand(ownerContext, brand2)).toBe(true);
    expect(AuthorizationService.canAccessLocation(ownerContext, loc1)).toBe(true);
  });

  it('Brand Manager with RESTRICTED scope should only access granted brands and their locations', () => {
    const brandManagerContext: AuthorizedContext = {
      userId: 'user-bm',
      tenantId,
      role: Role.BRAND_MANAGER,
      scopeMode: ScopeMode.RESTRICTED,
      grantedBrandIds: new Set([brand1]),
      grantedLocationIds: new Set(),
    };

    expect(AuthorizationService.can(brandManagerContext, Action.BRAND_UPDATE)).toBe(true);
    expect(AuthorizationService.can(brandManagerContext, Action.USER_INVITE)).toBe(false); // Cannot invite users
    expect(AuthorizationService.can(brandManagerContext, Action.TENANT_DELETE)).toBe(false);

    // Can access granted brand1, but NOT brand2
    expect(AuthorizationService.canAccessBrand(brandManagerContext, brand1)).toBe(true);
    expect(AuthorizationService.canAccessBrand(brandManagerContext, brand2)).toBe(false);
    expect(() => AuthorizationService.assertBrandAccess(brandManagerContext, brand2)).toThrow();

    // Can access location belonging to brand1, but NOT brand2
    expect(AuthorizationService.canAccessLocation(brandManagerContext, loc1, brand1)).toBe(true);
    expect(AuthorizationService.canAccessLocation(brandManagerContext, loc2, brand2)).toBe(false);
  });

  it('Location Manager with RESTRICTED scope should only access explicitly assigned locations', () => {
    const locationMgrContext: AuthorizedContext = {
      userId: 'user-lm',
      tenantId,
      role: Role.LOCATION_MANAGER,
      scopeMode: ScopeMode.RESTRICTED,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set([loc1]),
    };

    expect(AuthorizationService.can(locationMgrContext, Action.LOCATION_UPDATE)).toBe(true);
    expect(AuthorizationService.can(locationMgrContext, Action.BRAND_CREATE)).toBe(false);

    expect(AuthorizationService.canAccessLocation(locationMgrContext, loc1)).toBe(true);
    expect(AuthorizationService.canAccessLocation(locationMgrContext, loc2)).toBe(false);
    expect(() => AuthorizationService.assertLocationAccess(locationMgrContext, loc2)).toThrow();
  });

  it('Viewer and Analyst should have read-only access and cannot perform mutations', () => {
    const viewerContext: AuthorizedContext = {
      userId: 'user-viewer',
      tenantId,
      role: Role.VIEWER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    expect(AuthorizationService.can(viewerContext, Action.DASHBOARD_VIEW)).toBe(true);
    expect(AuthorizationService.can(viewerContext, Action.DASHBOARD_EXPORT)).toBe(false);
    expect(AuthorizationService.can(viewerContext, Action.BRAND_CREATE)).toBe(false);

    const analystContext: AuthorizedContext = {
      userId: 'user-analyst',
      tenantId,
      role: Role.ANALYST,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    expect(AuthorizationService.can(analystContext, Action.DASHBOARD_VIEW)).toBe(true);
    expect(AuthorizationService.can(analystContext, Action.DASHBOARD_EXPORT)).toBe(true); // Analyst can export
    expect(AuthorizationService.can(analystContext, Action.USER_INVITE)).toBe(false);
  });

  it('Platform Support Admin should have audited read access only', () => {
    const supportAdminContext: AuthorizedContext = {
      userId: 'staff-123',
      tenantId,
      role: Role.PLATFORM_SUPPORT_ADMIN,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
      isPlatformStaff: true,
    };

    expect(AuthorizationService.can(supportAdminContext, Action.DASHBOARD_VIEW)).toBe(true);
    expect(AuthorizationService.can(supportAdminContext, Action.TENANT_VIEW)).toBe(true);
    expect(AuthorizationService.can(supportAdminContext, Action.TENANT_UPDATE)).toBe(false); // Cannot alter tenant
    expect(AuthorizationService.can(supportAdminContext, Action.USER_REMOVE)).toBe(false);
  });
});

describe('Phase 1 Foundation: Standardized Error Architecture', () => {
  it('should serialize operational errors cleanly without leaking internal stack traces', () => {
    const error = createTenantAccessDeniedError('01JB0000000000000000000001', 'req-abc-123');

    expect(error.statusCode).toBe(403);
    expect(error.code).toBe(ErrorCode.TENANT_ACCESS_DENIED);
    expect(error.requestId).toBe('req-abc-123');

    const clientResponse = error.toClientResponse() as Record<string, unknown>;
    expect(clientResponse['error']).toBeDefined();
    expect(clientResponse['stack']).toBeUndefined();
  });

  it('should format all standardized domain error types correctly', () => {
    expect(createAuthenticationRequiredError().statusCode).toBe(401);
    expect(createBrandAccessDeniedError('brand-1').statusCode).toBe(403);
    expect(createLocationAccessDeniedError('loc-1').statusCode).toBe(403);
    expect(createValidationError('Invalid input').statusCode).toBe(400);
    expect(createPolicyGateLockedError('GBP sync disabled').statusCode).toBe(403);
  });
});

describe('Phase 1 Foundation: AES-256-GCM Cryptographic Service', () => {
  const masterKey = crypto.randomBytes(32).toString('hex');
  const tenantId = '01JB0000000000000000000001';
  const connectionId = '01JB00000000000000000000C1';
  const secretRefreshToken = '1//04abcdef_Secure_Google_Refresh_Token';

  it('should encrypt and decrypt tokens with exact AAD context match', () => {
    const envelope = CryptoEnvelopeService.encrypt({
      plaintext: secretRefreshToken,
      tenantId,
      connectionId,
      masterKeyHex: masterKey,
    });

    const decrypted = CryptoEnvelopeService.decrypt({
      envelope,
      tenantId,
      connectionId,
      masterKeyHex: masterKey,
    });

    expect(decrypted).toBe(secretRefreshToken);
  });

  it('should fail decryption if tenantId is mismatched (prevent cross-tenant ciphertext transplant)', () => {
    const envelope = CryptoEnvelopeService.encrypt({
      plaintext: secretRefreshToken,
      tenantId,
      connectionId,
      masterKeyHex: masterKey,
    });

    expect(() => {
      CryptoEnvelopeService.decrypt({
        envelope,
        tenantId: '01JB0000000000000000000002', // Mismatched tenant
        connectionId,
        masterKeyHex: masterKey,
      });
    }).toThrow(/CRYPTO_AUTHENTICATION_FAILED/);
  });

  it('should fail decryption if connectionId is mismatched', () => {
    const envelope = CryptoEnvelopeService.encrypt({
      plaintext: secretRefreshToken,
      tenantId,
      connectionId,
      masterKeyHex: masterKey,
    });

    expect(() => {
      CryptoEnvelopeService.decrypt({
        envelope,
        tenantId,
        connectionId: '01JB00000000000000000000C2', // Wrong connection ID
        masterKeyHex: masterKey,
      });
    }).toThrow(/CRYPTO_AUTHENTICATION_FAILED/);
  });

  it('should fail decryption with wrong key', () => {
    const envelope = CryptoEnvelopeService.encrypt({
      plaintext: secretRefreshToken,
      tenantId,
      connectionId,
      masterKeyHex: masterKey,
    });

    const wrongKey = crypto.randomBytes(32).toString('hex');
    expect(() => {
      CryptoEnvelopeService.decrypt({
        envelope,
        tenantId,
        connectionId,
        masterKeyHex: wrongKey,
      });
    }).toThrow(/CRYPTO_AUTHENTICATION_FAILED/);
  });

  it('should fail decryption if ciphertext is modified by even 1 bit', () => {
    const envelope = CryptoEnvelopeService.encrypt({
      plaintext: secretRefreshToken,
      tenantId,
      connectionId,
      masterKeyHex: masterKey,
    });

    const ctBuf = Buffer.from(envelope.ct, 'base64');
    ctBuf[0] = (ctBuf[0] ?? 0) ^ 0x01; // flip 1 bit
    envelope.ct = ctBuf.toString('base64');

    expect(() => {
      CryptoEnvelopeService.decrypt({
        envelope,
        tenantId,
        connectionId,
        masterKeyHex: masterKey,
      });
    }).toThrow(/CRYPTO_AUTHENTICATION_FAILED/);
  });

  it('should fail decryption if authentication tag is modified', () => {
    const envelope = CryptoEnvelopeService.encrypt({
      plaintext: secretRefreshToken,
      tenantId,
      connectionId,
      masterKeyHex: masterKey,
    });

    const tagBuf = Buffer.from(envelope.tag, 'base64');
    tagBuf[0] = (tagBuf[0] ?? 0) ^ 0x01; // flip 1 bit
    envelope.tag = tagBuf.toString('base64');

    expect(() => {
      CryptoEnvelopeService.decrypt({
        envelope,
        tenantId,
        connectionId,
        masterKeyHex: masterKey,
      });
    }).toThrow(/CRYPTO_AUTHENTICATION_FAILED/);
  });

  it('should fail decryption on unsupported envelope version', () => {
    const envelope = CryptoEnvelopeService.encrypt({
      plaintext: secretRefreshToken,
      tenantId,
      connectionId,
      masterKeyHex: masterKey,
    });

    envelope.v = 99; // Unsupported future version

    expect(() => {
      CryptoEnvelopeService.decrypt({
        envelope,
        tenantId,
        connectionId,
        masterKeyHex: masterKey,
      });
    }).toThrow(/Unsupported envelope version/);
  });

  it('should produce different ciphertext on multiple encryptions of identical plaintext (fresh IV)', () => {
    const env1 = CryptoEnvelopeService.encrypt({
      plaintext: secretRefreshToken,
      tenantId,
      connectionId,
      masterKeyHex: masterKey,
    });
    const env2 = CryptoEnvelopeService.encrypt({
      plaintext: secretRefreshToken,
      tenantId,
      connectionId,
      masterKeyHex: masterKey,
    });

    expect(env1.iv).not.toBe(env2.iv);
    expect(env1.ct).not.toBe(env2.ct);
  });
});

describe('Phase 1 Foundation: Tenant Context Invariants', () => {
  it('should reject invalid or empty tenantId before entering transaction', async () => {
    const mockPrisma = {} as never;

    await expect(
      TenantContextService.withTenantContext(mockPrisma, '', async () => {})
    ).rejects.toThrow(/SECURITY_VIOLATION/);

    await expect(
      TenantContextService.withTenantContext(mockPrisma, '   ', async () => {})
    ).rejects.toThrow(/SECURITY_VIOLATION/);
  });
});

describe('Phase 1 Foundation: Structured Logger Secret Redaction', () => {
  it('should automatically redact sensitive tokens, passwords, and secrets', async () => {
    // Import pino and logger factory
    const { createLogger } = await import('../src/shared/observability/logger');
    const chunks: string[] = [];

    // Create custom stream to capture output
    const stream = {
      write: (msg: string) => {
        chunks.push(msg);
        return true;
      },
    };

    const testLogger = createLogger({}, {
      level: 'info',
      destination: stream,
    });

    testLogger.info({
      password: 'RawUserPassword!123',
      refresh_token: 'mock_refresh_token_value_for_redaction_test',
      authorization: 'Bearer mock_bearer_token_value',
      nested: {
        access_token: 'mock_access_token_value_for_redaction_test',
      },
      safeMetadata: 'PublicTenantInfo',
    }, 'Test login event');

    const output = chunks.join('');
    // The raw secrets must NEVER appear in the log output
    expect(output).not.toContain('RawUserPassword!123');
    expect(output).not.toContain('mock_refresh_token_value_for_redaction_test');
    expect(output).not.toContain('mock_bearer_token_value');
    expect(output).not.toContain('mock_access_token_value_for_redaction_test');

    // Safe metadata must be preserved
    expect(output).toContain('PublicTenantInfo');
  });
});
