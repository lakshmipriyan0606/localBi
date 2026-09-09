import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';

interface EncryptionEnvelope {
  v: number;
  alg: 'AES-256-GCM';
  kid: string;
  iv: string;
  ct: string;
  tag: string;
  aad: string;
  createdAt: string;
}

interface EncryptParams {
  plaintext: string;
  key: Buffer;
  keyId: string;
  tenantId: string;
  connectionId: string;
}

interface DecryptParams {
  envelope: EncryptionEnvelope;
  key: Buffer;
  tenantId: string;
  connectionId: string;
}

function encryptToken({
  plaintext,
  key,
  keyId,
  tenantId,
  connectionId,
}: EncryptParams): EncryptionEnvelope {
  // Fresh 96-bit (12 bytes) CSPRNG IV per operation - zero nonce reuse
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // AAD binds tenantId and connectionId cryptographically to prevent cross-tenant ciphertext transplanting
  const aad = Buffer.from(JSON.stringify({ tenantId, connectionId }), 'utf8');
  cipher.setAAD(aad);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    v: 1,
    alg: 'AES-256-GCM',
    kid: keyId,
    iv: iv.toString('base64'),
    ct: ciphertext.toString('base64'),
    tag: authTag.toString('base64'),
    aad: aad.toString('base64'),
    createdAt: new Date().toISOString(),
  };
}

function decryptToken({
  envelope,
  key,
  tenantId,
  connectionId,
}: DecryptParams): string {
  if (envelope.alg !== 'AES-256-GCM' || envelope.v !== 1) {
    throw new Error('UNSUPPORTED_ENVELOPE_VERSION');
  }

  const iv = Buffer.from(envelope.iv, 'base64');
  const ciphertext = Buffer.from(envelope.ct, 'base64');
  const authTag = Buffer.from(envelope.tag, 'base64');

  // Verify AAD matches the expected tenant and connection context
  const expectedAad = Buffer.from(JSON.stringify({ tenantId, connectionId }), 'utf8');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(expectedAad);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

describe('Spike 2: Versioned AES-256-GCM Envelope & Tamper Detection', () => {
  const masterKey = crypto.randomBytes(32); // 256-bit key
  const keyId = 'key-2026-v1';
  const tenantA = '01JB000000000000000000000A';
  const tenantB = '01JB000000000000000000000B';
  const connectionId = '01JB000000000000000000000C';
  const secretRefreshToken = '1//04abcdef123456_Google_OAuth_Refresh_Token_Secret';

  it('should round-trip encrypt and decrypt successfully with valid context', () => {
    const envelope = encryptToken({
      plaintext: secretRefreshToken,
      key: masterKey,
      keyId,
      tenantId: tenantA,
      connectionId,
    });

    expect(envelope.v).toBe(1);
    expect(envelope.alg).toBe('AES-256-GCM');
    expect(envelope.kid).toBe(keyId);
    expect(envelope.ct).not.toBe(secretRefreshToken);

    const decrypted = decryptToken({
      envelope,
      key: masterKey,
      tenantId: tenantA,
      connectionId,
    });

    expect(decrypted).toBe(secretRefreshToken);
  });

  it('should generate a fresh IV for every encryption operation (zero nonce reuse)', () => {
    const envelope1 = encryptToken({
      plaintext: secretRefreshToken,
      key: masterKey,
      keyId,
      tenantId: tenantA,
      connectionId,
    });
    const envelope2 = encryptToken({
      plaintext: secretRefreshToken,
      key: masterKey,
      keyId,
      tenantId: tenantA,
      connectionId,
    });

    expect(envelope1.iv).not.toBe(envelope2.iv);
    expect(envelope1.ct).not.toBe(envelope2.ct);
  });

  it('should fail decryption if tenantId in context does not match AAD (cross-tenant transplant attack)', () => {
    const envelope = encryptToken({
      plaintext: secretRefreshToken,
      key: masterKey,
      keyId,
      tenantId: tenantA,
      connectionId,
    });

    // Attempt to decrypt Tenant A envelope under Tenant B context
    expect(() => {
      decryptToken({
        envelope,
        key: masterKey,
        tenantId: tenantB, // Wrong tenant
        connectionId,
      });
    }).toThrow();
  });

  it('should fail decryption if ciphertext is tampered with by even 1 bit', () => {
    const envelope = encryptToken({
      plaintext: secretRefreshToken,
      key: masterKey,
      keyId,
      tenantId: tenantA,
      connectionId,
    });

    const ctBuffer = Buffer.from(envelope.ct, 'base64');
    ctBuffer[0] = (ctBuffer[0] ?? 0) ^ 0x01; // Flip 1 bit
    envelope.ct = ctBuffer.toString('base64');

    expect(() => {
      decryptToken({
        envelope,
        key: masterKey,
        tenantId: tenantA,
        connectionId,
      });
    }).toThrow();
  });
});
