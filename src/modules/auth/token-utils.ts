import crypto from 'node:crypto';

/**
 * Token Utilities for Enterprise Stateful Opaque Sessions and One-Time Auth Tokens.
 *
 * Requirements:
 * - 256-bit entropy generated using Node.js CSPRNG (crypto.randomBytes).
 * - Opaque tokens are URL-safe base64url encoded strings.
 * - Only SHA-256 cryptographic hashes are persisted in the database.
 * - Constant-time comparison for timing attack defense.
 */

export function generateOpaqueToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}

export function hashToken(token: string): string {
  if (!token || typeof token !== 'string') {
    throw new TypeError('Token must be a non-empty string');
  }
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
