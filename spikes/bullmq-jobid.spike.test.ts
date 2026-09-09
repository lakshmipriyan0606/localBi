import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';

/**
 * Generates a bounded, safe BullMQ job ID containing zero colons.
 * Format: gsc-sync_<sha256(seed).slice(0, 24)>
 */
function generateSafeJobId(params: {
  tenantId: string;
  propertyId: string;
  date: string;
  searchType: string;
}): { jobId: string; businessKey: string } {
  const businessKey = `${params.tenantId}:${params.propertyId}:${params.date}:${params.searchType}`;
  const hash = crypto.createHash('sha256').update(businessKey).digest('hex').slice(0, 24);
  const jobId = `gsc-sync_${hash}`;
  return { jobId, businessKey };
}

describe('Spike 5: BullMQ Safe Job ID & Idempotency Simulation', () => {
  it('should generate job IDs strictly without colons', () => {
    const { jobId, businessKey } = generateSafeJobId({
      tenantId: '01JB000000000000000000000A',
      propertyId: 'sc-domain:example.com',
      date: '2026-09-08',
      searchType: 'WEB',
    });

    expect(jobId).not.toContain(':');
    expect(jobId).toMatch(/^gsc-sync_[a-f0-9]{24}$/);
    expect(businessKey).toBe('01JB000000000000000000000A:sc-domain:example.com:2026-09-08:WEB');
  });

  it('should produce deterministic job IDs for identical inputs (idempotency keying)', () => {
    const params = {
      tenantId: '01JB000000000000000000000A',
      propertyId: 'sc-domain:example.com',
      date: '2026-09-08',
      searchType: 'WEB',
    };

    const res1 = generateSafeJobId(params);
    const res2 = generateSafeJobId(params);

    expect(res1.jobId).toBe(res2.jobId);
    expect(res1.businessKey).toBe(res2.businessKey);
  });

  it('should produce distinct job IDs when any parameter differs', () => {
    const res1 = generateSafeJobId({
      tenantId: '01JB000000000000000000000A',
      propertyId: 'sc-domain:example.com',
      date: '2026-09-08',
      searchType: 'WEB',
    });

    const res2 = generateSafeJobId({
      tenantId: '01JB000000000000000000000A',
      propertyId: 'sc-domain:example.com',
      date: '2026-09-08',
      searchType: 'IMAGE', // Different search type
    });

    expect(res1.jobId).not.toBe(res2.jobId);
  });
});
