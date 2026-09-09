import crypto from 'node:crypto';
import { getConfig } from '../config';

export interface EncryptionEnvelope {
  v: number;
  alg: 'AES-256-GCM';
  kid: string;
  iv: string;
  ct: string;
  tag: string;
  aad: string;
  createdAt: string;
}

export interface EncryptOptions {
  plaintext: string;
  tenantId: string;
  connectionId: string;
  masterKeyHex?: string;
  keyId?: string;
}

export interface DecryptOptions {
  envelope: EncryptionEnvelope;
  tenantId: string;
  connectionId: string;
  masterKeyHex?: string;
}

export class CryptoEnvelopeService {
  /**
   * Encrypts sensitive provider credentials using AES-256-GCM with fresh 96-bit IV
   * and cryptographically bounds the tenantId and connectionId in AAD.
   */
  public static encrypt(options: EncryptOptions): EncryptionEnvelope {
    const config = getConfig();
    const keyHex = options.masterKeyHex ?? config.ENCRYPTION_MASTER_KEY;
    const keyId = options.keyId ?? config.ENCRYPTION_KEY_ID;

    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
      throw new Error('CRYPTO_ERROR: Master encryption key must be exactly 32 bytes (256 bits)');
    }

    // Fresh 96-bit CSPRNG IV per encryption operation - zero nonce reuse
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // AAD binds tenant and connection identity to prevent cross-tenant ciphertext transplanting
    const aad = Buffer.from(
      JSON.stringify({ tenantId: options.tenantId, connectionId: options.connectionId }),
      'utf8'
    );
    cipher.setAAD(aad);

    const ciphertext = Buffer.concat([
      cipher.update(options.plaintext, 'utf8'),
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

  /**
   * Decrypts an envelope, verifying the authenticity tag and matching AAD tenant context.
   */
  public static decrypt(options: DecryptOptions): string {
    const config = getConfig();
    const keyHex = options.masterKeyHex ?? config.ENCRYPTION_MASTER_KEY;
    const key = Buffer.from(keyHex, 'hex');

    const { envelope, tenantId, connectionId } = options;

    if (envelope.alg !== 'AES-256-GCM' || envelope.v !== 1) {
      throw new Error(`CRYPTO_ERROR: Unsupported envelope version or algorithm: ${envelope.alg} v${envelope.v}`);
    }

    const iv = Buffer.from(envelope.iv, 'base64');
    const ciphertext = Buffer.from(envelope.ct, 'base64');
    const authTag = Buffer.from(envelope.tag, 'base64');

    // Verify AAD matches the expected tenant and connection context
    const expectedAad = Buffer.from(
      JSON.stringify({ tenantId, connectionId }),
      'utf8'
    );

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(expectedAad);
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch (err) {
      throw new Error('CRYPTO_AUTHENTICATION_FAILED: Ciphertext tampered or tenant context mismatch', {
        cause: err,
      });
    }
  }
}
