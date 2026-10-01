import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/shared/database/client';
import { TenantService } from '@/modules/tenancy/tenant-service';
import { SessionService } from '@/modules/auth/session-service';
import { Role } from '@/shared/authorization/roles';
import { normalizeEmail } from '@/modules/auth/email-normalizer';
import { closeRedisClient } from '@/shared/database/redis-client';
import { TenantContextService } from '@/shared/database/tenant-context';

// Mutable session token to simulate cookies in Next.js route handlers
let currentSessionToken: string | null = null;

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: (name: string) => {
      if ((name === 'localbi_session' || name === '__Host-localbi_session') && currentSessionToken) {
        return { name, value: currentSessionToken };
      }
      return undefined;
    },
    set: vi.fn(),
  })),
}));

// Route handlers under test
import { GET as getMicrosites, POST as postMicrosite } from '@/app/api/microsites/route';
import {
  GET as getMicrositeBySubdomain,
  PUT as putMicrosite,
  DELETE as deleteMicrosite,
} from '@/app/api/microsites/[subdomain]/route';
import { POST as postPuckData } from '@/app/api/microsites/[subdomain]/puck/route';
import { POST as trackPixel } from '@/app/api/v1/pixel/track/route';

describe('Phase 0: Microsite & Visitor Route Security Boundaries', () => {
  let tenantAId: string;
  let tenantASlug: string;
  let tenantBId: string;
  let tenantBSlug: string;

  let ownerAToken: string;
  let viewerAToken: string;
  let ownerBToken: string;

  let testSubdomainA: string;
  let testSubdomainB: string;

  beforeAll(async () => {
    const id = crypto.randomBytes(4).toString('hex');
    tenantASlug = `tenant-sec-a-${id}`;
    tenantBSlug = `tenant-sec-b-${id}`;
    testSubdomainA = `site-sec-a-${id}`;
    testSubdomainB = `site-sec-b-${id}`;

    // 1. Create Tenant A with Owner and Viewer
    const userOwnerA = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-a-${id}@security.test`),
        fullName: 'Owner A',
        status: 'ACTIVE',
      },
    });
    const tenantA = await TenantService.createTenant(
      { name: `Security Tenant A ${id}`, slug: tenantASlug, timezone: 'Asia/Kolkata' },
      userOwnerA.id
    );
    tenantAId = tenantA.id;

    const userViewerA = await prisma.user.create({
      data: {
        email: normalizeEmail(`viewer-a-${id}@security.test`),
        fullName: 'Viewer A',
        status: 'ACTIVE',
      },
    });
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      await tx.tenantMembership.create({
        data: {
          tenantId: tenantAId,
          userId: userViewerA.id,
          role: Role.VIEWER,
          scopeMode: 'ALL',
          status: 'ACTIVE',
        },
      });
    });

    // 2. Create Tenant B with Owner
    const userOwnerB = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-b-${id}@security.test`),
        fullName: 'Owner B',
        status: 'ACTIVE',
      },
    });
    const tenantB = await TenantService.createTenant(
      { name: `Security Tenant B ${id}`, slug: tenantBSlug, timezone: 'Asia/Kolkata' },
      userOwnerB.id
    );
    tenantBId = tenantB.id;

    // 3. Mint stateful session tokens
    const sessionOwnerA = await SessionService.createSession(userOwnerA.id, {
      ipAddress: '127.0.0.1',
      userAgent: 'sec-test',
    });
    ownerAToken = sessionOwnerA.rawToken;

    const sessionViewerA = await SessionService.createSession(userViewerA.id, {
      ipAddress: '127.0.0.1',
      userAgent: 'sec-test',
    });
    viewerAToken = sessionViewerA.rawToken;

    const sessionOwnerB = await SessionService.createSession(userOwnerB.id, {
      ipAddress: '127.0.0.1',
      userAgent: 'sec-test',
    });
    ownerBToken = sessionOwnerB.rawToken;

    // Seed Tenant B microsite directly under Tenant B context
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      await tx.microsite.create({
        data: {
          tenantId: tenantBId,
          subdomain: testSubdomainB,
          brandName: 'Brand B Security',
          published: true,
          status: 'PUBLISHED',
        },
      });
    });
  });

  afterAll(async () => {
    // Clean up test data
    const ids = [tenantAId, tenantBId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.micrositeVisitor.deleteMany({
        where: { tenantId: { in: ids } },
      });
      await prisma.microsite.deleteMany({
        where: { tenantId: { in: ids } },
      });
      await prisma.tenantMembership.deleteMany({
        where: { tenantId: { in: ids } },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: ids } },
      });
    }
    await prisma.user.deleteMany({
      where: { email: { contains: 'security.test' } },
    });

    await closeRedisClient();
  });

  describe('1. POST /api/microsites (Create)', () => {
    it('denies unauthenticated requests with 401', async () => {
      currentSessionToken = null;
      const req = new NextRequest('http://localhost/api/microsites', {
        method: 'POST',
        body: JSON.stringify({
          subdomain: testSubdomainA,
          tenantSlug: tenantASlug,
          brandName: 'Brand A',
        }),
      });

      const res = await postMicrosite(req);
      expect(res.status).toBe(401);
    });

    it('rejects malformed requests missing required fields with 400', async () => {
      currentSessionToken = ownerAToken;
      const req = new NextRequest('http://localhost/api/microsites', {
        method: 'POST',
        body: JSON.stringify({
          subdomain: testSubdomainA,
          // Missing brandName and tenantSlug
        }),
      });

      const res = await postMicrosite(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('required');
    });

    it('denies read-only user (VIEWER) with 403', async () => {
      currentSessionToken = viewerAToken;
      const req = new NextRequest('http://localhost/api/microsites', {
        method: 'POST',
        body: JSON.stringify({
          subdomain: testSubdomainA,
          tenantSlug: tenantASlug,
          brandName: 'Brand A',
        }),
      });

      const res = await postMicrosite(req);
      expect(res.status).toBe(403);
    });

    it('allows authorized Tenant A Owner to create microsite', async () => {
      currentSessionToken = ownerAToken;
      const req = new NextRequest('http://localhost/api/microsites', {
        method: 'POST',
        body: JSON.stringify({
          subdomain: testSubdomainA,
          tenantSlug: tenantASlug,
          brandName: 'Brand A Luxury',
          published: true,
        }),
      });

      const res = await postMicrosite(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.microsite.subdomain).toBe(testSubdomainA);
    });

    it('returns deterministic error for duplicate subdomain', async () => {
      currentSessionToken = ownerAToken;
      const req = new NextRequest('http://localhost/api/microsites', {
        method: 'POST',
        body: JSON.stringify({
          subdomain: testSubdomainA,
          tenantSlug: tenantASlug,
          brandName: 'Duplicate Attempt',
        }),
      });

      const res = await postMicrosite(req);
      expect(res.status).toBe(409);
    });
  });

  describe('2. GET /api/microsites (List)', () => {
    it('denies unauthenticated requests with 401', async () => {
      currentSessionToken = null;
      const req = new NextRequest(`http://localhost/api/microsites?tenantSlug=${tenantASlug}`);
      const res = await getMicrosites(req);
      expect(res.status).toBe(401);
    });

    it('denies Tenant B accessing Tenant A microsites with 403', async () => {
      currentSessionToken = ownerBToken;
      const req = new NextRequest(`http://localhost/api/microsites?tenantSlug=${tenantASlug}`);
      const res = await getMicrosites(req);
      expect(res.status).toBe(403);
    });

    it('allows Tenant A to retrieve its own microsites', async () => {
      currentSessionToken = ownerAToken;
      const req = new NextRequest(`http://localhost/api/microsites?tenantSlug=${tenantASlug}`);
      const res = await getMicrosites(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.microsites.some((s: { subdomain: string }) => s.subdomain === testSubdomainA)).toBe(true);
      expect(json.microsites.some((s: { subdomain: string }) => s.subdomain === testSubdomainB)).toBe(false);
    });
  });

  describe('3. GET /api/microsites/[subdomain] (Public vs Admin Read)', () => {
    it('public request resolves published storefront without auth', async () => {
      currentSessionToken = null;
      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}`);
      const res = await getMicrositeBySubdomain(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.microsite.subdomain).toBe(testSubdomainA);
    });

    it('returns 404 for non-existent subdomain', async () => {
      currentSessionToken = null;
      const req = new NextRequest(`http://localhost/api/microsites/non-existent-subdomain-xyz`);
      const res = await getMicrositeBySubdomain(req, {
        params: Promise.resolve({ subdomain: 'non-existent-subdomain-xyz' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('4. PUT /api/microsites/[subdomain] (Mutations)', () => {
    it('denies unauthenticated mutation with 401', async () => {
      currentSessionToken = null;
      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}`, {
        method: 'PUT',
        body: JSON.stringify({ phone: '+91 99999 11111' }),
      });

      const res = await putMicrosite(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });
      expect(res.status).toBe(401);
    });

    it('denies read-only user (VIEWER) with 403', async () => {
      currentSessionToken = viewerAToken;
      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}`, {
        method: 'PUT',
        body: JSON.stringify({ phone: '+91 99999 22222' }),
      });

      const res = await putMicrosite(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });
      expect(res.status).toBe(403);
    });

    it('denies Tenant B updating Tenant A site (fails closed with 404)', async () => {
      currentSessionToken = ownerBToken;
      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}`, {
        method: 'PUT',
        body: JSON.stringify({ phone: '+91 99999 33333' }),
      });

      const res = await putMicrosite(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });
      expect(res.status).toBe(404);
    });

    it('allows Tenant A Owner to update Tenant A site', async () => {
      currentSessionToken = ownerAToken;
      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}`, {
        method: 'PUT',
        body: JSON.stringify({ phone: '+91 98401 99999' }),
      });

      const res = await putMicrosite(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.microsite.phone).toBe('+91 98401 99999');
    });
  });

  describe('5. POST /api/microsites/[subdomain]/puck (Visual Builder)', () => {
    it('denies unauthenticated request with 401', async () => {
      currentSessionToken = null;
      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}/puck`, {
        method: 'POST',
        body: JSON.stringify({ data: { content: [], root: {} } }),
      });

      const res = await postPuckData(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });
      expect(res.status).toBe(401);
    });

    it('denies Tenant B from saving Puck data on Tenant A site (fails closed with 404)', async () => {
      currentSessionToken = ownerBToken;
      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}/puck`, {
        method: 'POST',
        body: JSON.stringify({ data: { content: [], root: {} } }),
      });

      const res = await postPuckData(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });
      expect(res.status).toBe(404);
    });

    it('allows Tenant A Owner to save Puck visual layout', async () => {
      currentSessionToken = ownerAToken;
      const puckPayload = {
        content: [{ type: 'Hero', props: { title: 'Welcome to Brand A' } }],
        root: { props: { title: 'Brand A Official' } },
      };

      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}/puck`, {
        method: 'POST',
        body: JSON.stringify({ data: puckPayload }),
      });

      const res = await postPuckData(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('6. POST /api/v1/pixel/track (Visitor Ingestion & Tenant Derivation)', () => {
    it('rejects oversized beacon payload (>64KB) with 413', async () => {
      const hugeData = 'x'.repeat(70000);
      const req = new NextRequest('http://localhost/api/v1/pixel/track', {
        method: 'POST',
        body: hugeData,
      });

      const res = await trackPixel(req);
      expect(res.status).toBe(413);
    });

    it('rejects malformed JSON payload with 400', async () => {
      const req = new NextRequest('http://localhost/api/v1/pixel/track', {
        method: 'POST',
        body: '{ malformed json: missing quotes }',
      });

      const res = await trackPixel(req);
      expect(res.status).toBe(400);
    });

    it('rejects beacon missing site identifier with 400', async () => {
      const req = new NextRequest('http://localhost/api/v1/pixel/track', {
        method: 'POST',
        body: JSON.stringify({
          deviceFingerprint: 'fp_test_123456',
          url: '/test',
        }),
      });

      const res = await trackPixel(req);
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent website identifier (no fake data created)', async () => {
      const req = new NextRequest('http://localhost/api/v1/pixel/track', {
        method: 'POST',
        body: JSON.stringify({
          subdomain: 'ghost-storefront-999',
          deviceFingerprint: 'fp_test_123456',
          url: '/test',
        }),
      });

      const res = await trackPixel(req);
      expect(res.status).toBe(404);
    });

    it('derives Tenant A server-side from published storefront and records visitor event', async () => {
      const req = new NextRequest('http://localhost/api/v1/pixel/track', {
        method: 'POST',
        body: JSON.stringify({
          subdomain: testSubdomainA,
          deviceFingerprint: 'fp_sec_beacon_99',
          url: '/menu',
          eventType: 'page_view',
        }),
      });

      const res = await trackPixel(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.session.deviceFingerprint).toBe('fp_sec_beacon_99');

      // Verify event was saved under derived Tenant A (queried with RLS context)
      const savedVisitor = await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        return tx.micrositeVisitor.findFirst({
          where: { deviceFingerprint: 'fp_sec_beacon_99' },
        });
      });
      expect(savedVisitor).toBeDefined();
      expect(savedVisitor?.tenantId).toBe(tenantAId);
    });

    it('stitches identity to device fingerprint upon interaction', async () => {
      const req = new NextRequest('http://localhost/api/v1/pixel/track', {
        method: 'POST',
        body: JSON.stringify({
          subdomain: testSubdomainA,
          deviceFingerprint: 'fp_sec_beacon_99',
          eventType: 'identify',
          identifiedUser: {
            phone: '+91 99887 76655',
            name: 'Priya Sharma',
            email: 'priya@example.com',
          },
        }),
      });

      const res = await trackPixel(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.identified).toBe(true);
      expect(json.session.isIdentified).toBe(true);
      expect(json.session.identifiedUser.phone).toBe('+91 99887 76655');
    });
  });

  describe('7. DELETE /api/microsites/[subdomain] (Cleanup & Isolation)', () => {
    it('denies read-only user (VIEWER) with 403', async () => {
      currentSessionToken = viewerAToken;
      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}`, {
        method: 'DELETE',
      });

      const res = await deleteMicrosite(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });
      expect(res.status).toBe(403);
    });

    it('denies Tenant B from deleting Tenant A site with 404', async () => {
      currentSessionToken = ownerBToken;
      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}`, {
        method: 'DELETE',
      });

      const res = await deleteMicrosite(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });
      expect(res.status).toBe(404);
    });

    it('allows Tenant A Owner to delete Tenant A site', async () => {
      currentSessionToken = ownerAToken;
      const req = new NextRequest(`http://localhost/api/microsites/${testSubdomainA}`, {
        method: 'DELETE',
      });

      const res = await deleteMicrosite(req, {
        params: Promise.resolve({ subdomain: testSubdomainA }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
