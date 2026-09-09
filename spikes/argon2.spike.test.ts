import { describe, it, expect } from 'vitest';
import argon2 from 'argon2';

describe('Spike 3: Argon2 Password Hashing Benchmark', () => {
  const password = 'CorrectHorseBatteryStaple!2026';

  it('should hash and verify passwords using RFC 9106 Argon2id parameters', async () => {
    const startTime = performance.now();

    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,       // 3 iterations
      parallelism: 1,
    });

    const hashDurationMs = performance.now() - startTime;

    expect(hash).toContain('$argon2id$');
    expect(hashDurationMs).toBeLessThan(500); // Host target <= 500ms

    const verifyStart = performance.now();
    const isValid = await argon2.verify(hash, password);
    const verifyDurationMs = performance.now() - verifyStart;

    expect(isValid).toBe(true);
    expect(verifyDurationMs).toBeLessThan(500);

    const isInvalid = await argon2.verify(hash, 'WrongPassword123!');
    expect(isInvalid).toBe(false);
  });
});
