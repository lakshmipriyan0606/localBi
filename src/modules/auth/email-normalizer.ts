import crypto from 'node:crypto';
import { createValidationError } from '../../shared/errors';

/**
 * Email Normalization & Privacy-Safe Key Hashing Service.
 *
 * Normalization Rules:
 * 1. Trim leading and trailing whitespace.
 * 2. Unicode normalization using NFKC form.
 * 3. Case-fold to lowercase (local and domain parts).
 * 4. Structural validation against standard email grammar.
 *
 * Privacy Invariants:
 * - Raw email addresses must NEVER be used as Redis keys or logged in audit traces.
 * - Rate limiting uses `hashEmailForRateLimit`, which applies HMAC-SHA256 with a system salt.
 */

const EMAIL_REGEX = /^[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~-]+@[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?)+$/u;

export function normalizeEmail(rawEmail: string): string {
  if (!rawEmail || typeof rawEmail !== 'string') {
    throw createValidationError('Email address must be a non-empty string');
  }

  const trimmed = rawEmail.trim();
  if (!trimmed) {
    throw createValidationError('Email address cannot be blank');
  }

  // Unicode NFKC normalization
  const normalized = trimmed.normalize('NFKC').toLowerCase();

  if (normalized.length > 254) {
    throw createValidationError('Email address exceeds maximum length of 254 characters');
  }

  if (!EMAIL_REGEX.test(normalized)) {
    throw createValidationError('Invalid email address format');
  }

  return normalized;
}

/**
 * Derives a privacy-preserving fixed-length hash for Redis rate-limit keys.
 * Raw emails are never exposed to in-memory key stores.
 */
export function hashEmailForRateLimit(email: string, salt = 'localbi-rate-limit-email-salt-v1'): string {
  const normalized = normalizeEmail(email);
  return crypto.createHmac('sha256', salt).update(normalized).digest('hex');
}
