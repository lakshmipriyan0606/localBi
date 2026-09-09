import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/shared/database/client';
import { TenantService } from '../src/modules/tenancy/tenant-service';
import { MembershipService } from '../src/modules/memberships/membership-service';
import { InvitationService } from '../src/modules/invitations/invitation-service';
import { BrandService } from '../src/modules/brands/brand-service';
import { LocationService } from '../src/modules/locations/location-service';
import { AuditService } from '../src/modules/audit/audit-service';
import { Role, ScopeMode, AuthorizedContext } from '../src/shared/authorization/policy';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';
import { TenantContextService } from '../src/shared/database/tenant-context';
import crypto from 'node:crypto';

describe('Phase 2: Multi-Tenant Administration, Brands, Locations, and Scopes', () => {
  let ownerUserId: string;
  let adminUserId: string;
  let regularUserId: string;
  let testTenantId: string;
  let testTenantSlug: string;
  let ownerContext: AuthorizedContext;
  let adminContext: AuthorizedContext;

  beforeEach(async () => {
    const idSuffix = crypto.randomBytes(4).toString('hex');

    // Create users
    const owner = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-${idSuffix}@localbi.test`),
        fullName: 'Tenant Owner',
        status: 'ACTIVE',
      },
    });
    ownerUserId = owner.id;

    const admin = await prisma.user.create({
      data: {
        email: normalizeEmail(`admin-${idSuffix}@localbi.test`),
        fullName: 'Tenant Admin',
        status: 'ACTIVE',
      },
    });
    adminUserId = admin.id;

    const regular = await prisma.user.create({
      data: {
        email: normalizeEmail(`user-${idSuffix}@localbi.test`),
        fullName: 'Regular User',
        status: 'ACTIVE',
      },
    });
    regularUserId = regular.id;

    testTenantSlug = `org-${idSuffix}`;
    const tenant = await TenantService.createTenant(
      {
        name: `Organization ${idSuffix}`,
        slug: testTenantSlug,
        timezone: 'America/New_York',
      },
      ownerUserId
    );
    testTenantId = tenant.id;

    ownerContext = {
      userId: ownerUserId,
      tenantId: testTenantId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    // Add admin to tenant inside tenant context
    await TenantContextService.withTenantContext(prisma, testTenantId, async (tx) => {
      await tx.tenantMembership.create({
        data: {
          tenantId: testTenantId,
          userId: adminUserId,
          role: Role.CLIENT_ADMIN,
          scopeMode: ScopeMode.ALL,
          status: 'ACTIVE',
        },
      });
    });

    adminContext = {
      userId: adminUserId,
      tenantId: testTenantId,
      role: Role.CLIENT_ADMIN,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };
  });

  describe('1. Tenant Lifecycle and Optimistic Concurrency', () => {
    it('creates tenant and establishes owner membership', async () => {
      const userTenants = await TenantService.listUserTenants(ownerUserId);
      expect(userTenants.some((t) => t.id === testTenantId && t.role === Role.CLIENT_OWNER)).toBe(true);
    });

    it('rejects duplicate tenant slugs', async () => {
      await expect(
        TenantService.createTenant(
          { name: 'Duplicate Slug Org', slug: testTenantSlug },
          ownerUserId
        )
      ).rejects.toThrow(/already taken/);
    });

    it('updates tenant settings and prevents stale updates with version mismatch', async () => {
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: testTenantId } });
      expect(tenant.version).toBe(1);

      // Successful update
      const updated = await TenantService.updateTenantSettings(
        testTenantId,
        1,
        { name: 'Updated Org Name' },
        ownerContext
      );
      expect(updated.name).toBe('Updated Org Name');
      expect(updated.version).toBe(2);

      // Stale update with old version 1 should fail
      await expect(
        TenantService.updateTenantSettings(
          testTenantId,
          1,
          { name: 'Conflicting Stale Update' },
          ownerContext
        )
      ).rejects.toThrow(/Stale update conflict/);
    });
  });

  describe('2. Team Memberships and Last-Owner Protection', () => {
    it('enforces role assignment authority ceilings (Admin cannot assign Owner)', () => {
      expect(() =>
        MembershipService.assertRoleAssignmentAuthority(Role.CLIENT_ADMIN, Role.CLIENT_OWNER)
      ).toThrow(/cannot grant Owner/);

      expect(() =>
        MembershipService.assertRoleAssignmentAuthority(Role.CLIENT_ADMIN, Role.PLATFORM_SUPER_ADMIN)
      ).toThrow();
    });

    it('protects the last active Client Owner from demotion, suspension, or removal', async () => {
      const ownerMembership = await TenantContextService.withTenantContext(prisma, testTenantId, async (tx) => {
        return tx.tenantMembership.findUniqueOrThrow({
          where: {
            uq_membership_tenant_user: {
              tenantId: testTenantId,
              userId: ownerUserId,
            },
          },
        });
      });

      // Attempting to demote the sole owner to VIEWER
      await expect(
        MembershipService.updateMemberRoleAndScope(
          testTenantId,
          ownerMembership.id,
          Role.VIEWER,
          ScopeMode.ALL,
          [],
          [],
          ownerContext
        )
      ).rejects.toThrow(/last active Client Owner/);

      // Attempting to suspend the sole owner
      await expect(
        MembershipService.suspendMember(testTenantId, ownerMembership.id, ownerContext)
      ).rejects.toThrow(/last active Client Owner/);

      // Attempting to remove the sole owner
      await expect(
        MembershipService.removeMember(testTenantId, ownerMembership.id, ownerContext)
      ).rejects.toThrow(/last active Client Owner/);
    });

    it('allows demotion when multiple active owners exist', async () => {
      // Promote admin to second owner
      const adminMembership = await TenantContextService.withTenantContext(prisma, testTenantId, async (tx) => {
        return tx.tenantMembership.findUniqueOrThrow({
          where: {
            uq_membership_tenant_user: {
              tenantId: testTenantId,
              userId: adminUserId,
            },
          },
        });
      });

      await MembershipService.updateMemberRoleAndScope(
        testTenantId,
        adminMembership.id,
        Role.CLIENT_OWNER,
        ScopeMode.ALL,
        [],
        [],
        ownerContext
      );

      // Now there are 2 owners; demoting the original owner should succeed
      const ownerMembership = await TenantContextService.withTenantContext(prisma, testTenantId, async (tx) => {
        return tx.tenantMembership.findUniqueOrThrow({
          where: {
            uq_membership_tenant_user: {
              tenantId: testTenantId,
              userId: ownerUserId,
            },
          },
        });
      });

      await expect(
        MembershipService.updateMemberRoleAndScope(
          testTenantId,
          ownerMembership.id,
          Role.CLIENT_ADMIN,
          ScopeMode.ALL,
          [],
          [],
          adminContext
        )
      ).resolves.not.toThrow();
    });
  });

  describe('3. User Invitations and Atomic Acceptance Race Safety', () => {
    it('creates an invitation and enforces single-use acceptance', async () => {
      const inviteEmail = normalizeEmail(`invitee-${crypto.randomBytes(4).toString('hex')}@localbi.test`);

      const { rawToken, invitation } = await InvitationService.createInvitation(
        testTenantId,
        {
          email: inviteEmail,
          role: Role.BRAND_MANAGER,
          scopeMode: ScopeMode.ALL,
        },
        ownerContext
      );

      expect(invitation.email).toBe(inviteEmail);
      expect(rawToken).toBeDefined();

      // Accept invitation as a new user
      const acceptResult = await InvitationService.acceptInvitation(rawToken, {
        fullName: 'Invited Brand Manager',
        password: 'SecureInvitedPassword2026!',
      });

      expect(acceptResult.user.email).toBe(inviteEmail);
      expect(acceptResult.session).toBeDefined();

      // Verify membership was created with correct role
      const member = await TenantContextService.withTenantContext(prisma, testTenantId, async (tx) => {
        return tx.tenantMembership.findUnique({
          where: {
            uq_membership_tenant_user: {
              tenantId: testTenantId,
              userId: acceptResult.user.id,
            },
          },
        });
      });
      expect(member?.role).toBe(Role.BRAND_MANAGER);

      // Second acceptance attempt (replay / race) MUST fail
      await expect(
        InvitationService.acceptInvitation(rawToken, {
          fullName: 'Duplicate Clicker',
          password: 'AnotherPassword123!',
        })
      ).rejects.toThrow(/already been accepted/);
    });

    it('rejects invitation creation if user is already an active member', async () => {
      const owner = await prisma.user.findUniqueOrThrow({ where: { id: ownerUserId } });

      await expect(
        InvitationService.createInvitation(
          testTenantId,
          {
            email: owner.email,
            role: Role.VIEWER,
          },
          ownerContext
        )
      ).rejects.toThrow(/already a member/);
    });
  });

  describe('4. Brand Administration and Scope Access', () => {
    it('creates brand and prevents duplicate slugs within tenant', async () => {
      const brand = await BrandService.createBrand(
        testTenantId,
        { name: 'Northern Region Brand', slug: 'northern-brand' },
        ownerContext
      );
      expect(brand.slug).toBe('northern-brand');
      expect(brand.version).toBe(1);

      // Duplicate slug rejection
      await expect(
        BrandService.createBrand(
          testTenantId,
          { name: 'Duplicate Slug Brand', slug: 'northern-brand' },
          ownerContext
        )
      ).rejects.toThrow(/already exists/);
    });

    it('updates brand with optimistic concurrency', async () => {
      const brand = await BrandService.createBrand(
        testTenantId,
        { name: 'Alpha Brand', slug: 'alpha-brand' },
        ownerContext
      );

      const updated = await BrandService.updateBrand(
        testTenantId,
        brand.id,
        1,
        { name: 'Alpha Brand Updated' },
        ownerContext
      );
      expect(updated.name).toBe('Alpha Brand Updated');
      expect(updated.version).toBe(2);

      // Stale update rejection
      await expect(
        BrandService.updateBrand(
          testTenantId,
          brand.id,
          1,
          { name: 'Stale Brand Overwrite' },
          ownerContext
        )
      ).rejects.toThrow(/Stale update conflict/);
    });

    it('enforces restricted brand scope filtering for scoped users', async () => {
      const brand1 = await BrandService.createBrand(
        testTenantId,
        { name: 'Brand One', slug: 'brand-one' },
        ownerContext
      );
      const brand2 = await BrandService.createBrand(
        testTenantId,
        { name: 'Brand Two', slug: 'brand-two' },
        ownerContext
      );

      // User restricted to brand1 ONLY
      const restrictedContext: AuthorizedContext = {
        userId: regularUserId,
        tenantId: testTenantId,
        role: Role.BRAND_MANAGER,
        scopeMode: ScopeMode.RESTRICTED,
        grantedBrandIds: new Set([brand1.id]),
        grantedLocationIds: new Set(),
      };

      const list = await BrandService.listBrands(testTenantId, {}, restrictedContext);
      expect(list.items.length).toBe(1);
      expect(list.items[0]?.id).toBe(brand1.id);

      // Accessing brand2 directly must throw BRAND_ACCESS_DENIED
      await expect(BrandService.getBrandById(testTenantId, brand2.id, restrictedContext)).rejects.toThrow();
    });
  });

  describe('5. Location Administration and Relational Integrity', () => {
    let parentBrandId: string;

    beforeEach(async () => {
      const brand = await BrandService.createBrand(
        testTenantId,
        { name: 'Parent Brand For Locations', slug: `loc-brand-${crypto.randomBytes(3).toString('hex')}` },
        ownerContext
      );
      parentBrandId = brand.id;
    });

    it('creates location with valid ISO country and IANA timezone', async () => {
      const location = await LocationService.createLocation(
        testTenantId,
        {
          brandId: parentBrandId,
          name: 'Downtown Store 101',
          storeCode: 'STORE-101',
          addressLine1: '123 Main Street',
          city: 'Boston',
          state: 'MA',
          postalCode: '02108',
          country: 'US',
          timezone: 'America/New_York',
        },
        ownerContext
      );

      expect(location.id).toBeDefined();
      expect(location.country).toBe('US');
      expect(location.timezone).toBe('America/New_York');
      expect(location.version).toBe(1);
    });

    it('rejects invalid IANA timezone and country code', async () => {
      await expect(
        LocationService.createLocation(
          testTenantId,
          {
            brandId: parentBrandId,
            name: 'Bad Timezone Store',
            addressLine1: '123 Main',
            city: 'City',
            state: 'ST',
            postalCode: '12345',
            country: 'US',
            timezone: 'Invalid/NonExistent_Zone',
          },
          ownerContext
        )
      ).rejects.toThrow(/Invalid IANA time zone/);

      await expect(
        LocationService.createLocation(
          testTenantId,
          {
            brandId: parentBrandId,
            name: 'Bad Country Store',
            addressLine1: '123 Main',
            city: 'City',
            state: 'ST',
            postalCode: '12345',
            country: 'UNITED_STATES_TOO_LONG',
            timezone: 'UTC',
          },
          ownerContext
        )
      ).rejects.toThrow(/Invalid ISO country code/);
    });

    it('enforces store code uniqueness within the same brand', async () => {
      await LocationService.createLocation(
        testTenantId,
        {
          brandId: parentBrandId,
          name: 'Store Alpha',
          storeCode: 'DUPLICATE-CODE',
          addressLine1: '100 Alpha St',
          city: 'Boston',
          state: 'MA',
          postalCode: '02108',
          country: 'US',
        },
        ownerContext
      );

      await expect(
        LocationService.createLocation(
          testTenantId,
          {
            brandId: parentBrandId,
            name: 'Store Beta',
            storeCode: 'DUPLICATE-CODE',
            addressLine1: '200 Beta St',
            city: 'Boston',
            state: 'MA',
            postalCode: '02108',
            country: 'US',
          },
          ownerContext
        )
      ).rejects.toThrow(/already assigned/);
    });
  });

  describe('6. Append-Only Audit Logging and Secret Redaction', () => {
    it('records audit events and redacts sensitive keys from stored JSON', async () => {
      const event = await AuditService.recordEvent({
        tenantId: testTenantId,
        actorId: ownerUserId,
        actorRole: Role.CLIENT_OWNER,
        action: 'user:test_event',
        resourceType: 'User',
        resourceId: regularUserId,
        oldValues: {
          password: 'SecretPlaintextPassword!',
          passwordHash: '$argon2id$...secret...',
          safeField: 'SafeValue',
        },
        newValues: {
          sessionToken: 'raw-token-value',
          updatedField: 'NewSafeValue',
        },
      });

      expect(event.id).toBeDefined();

      const record = await TenantContextService.withTenantContext(prisma, testTenantId, async (tx) => {
        return tx.auditLog.findUniqueOrThrow({ where: { id: event.id } });
      });
      const oldVals = record.oldValues as Record<string, unknown>;
      const newVals = record.newValues as Record<string, unknown>;

      expect(oldVals['password']).toBe('[REDACTED_SECRET]');
      expect(oldVals['passwordHash']).toBe('[REDACTED_SECRET]');
      expect(oldVals['safeField']).toBe('SafeValue');

      expect(newVals['sessionToken']).toBe('[REDACTED_SECRET]');
      expect(newVals['updatedField']).toBe('NewSafeValue');
    });
  });
});
