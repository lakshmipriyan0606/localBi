import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { prisma } from '@/shared/database/client';
import { RegistrationService } from '@/modules/auth/registration-service';
import { PasswordService } from '@/modules/auth/password-service';
import { SessionService } from '@/modules/auth/session-service';
import { FeatureKey } from '@/modules/agency/agency-types';
import { Role } from '@/shared/authorization/policy';
import { TenantContextService } from '@/shared/database/tenant-context';

describe('Phase 15: Self-Service Onboarding, Registration & Workspace Setup', () => {
  const runId = crypto.randomUUID().slice(0, 8);
  const createdTenantIds: string[] = [];
  const createdUserIds: string[] = [];

  const directEmail = `direct-${runId}@example.com`;
  const directSlug  = `direct-${runId}`;

  const agencyEmail = `agency-${runId}@example.com`;
  const agencySlug  = `agency-${runId}`;

  afterAll(async () => {
    // Clean up created entities in reverse FK order
    for (const tenantId of createdTenantIds) {
      await TenantContextService.runWithTenantContext(tenantId, async (tx) => {
        await tx.auditLog.deleteMany({ where: { tenantId } }).catch(() => {});
        await tx.tenantEntitlement.deleteMany({ where: { tenantId } }).catch(() => {});
        await tx.brand.deleteMany({ where: { tenantId } }).catch(() => {});
        await tx.tenantMembership.deleteMany({ where: { tenantId } }).catch(() => {});
      }).catch(() => {});
      await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    }

    for (const userId of createdUserIds) {
      await prisma.userSession.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.userCredential.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  // ── 1. Slug Validation & Reserved List ──────────────────────────────────────
  describe('Slug Validation & Reserved List', () => {
    it('accepts valid slugs and normalizes them', () => {
      expect(RegistrationService.validateWorkspaceSlug('acme-corp')).toBe('acme-corp');
      expect(RegistrationService.validateWorkspaceSlug('Acme-Corp')).toBe('acme-corp');
      expect(RegistrationService.validateWorkspaceSlug('  beta-store-123  ')).toBe('beta-store-123');
    });

    it('rejects slugs that are too short or too long', () => {
      expect(() => RegistrationService.validateWorkspaceSlug('a')).toThrow();
      expect(() => RegistrationService.validateWorkspaceSlug('x'.repeat(64))).toThrow();
    });

    it('rejects slugs with invalid characters', () => {
      expect(() => RegistrationService.validateWorkspaceSlug('acme_corp')).toThrow();
      expect(() => RegistrationService.validateWorkspaceSlug('acme.corp')).toThrow();
      expect(() => RegistrationService.validateWorkspaceSlug('acme@corp')).toThrow();
    });

    it('blocks reserved slugs', () => {
      const reserved = ['admin', 'api', 'www', 'app', 'localbi', 'support', 'dashboard', 'billing', 'login', 'register'];
      for (const slug of reserved) {
        expect(() => RegistrationService.validateWorkspaceSlug(slug)).toThrow(/reserved/i);
      }
    });
  });

  // ── 2. Slug Availability ──────────────────────────────────────────────────
  describe('Slug Availability Checker', () => {
    it('returns false for reserved slugs without querying DB', async () => {
      const available = await RegistrationService.isSlugAvailable('admin');
      expect(available).toBe(false);
    });

    it('returns false for invalid slug formats', async () => {
      const available = await RegistrationService.isSlugAvailable('x');
      expect(available).toBe(false);
    });

    it('returns true for an unreserved and unclaimed slug', async () => {
      const testSlug = `unclaimed-${runId}-test`;
      const available = await RegistrationService.isSlugAvailable(testSlug);
      expect(available).toBe(true);
    });
  });

  // ── 3. Direct Client Registration Flow ─────────────────────────────────────
  describe('Direct Client Registration (DIRECT_CLIENT plan)', () => {
    it('atomically creates user, tenant, membership, brand, entitlements, and active session', async () => {
      const metadata = {
        ipAddress: '192.168.1.100',
        userAgent: 'Vitest/Phase15-Runner',
      };

      const result = await RegistrationService.register(
        {
          fullName: 'Alice Walker',
          email: directEmail,
          password: 'SecurePassword123!',
          workspaceName: `Walker Dental Clinic ${runId}`,
          workspaceSlug: directSlug,
          timezone: 'America/New_York',
          industry: 'HEALTHCARE',
          plan: 'DIRECT_CLIENT',
        },
        metadata
      );

      // Verify return structure
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(directEmail.toLowerCase());
      expect(result.user.fullName).toBe('Alice Walker');
      expect(result.tenantSlug).toBe(directSlug);
      expect(result.rawToken).toBeDefined();
      expect(result.rawToken.length).toBeGreaterThanOrEqual(32);

      createdUserIds.push(result.user.id);

      // Verify Tenant in database
      const tenant = await prisma.tenant.findUnique({
        where: { slug: directSlug },
        include: {
          memberships: true,
          brands: true,
          tenantEntitlements: true,
        },
      });

      expect(tenant).not.toBeNull();
      if (!tenant) return;
      createdTenantIds.push(tenant.id);

      expect(tenant.name).toBe(`Walker Dental Clinic ${runId}`);
      expect(tenant.slug).toBe(directSlug);
      expect(tenant.timezone).toBe('America/New_York');
      expect(tenant.industry).toBe('HEALTHCARE');
      expect(tenant.tenantType).toBe('DIRECT_CLIENT');
      expect(tenant.plan).toBe('STANDARD');
      expect(tenant.status).toBe('ACTIVE');

      // Verify User & Password Credential
      const credential = await prisma.userCredential.findUnique({
        where: { userId: result.user.id },
      });
      expect(credential).not.toBeNull();
      const passwordValid = await PasswordService.verifyPassword(credential!.passwordHash, 'SecurePassword123!');
      expect(passwordValid).toBe(true);

      // Query tenant-scoped tables within RLS tenant context
      const { memberships, brands, entitlements, auditLog } = await TenantContextService.runWithTenantContext(
        tenant.id,
        async (tx) => {
          const memberships = await tx.tenantMembership.findMany({ where: { tenantId: tenant.id } });
          const brands = await tx.brand.findMany({ where: { tenantId: tenant.id } });
          const entitlements = await tx.tenantEntitlement.findMany({ where: { tenantId: tenant.id } });
          const auditLog = await tx.auditLog.findFirst({ where: { tenantId: tenant.id, actorId: result.user.id } });
          return { memberships, brands, entitlements, auditLog };
        }
      );

      // Verify TenantMembership
      expect(memberships.length).toBe(1);
      const membership = memberships[0];
      expect(membership.userId).toBe(result.user.id);
      expect(membership.role).toBe(Role.CLIENT_OWNER);
      expect(membership.scopeMode).toBe('ALL');
      expect(membership.status).toBe('ACTIVE');

      // Verify default Brand
      expect(brands.length).toBe(1);
      const brand = brands[0];
      expect(brand.name).toBe(`Walker Dental Clinic ${runId}`);
      expect(brand.slug).toBe(directSlug);

      // Verify Entitlements
      const entitlementMap = new Map(entitlements.map((e) => [e.featureKey, e]));
      expect(entitlementMap.get(FeatureKey.GBP)?.enabled).toBe(true);
      expect((entitlementMap.get(FeatureKey.GBP)?.limits as any)?.locations).toBe(3);
      expect(entitlementMap.get(FeatureKey.WEBSITE)?.enabled).toBe(true);
      expect(entitlementMap.get(FeatureKey.ANALYTICS)?.enabled).toBe(true);
      expect(entitlementMap.get(FeatureKey.WHITELABEL)?.enabled).toBe(false);

      // Verify Audit Log
      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorRole).toBe(Role.CLIENT_OWNER);
      expect((auditLog?.newValues as any)?.event).toBe('SELF_REGISTRATION');

      // Verify Session is resolvable
      const resolvedSession = await SessionService.resolveSession(result.rawToken);
      expect(resolvedSession).not.toBeNull();
      expect(resolvedSession?.user.id).toBe(result.user.id);
      expect(resolvedSession?.user.email).toBe(directEmail.toLowerCase());
    });

    it('marks the slug as unavailable after registration', async () => {
      const available = await RegistrationService.isSlugAvailable(directSlug);
      expect(available).toBe(false);
    });
  });

  // ── 4. Agency Registration Flow ───────────────────────────────────────────
  describe('Agency Registration (AGENCY plan)', () => {
    it('creates agency tenant with AGENCY_OWNER role and white-label entitlements enabled', async () => {
      const metadata = {
        ipAddress: '10.0.0.1',
        userAgent: 'Vitest/Phase15-AgencyRunner',
      };

      const result = await RegistrationService.register(
        {
          fullName: 'Marcus Vance',
          email: agencyEmail,
          password: 'SuperAgencyPassword2026!',
          workspaceName: `Vance Media Group ${runId}`,
          workspaceSlug: agencySlug,
          timezone: 'Europe/London',
          industry: 'AGENCY',
          plan: 'AGENCY',
        },
        metadata
      );

      expect(result).toBeDefined();
      expect(result.tenantSlug).toBe(agencySlug);
      createdUserIds.push(result.user.id);

      const tenant = await prisma.tenant.findUnique({
        where: { slug: agencySlug },
      });

      expect(tenant).not.toBeNull();
      if (!tenant) return;
      createdTenantIds.push(tenant.id);

      expect(tenant.tenantType).toBe('AGENCY');
      expect(tenant.plan).toBe('AGENCY');

      // Query tenant-scoped records within RLS tenant context
      const { memberships, entitlements } = await TenantContextService.runWithTenantContext(
        tenant.id,
        async (tx) => {
          const memberships = await tx.tenantMembership.findMany({ where: { tenantId: tenant.id } });
          const entitlements = await tx.tenantEntitlement.findMany({ where: { tenantId: tenant.id } });
          return { memberships, entitlements };
        }
      );

      // Membership role is AGENCY_OWNER
      expect(memberships.length).toBe(1);
      const membership = memberships[0];
      expect(membership.role).toBe(Role.AGENCY_OWNER);

      // Entitlements: WHITELABEL is enabled, locations limit is 25, rank tracking is 200
      const entitlementMap = new Map(entitlements.map((e) => [e.featureKey, e]));
      expect(entitlementMap.get(FeatureKey.WHITELABEL)?.enabled).toBe(true);
      expect(entitlementMap.get(FeatureKey.GBP)?.enabled).toBe(true);
      expect((entitlementMap.get(FeatureKey.GBP)?.limits as any)?.locations).toBe(25);
      expect((entitlementMap.get(FeatureKey.RANK_TRACKING)?.limits as any)?.keywords).toBe(200);
      expect(entitlementMap.get(FeatureKey.CALL_TRACKING)?.enabled).toBe(true);
      expect(entitlementMap.get(FeatureKey.MERCHANT)?.enabled).toBe(true);
    });
  });

  // ── 5. Conflict & Security Prevention ─────────────────────────────────────
  describe('Conflict & Validation Handling', () => {
    it('rejects duplicate email with Conflict error', async () => {
      const metadata = { ipAddress: '127.0.0.1', userAgent: 'test' };

      await expect(
        RegistrationService.register(
          {
            fullName: 'Duplicate Email Test',
            email: directEmail, // Already registered in step 3
            password: 'ValidPassword123!',
            workspaceName: `Another Workspace ${runId}`,
            workspaceSlug: `another-workspace-${runId}`,
            timezone: 'UTC',
            plan: 'DIRECT_CLIENT',
          },
          metadata
        )
      ).rejects.toThrow(/already exists/i);
    });

    it('rejects duplicate slug with Conflict error', async () => {
      const metadata = { ipAddress: '127.0.0.1', userAgent: 'test' };

      await expect(
        RegistrationService.register(
          {
            fullName: 'Duplicate Slug Test',
            email: `unique-new-${runId}@example.com`,
            password: 'ValidPassword123!',
            workspaceName: `Conflict Clinic`,
            workspaceSlug: directSlug, // Already taken in step 3
            timezone: 'UTC',
            plan: 'DIRECT_CLIENT',
          },
          metadata
        )
      ).rejects.toThrow(/already taken/i);
    });

    it('rejects short passwords (<10 characters)', async () => {
      const metadata = { ipAddress: '127.0.0.1', userAgent: 'test' };

      await expect(
        RegistrationService.register(
          {
            fullName: 'Short Pass',
            email: `shortpass-${runId}@example.com`,
            password: 'Short1!',
            workspaceName: `Short Pass Clinic`,
            workspaceSlug: `short-pass-${runId}`,
            timezone: 'UTC',
            plan: 'DIRECT_CLIENT',
          },
          metadata
        )
      ).rejects.toThrow();
    });

    it('rejects reserved slug during registration', async () => {
      const metadata = { ipAddress: '127.0.0.1', userAgent: 'test' };

      await expect(
        RegistrationService.register(
          {
            fullName: 'Reserved Slug User',
            email: `reserved-${runId}@example.com`,
            password: 'ValidPassword123!',
            workspaceName: 'Admin Workspace',
            workspaceSlug: 'admin',
            timezone: 'UTC',
            plan: 'DIRECT_CLIENT',
          },
          metadata
        )
      ).rejects.toThrow(/reserved/i);
    });
  });
});
