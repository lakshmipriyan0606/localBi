import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ClientAccountService } from '@/modules/agency/client-account-service';
import { AccessGrantService } from '@/modules/agency/access-grant-service';
import { WhiteLabelService } from '@/modules/agency/whitelabel-service';
import { PortalDomainService } from '@/modules/agency/portal-domain-service';
import { EntitlementService } from '@/modules/agency/entitlement-service';
import { InvitationService } from '@/modules/invitations/invitation-service';
import { AuthorizationService, AuthorizedContext, Role, ScopeMode } from '@/shared/authorization/policy';
import { FeatureKey } from '@/modules/agency/agency-types';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SessionService } from '@/modules/auth/session-service';

describe('Phase 14: Agency & White-Label Multi-Client Portal Engine', () => {
  // Shared fixtures
  const testId = crypto.randomUUID().slice(0, 8);
  let agencyTenantId: string;
  let agencyTenantSlug: string;
  let directTenantId: string;
  let directTenantSlug: string;

  let ownerUserId: string;
  let adminUserId: string;
  let memberUserId: string;
  let clientUserAId: string;
  let clientUserBId: string;

  let ownerSessionToken: string;
  let clientASessionToken: string;

  let clientAccountAId: string;
  let clientAccountASlug: string;
  let clientAccountBId: string;
  let clientAccountBSlug: string;

  let testBrandAId: string;
  let testLocationAId: string;

  let ownerContext: AuthorizedContext;
  let adminContext: AuthorizedContext;

  beforeAll(async () => {
    // 1. Create Agency Tenant
    agencyTenantSlug = `agency-${testId}`;
    const agencyTenant = await prisma.tenant.create({
      data: {
        name: `Agency Apex ${testId}`,
        slug: agencyTenantSlug,
        tenantType: 'AGENCY',
        plan: 'AGENCY_ENTERPRISE',
      },
    });
    agencyTenantId = agencyTenant.id;

    // 2. Create Direct Tenant for backward compatibility testing
    directTenantSlug = `direct-${testId}`;
    const directTenant = await prisma.tenant.create({
      data: {
        name: `Direct Store ${testId}`,
        slug: directTenantSlug,
        tenantType: 'DIRECT_CLIENT',
        plan: 'STARTER',
      },
    });
    directTenantId = directTenant.id;

    // 3. Create Users
    const createTestUser = async (emailPrefix: string) => {
      return prisma.user.create({
        data: {
          email: `${emailPrefix}-${testId}@example.com`,
          fullName: `User ${emailPrefix}`,
          status: 'ACTIVE',
        },
      });
    };

    const ownerUser = await createTestUser('agency-owner');
    ownerUserId = ownerUser.id;
    const adminUser = await createTestUser('agency-admin');
    adminUserId = adminUser.id;
    const memberUser = await createTestUser('agency-member');
    memberUserId = memberUser.id;
    const clientUserA = await createTestUser('client-user-a');
    clientUserAId = clientUserA.id;
    const clientUserB = await createTestUser('client-user-b');
    clientUserBId = clientUserB.id;

    // 4. Create Memberships on Agency Tenant (table is tenantMembership)
    await TenantContextService.withTenantContext(prisma, agencyTenantId, async (tx) => {
      await tx.tenantMembership.createMany({
        data: [
          {
            tenantId: agencyTenantId,
            userId: ownerUserId,
            role: 'AGENCY_OWNER',
            scopeMode: 'ALL',
          },
          {
            tenantId: agencyTenantId,
            userId: adminUserId,
            role: 'AGENCY_ADMIN',
            scopeMode: 'ALL',
          },
          {
            tenantId: agencyTenantId,
            userId: memberUserId,
            role: 'AGENCY_MEMBER',
            scopeMode: 'ALL',
          },
          {
            tenantId: agencyTenantId,
            userId: clientUserAId,
            role: 'CLIENT_EDITOR',
            scopeMode: 'RESTRICTED',
          },
          {
            tenantId: agencyTenantId,
            userId: clientUserBId,
            role: 'CLIENT_VIEWER',
            scopeMode: 'RESTRICTED',
          },
        ],
      });
    });

    // 5. Create active sessions
    // 5. Create active sessions using SessionService
    const ownerSession = await SessionService.createSession(ownerUserId, {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });
    ownerSessionToken = ownerSession.rawToken;

    const clientASession = await SessionService.createSession(clientUserAId, {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });
    clientASessionToken = clientASession.rawToken;

    // Context objects for testing authorized service calls
    ownerContext = {
      tenantId: agencyTenantId,
      tenantSlug: agencyTenantSlug,
      userId: ownerUserId,
      userRole: 'AGENCY_OWNER',
      role: Role.AGENCY_OWNER,
      scopeMode: ScopeMode.ALL,
    };

    adminContext = {
      tenantId: agencyTenantId,
      tenantSlug: agencyTenantSlug,
      userId: adminUserId,
      userRole: 'AGENCY_ADMIN',
      role: Role.AGENCY_ADMIN,
      scopeMode: ScopeMode.ALL,
    };
  });

  afterAll(async () => {
    try {
      await TenantContextService.withTenantContext(prisma, agencyTenantId, async (tx) => {
        await tx.accessGrant.deleteMany({ where: { tenantId: agencyTenantId } });
        await tx.portalDomain.deleteMany({ where: { tenantId: agencyTenantId } });
        await tx.whiteLabelConfig.deleteMany({ where: { tenantId: agencyTenantId } });
        await tx.clientFeatureEntitlement.deleteMany({ where: { tenantId: agencyTenantId } });
        await tx.tenantEntitlement.deleteMany({ where: { tenantId: agencyTenantId } });
        await tx.invitation.deleteMany({ where: { tenantId: agencyTenantId } });

        if (testLocationAId) {
          await tx.location.deleteMany({ where: { id: testLocationAId } });
        }
        if (testBrandAId) {
          await tx.brand.deleteMany({ where: { id: testBrandAId } });
        }

        await tx.clientAccount.deleteMany({ where: { tenantId: agencyTenantId } });
        await tx.tenantMembership.deleteMany({ where: { tenantId: agencyTenantId } });
      });

      await prisma.userSession.deleteMany({
        where: { userId: { in: [ownerUserId, adminUserId, memberUserId, clientUserAId, clientUserBId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUserId, adminUserId, memberUserId, clientUserAId, clientUserBId] } },
      });
      await prisma.tenant.deleteMany({ where: { id: { in: [agencyTenantId, directTenantId] } } });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. ClientAccount Service & Lifecycle
  // ───────────────────────────────────────────────────────────────────────────
  describe('ClientAccountService Lifecycle', () => {
    it('creates a client account with auto-generated unique slug', async () => {
      const clientA = await ClientAccountService.createClientAccount(
        agencyTenantId,
        {
          name: 'Acme Enterprises',
          primaryContact: 'Alice Acme',
          contactEmail: 'alice@acme.com',
          contactPhone: '+1-555-0101',
          timezone: 'America/New_York',
        },
        ownerContext
      );

      expect(clientA.id).toBeDefined();
      expect(clientA.tenantId).toBe(agencyTenantId);
      expect(clientA.name).toBe('Acme Enterprises');
      expect(clientA.slug).toBe('acme-enterprises');
      expect(clientA.status).toBe('ACTIVE');

      clientAccountAId = clientA.id;
      clientAccountASlug = clientA.slug;
    });

    it('handles slug collisions deterministically', async () => {
      const clientDup = await ClientAccountService.createClientAccount(
        agencyTenantId,
        {
          name: 'Acme Enterprises',
        },
        ownerContext
      );

      expect(clientDup.id).toBeDefined();
      expect(clientDup.slug).toBe('acme-enterprises-1');

      // Cleanup duplicate
      await TenantContextService.withTenantContext(prisma, agencyTenantId, async (tx) => {
        await tx.clientAccount.delete({ where: { id: clientDup.id } });
      });
    });

    it('creates a second client account for multi-client testing', async () => {
      const clientB = await ClientAccountService.createClientAccount(
        agencyTenantId,
        {
          name: 'Beta Global Industries',
          contactEmail: 'bob@beta.com',
        },
        ownerContext
      );

      expect(clientB.id).toBeDefined();
      expect(clientB.slug).toBe('beta-global-industries');
      expect(clientB.status).toBe('ACTIVE');

      clientAccountBId = clientB.id;
      clientAccountBSlug = clientB.slug;
    });

    it('lists client accounts with pagination, search, and status filters', async () => {
      const result = await ClientAccountService.listClientAccounts(
        agencyTenantId,
        {
          page: 1,
          pageSize: 10,
          search: 'Beta',
        },
        ownerContext
      );

      expect(result.total).toBe(1);
      expect(result.clients[0].name).toBe('Beta Global Industries');
    });

    it('updates client account contact metadata', async () => {
      const updated = await ClientAccountService.updateClientAccount(
        agencyTenantId,
        clientAccountASlug,
        {
          primaryContact: 'Alice Walker Acme',
          contactPhone: '+1-555-9999',
        },
        ownerContext
      );

      expect(updated.primaryContact).toBe('Alice Walker Acme');
      expect(updated.contactPhone).toBe('+1-555-9999');
    });

    it('attaches a brand and location to client account A', async () => {
      await TenantContextService.withTenantContext(prisma, agencyTenantId, async (tx) => {
        const brand = await tx.brand.create({
          data: {
            tenantId: agencyTenantId,
            clientAccountId: clientAccountAId,
            name: 'Acme Brand Alpha',
            slug: `acme-brand-${testId}`,
          },
        });
        testBrandAId = brand.id;

        const location = await tx.location.create({
          data: {
            tenantId: agencyTenantId,
            brandId: testBrandAId,
            name: 'Acme NYC Flagship',
            storeCode: `NYC-${testId}`,
            address: '100 Broadway',
            city: 'New York',
            state: 'NY',
            postalCode: '10005',
            country: 'US',
          },
        });
        testLocationAId = location.id;
      });

      const clientWithCounts = await ClientAccountService.getClientAccount(
        agencyTenantId,
        clientAccountASlug,
        ownerContext
      );
      expect(clientWithCounts.brandCount).toBe(1);
      expect(clientWithCounts.storeCount).toBe(1);
    });

    it('suspends client account non-destructively preserving all records', async () => {
      const suspended = await ClientAccountService.suspendClientAccount(
        agencyTenantId,
        clientAccountASlug,
        ownerContext
      );

      expect(suspended.status).toBe('SUSPENDED');
      expect(suspended.suspendedAt).toBeInstanceOf(Date);

      // Verify records are intact
      const brandCount = await prisma.brand.count({ where: { clientAccountId: clientAccountAId } });
      expect(brandCount).toBe(1);
    });

    it('unsuspends client account restoring active status', async () => {
      const unsuspended = await ClientAccountService.unsuspendClientAccount(
        agencyTenantId,
        clientAccountASlug,
        ownerContext
      );

      expect(unsuspended.status).toBe('ACTIVE');
      expect(unsuspended.suspendedAt).toBeNull();
    });

    it('archives client account cleanly', async () => {
      const clientToArchive = await ClientAccountService.createClientAccount(
        agencyTenantId,
        {
          name: 'Temp Client To Archive',
        },
        ownerContext
      );

      const archived = await ClientAccountService.archiveClientAccount(
        agencyTenantId,
        clientToArchive.slug,
        ownerContext
      );

      expect(archived.status).toBe('ARCHIVED');
      expect(archived.archivedAt).toBeInstanceOf(Date);

      const activeOnly = await ClientAccountService.listClientAccounts(
        agencyTenantId,
        {
          status: 'ACTIVE',
        },
        ownerContext
      );
      expect(activeOnly.clients.some((c) => c.id === clientToArchive.id)).toBe(false);

      const archivedOnly = await ClientAccountService.listClientAccounts(
        agencyTenantId,
        {
          status: 'ARCHIVED',
        },
        ownerContext
      );
      expect(archivedOnly.clients.some((c) => c.id === clientToArchive.id)).toBe(true);

      await TenantContextService.withTenantContext(prisma, agencyTenantId, async (tx) => {
        await tx.clientAccount.delete({ where: { id: clientToArchive.id } });
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. AccessGrant Service & Scoped Access Control
  // ───────────────────────────────────────────────────────────────────────────
  describe('AccessGrantService & Scoped Permissions', () => {
    let grantClientAId: string;
    let grantBrandAId: string;

    it('assigns client-level scoped grant to clientUserA', async () => {
      const grant = await AccessGrantService.grantAccess(
        agencyTenantId,
        {
          userId: clientUserAId,
          role: 'CLIENT_EDITOR',
          scopeType: 'CLIENT',
          clientAccountId: clientAccountAId,
        },
        ownerContext
      );

      expect(grant.id).toBeDefined();
      expect(grant.tenantId).toBe(agencyTenantId);
      expect(grant.userId).toBe(clientUserAId);
      expect(grant.role).toBe('CLIENT_EDITOR');
      expect(grant.scopeType).toBe('CLIENT');
      expect(grant.clientAccountId).toBe(clientAccountAId);
      expect(grant.status).toBe('ACTIVE');

      grantClientAId = grant.id;
    });

    it('assigns brand-level scoped grant to clientUserB', async () => {
      const grant = await AccessGrantService.grantAccess(
        agencyTenantId,
        {
          userId: clientUserBId,
          role: 'CLIENT_VIEWER',
          scopeType: 'BRAND',
          clientAccountId: clientAccountAId,
          brandId: testBrandAId,
        },
        ownerContext
      );

      expect(grant.id).toBeDefined();
      expect(grant.scopeType).toBe('BRAND');
      expect(grant.brandId).toBe(testBrandAId);

      grantBrandAId = grant.id;
    });

    it('lists access grants scoped to client account A', async () => {
      const grants = await AccessGrantService.listGrantsForClient(
        agencyTenantId,
        clientAccountAId,
        ownerContext
      );
      expect(grants.length).toBe(2);
      expect(grants.some((g) => g.id === grantClientAId)).toBe(true);
      expect(grants.some((g) => g.id === grantBrandAId)).toBe(true);
    });

    it('enforces role authority ceilings (AGENCY_ADMIN cannot grant AGENCY_OWNER)', async () => {
      await expect(
        AccessGrantService.grantAccess(
          agencyTenantId,
          {
            userId: memberUserId,
            role: 'AGENCY_OWNER',
            scopeType: 'TENANT',
          },
          adminContext
        )
      ).rejects.toThrow();
    });

    it('verifies clientUserA can access Client A but NOT Client B', async () => {
      const userGrants = await AccessGrantService.listGrantsForUser(
        agencyTenantId,
        clientUserAId,
        ownerContext
      );
      const grantedClientIds = new Set(
        userGrants.map((g) => g.clientAccountId).filter((id): id is string => !!id)
      );

      const clientAContext: AuthorizedContext = {
        tenantId: agencyTenantId,
        tenantSlug: agencyTenantSlug,
        userId: clientUserAId,
        userRole: 'CLIENT_EDITOR',
        role: Role.CLIENT_EDITOR,
        scopeMode: ScopeMode.RESTRICTED,
        allowedBrandIds: new Set([testBrandAId]),
        clientAccountId: clientAccountAId,
        grantedClientAccountIds: grantedClientIds,
      };

      // Client A access is granted
      expect(AuthorizationService.canAccessClient(clientAContext, clientAccountAId)).toBe(true);

      // Client B access is denied
      expect(AuthorizationService.canAccessClient(clientAContext, clientAccountBId)).toBe(false);
      expect(() =>
        AuthorizationService.assertClientAccess(clientAContext, clientAccountBId)
      ).toThrow();
    });

    it('revokes access grant cleanly', async () => {
      await AccessGrantService.revokeGrant(agencyTenantId, grantBrandAId, ownerContext);

      const grants = await AccessGrantService.listGrantsForClient(
        agencyTenantId,
        clientAccountAId,
        ownerContext
      );
      // Revoked grants are filtered out of active list
      expect(grants.length).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. ContextResolver with Client Scope & Suspension Gate
  // ───────────────────────────────────────────────────────────────────────────
  describe('ContextResolver Client Resolution & Suspension Enforcement', () => {
    it('resolves tenant context and populates grantedClientAccountIds', async () => {
      const resolved = await ContextResolver.resolveTenantContext(
        clientASessionToken,
        agencyTenantSlug,
        { clientSlug: clientAccountASlug }
      );

      expect(resolved.tenant?.id).toBe(agencyTenantId);
      expect(resolved.user.id).toBe(clientUserAId);
      expect(resolved.authorizedContext?.grantedClientAccountIds).toBeDefined();
      expect(resolved.authorizedContext?.grantedClientAccountIds?.has(clientAccountAId)).toBe(true);
      expect(resolved.clientAccount?.id).toBe(clientAccountAId);
    });

    it('blocks client user login when client account is suspended', async () => {
      // Suspend client account A
      await ClientAccountService.suspendClientAccount(agencyTenantId, clientAccountASlug, ownerContext);

      // Attempting to resolve context for suspended client account throws CLIENT_ACCESS_DENIED
      await expect(
        ContextResolver.resolveTenantContext(
          clientASessionToken,
          agencyTenantSlug,
          { clientSlug: clientAccountASlug }
        )
      ).rejects.toThrow();

      // Unsuspend client account A
      await ClientAccountService.unsuspendClientAccount(agencyTenantId, clientAccountASlug, ownerContext);
    });

    it('allows agency owner to access suspended client account for administrative management', async () => {
      // Suspend client account A
      await ClientAccountService.suspendClientAccount(agencyTenantId, clientAccountASlug, ownerContext);

      // Agency Owner CAN resolve context for suspended client account
      const resolved = await ContextResolver.resolveTenantContext(
        ownerSessionToken,
        agencyTenantSlug,
        { clientSlug: clientAccountASlug }
      );

      expect(resolved.tenant?.id).toBe(agencyTenantId);
      expect(resolved.clientAccount?.id).toBe(clientAccountAId);
      expect(resolved.authorizedContext?.role).toBe(Role.AGENCY_OWNER);

      // Unsuspend
      await ClientAccountService.unsuspendClientAccount(agencyTenantId, clientAccountASlug, ownerContext);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Scoped Invitations & Acceptance Flow
  // ───────────────────────────────────────────────────────────────────────────
  describe('InvitationService with Scoped Client Grants', () => {
    let inviteToken: string;
    let inviteEmail: string;

    it('creates an invitation bound to clientAccountId with CLIENT_EDITOR role', async () => {
      inviteEmail = `scoped-invite-${testId}@example.com`;
      const result = await InvitationService.createInvitation(
        agencyTenantId,
        {
          email: inviteEmail,
          role: 'CLIENT_EDITOR',
          scopeMode: ScopeMode.RESTRICTED,
          brandIds: [testBrandAId],
          clientAccountId: clientAccountAId,
        },
        ownerContext
      );

      expect(result.invitation.id).toBeDefined();
      expect(result.invitation.email).toBe(inviteEmail);
      expect(result.invitation.clientAccountId).toBe(clientAccountAId);
      expect(result.rawToken).toBeDefined();

      inviteToken = result.rawToken;
    });

    it('accepting invitation creates membership and automatically creates active AccessGrant', async () => {
      const acceptRes = await InvitationService.acceptInvitation(inviteToken, {
        fullName: 'Invited Client Specialist',
        password: 'Password123!',
      });

      expect(acceptRes.user.email).toBe(inviteEmail);

      // Verify automatic AccessGrant was created!
      const grants = await AccessGrantService.listGrantsForUser(
        agencyTenantId,
        acceptRes.user.id,
        ownerContext
      );
      expect(grants.length).toBe(1);
      expect(grants[0].clientAccountId).toBe(clientAccountAId);
      expect(grants[0].role).toBe('CLIENT_EDITOR');
      expect(grants[0].status).toBe('ACTIVE');

      // Cleanup
      await TenantContextService.withTenantContext(prisma, agencyTenantId, async (tx) => {
        await tx.accessGrant.deleteMany({ where: { userId: acceptRes.user.id } });
        await tx.tenantMembership.deleteMany({ where: { userId: acceptRes.user.id } });
      });
      await prisma.userSession.deleteMany({ where: { userId: acceptRes.user.id } });
      await prisma.user.delete({ where: { id: acceptRes.user.id } });
    });

    it('rejects replaying an already accepted invitation token', async () => {
      await expect(
        InvitationService.acceptInvitation(inviteToken, {
          fullName: 'Replay User',
          password: 'Password123!',
        })
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. WhiteLabelService & PortalDomainService
  // ───────────────────────────────────────────────────────────────────────────
  describe('WhiteLabelService & Portal Domains', () => {
    it('initializes default white-label configuration for agency tenant', async () => {
      const config = await WhiteLabelService.getWhiteLabelConfig(agencyTenantId);

      expect(config.tenantId).toBe(agencyTenantId);
      expect(config.portalName).toBe('LocalBi');
      expect(config.primaryColor).toBe('#4F46E5');
    });

    it('updates white-label branding colors and metadata with injection sanitization', async () => {
      const updated = await WhiteLabelService.updateWhiteLabelConfig(
        agencyTenantId,
        {
          enabled: true,
          portalName: 'Apex Partner Portal',
          companyLegalName: 'Apex Media Group Inc.',
          logoUrl: 'https://agency.com/logo.png',
          primaryColor: '#6366F1',
          secondaryColor: '#1E293B',
          accentColor: '#10B981',
          hideLocalBiBranding: true,
        },
        ownerContext
      );

      expect(updated.portalName).toBe('Apex Partner Portal');
      expect(updated.companyLegalName).toBe('Apex Media Group Inc.');
      expect(updated.primaryColor).toBe('#6366F1');
      expect(updated.hideLocalBiBranding).toBe(true);
    });

    it('rejects invalid or unsafe hex colors', async () => {
      await expect(
        WhiteLabelService.updateWhiteLabelConfig(
          agencyTenantId,
          {
            primaryColor: 'javascript:alert(1)',
          },
          ownerContext
        )
      ).rejects.toThrow();
    });

    let portalDomainId: string;
    const testHostname = `clients-${testId}.apex-test.com`;

    it('registers custom portal domain with DNS challenge verification token', async () => {
      const domain = await PortalDomainService.registerPortalDomain(
        agencyTenantId,
        testHostname,
        ownerContext
      );

      expect(domain.id).toBeDefined();
      expect(domain.tenantId).toBe(agencyTenantId);
      expect(domain.hostname).toBe(testHostname);
      expect(domain.status).toBe('PENDING');
      expect(domain.verificationToken).toBeDefined();
      expect(domain.verificationToken.length).toBeGreaterThanOrEqual(16);

      portalDomainId = domain.id;
    });

    it('prevents registering duplicate domain claimed by another tenant', async () => {
      const directOwnerContext: AuthorizedContext = {
        tenantId: directTenantId,
        tenantSlug: directTenantSlug,
        userId: ownerUserId,
        userRole: 'TENANT_OWNER',
        role: Role.TENANT_OWNER,
        scopeMode: ScopeMode.ALL,
      };

      await expect(
        PortalDomainService.registerPortalDomain(directTenantId, testHostname, directOwnerContext)
      ).rejects.toThrow();
    });

    it('verifies custom portal domain DNS token and activates it', async () => {
      const verified = await PortalDomainService.verifyPortalDomain(
        agencyTenantId,
        portalDomainId,
        ownerContext
      );

      expect(verified.status).toBe('ACTIVE');
      expect(verified.sslStatus).toBe('ACTIVE');
      expect(verified.verifiedAt).toBeInstanceOf(Date);
    });

    it('resolves white-label configuration by verified custom hostname', async () => {
      const result = await WhiteLabelService.resolveByHostname(testHostname);

      expect(result).toBeDefined();
      expect(result?.tenant.id).toBe(agencyTenantId);
      expect(result?.branding.portalName).toBe('Apex Partner Portal');
      expect(result?.branding.primaryColor).toBe('#6366F1');
    });

    it('removes custom portal domain cleanly', async () => {
      await PortalDomainService.removePortalDomain(agencyTenantId, portalDomainId, ownerContext);

      const domains = await TenantContextService.withTenantContext(prisma, agencyTenantId, async (tx) => {
        return tx.portalDomain.findMany({ where: { tenantId: agencyTenantId } });
      });
      expect(domains.some((d) => d.id === portalDomainId)).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. EntitlementService & Feature Gates
  // ───────────────────────────────────────────────────────────────────────────
  describe('EntitlementService Feature Governance', () => {
    it('returns default plan feature entitlements for agency tenant', async () => {
      const entitlements = await EntitlementService.getEntitlements(agencyTenantId);
      const entMap = new Map(entitlements.map((e) => [e.featureKey, e]));

      expect(entMap.get(FeatureKey.GBP)?.enabled).toBe(true);
      expect(entMap.get(FeatureKey.WHITELABEL)?.enabled).toBe(true);
      expect(entMap.get(FeatureKey.REPORTING)?.enabled).toBe(true);
    });

    it('overrides tenant entitlement at agency level', async () => {
      await EntitlementService.setTenantEntitlement(
        agencyTenantId,
        FeatureKey.CALL_TRACKING,
        false,
        {},
        ownerContext
      );

      const entitlements = await EntitlementService.getEntitlements(agencyTenantId);
      const callTracking = entitlements.find((e) => e.featureKey === FeatureKey.CALL_TRACKING);

      expect(callTracking?.enabled).toBe(false);
      expect(callTracking?.source).toBe('MANUAL_OVERRIDE');
    });

    it('applies client-specific entitlement override', async () => {
      // Tenant has WHITELABEL enabled, but client account B has it disabled
      await EntitlementService.setClientEntitlement(
        agencyTenantId,
        clientAccountBId,
        FeatureKey.WHITELABEL,
        false,
        {},
        ownerContext
      );

      const clientBEntitlements = await EntitlementService.getEntitlements(
        agencyTenantId,
        clientAccountBId
      );
      const whitelabelB = clientBEntitlements.find((e) => e.featureKey === FeatureKey.WHITELABEL);
      expect(whitelabelB?.enabled).toBe(false);
      expect(whitelabelB?.source).toBe('CLIENT_OVERRIDE');

      // Tenant-level and Client A still have WHITELABEL enabled
      const clientAEntitlements = await EntitlementService.getEntitlements(
        agencyTenantId,
        clientAccountAId
      );
      const whitelabelA = clientAEntitlements.find((e) => e.featureKey === FeatureKey.WHITELABEL);
      expect(whitelabelA?.enabled).toBe(true);
    });

    it('assertFeature throws FEATURE_NOT_ENTITLED when feature is disabled', async () => {
      await expect(
        EntitlementService.assertFeature(
          agencyTenantId,
          FeatureKey.WHITELABEL,
          clientAccountBId
        )
      ).rejects.toThrow();
    });

    it('enforces quota limit assertion correctly', async () => {
      // Set quota limit on maxBrands: 1
      await EntitlementService.setClientEntitlement(
        agencyTenantId,
        clientAccountAId,
        FeatureKey.REPORTING,
        true,
        { maxBrands: 1 },
        ownerContext
      );

      // Requesting 0 current count is allowed (under limit of 1)
      await expect(
        EntitlementService.assertLimit(
          agencyTenantId,
          FeatureKey.REPORTING,
          'maxBrands',
          0,
          clientAccountAId
        )
      ).resolves.not.toThrow();

      // Requesting 1 current count reaches/exceeds limit
      await expect(
        EntitlementService.assertLimit(
          agencyTenantId,
          FeatureKey.REPORTING,
          'maxBrands',
          1,
          clientAccountAId
        )
      ).rejects.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Dual-Role PostgreSQL 16 RLS Tenant Isolation
  // ───────────────────────────────────────────────────────────────────────────
  describe('PostgreSQL 16 Dual-Role RLS Isolation on Phase 14 Tables', () => {
    it('isolates ClientAccount records across tenants under localbi_app role', async () => {
      // Agency Tenant context sees its own client accounts
      const agencyAccounts = await TenantContextService.withTenantContext(
        prisma,
        agencyTenantId,
        async (tx) => {
          return tx.clientAccount.findMany({ where: { tenantId: agencyTenantId } });
        }
      );
      expect(agencyAccounts.length).toBeGreaterThanOrEqual(1);

      // Direct Tenant context queries Agency Tenant ID -> returns 0 rows due to dual-role RLS
      const crossTenantAccounts = await TenantContextService.withTenantContext(
        prisma,
        directTenantId,
        async (tx) => {
          return tx.clientAccount.findMany({ where: { tenantId: agencyTenantId } });
        }
      );
      expect(crossTenantAccounts.length).toBe(0);
    });

    it('isolates WhiteLabelConfig records across tenants under localbi_app role', async () => {
      const crossTenantConfig = await TenantContextService.withTenantContext(
        prisma,
        directTenantId,
        async (tx) => {
          return tx.whiteLabelConfig.findMany({ where: { tenantId: agencyTenantId } });
        }
      );
      expect(crossTenantConfig.length).toBe(0);
    });

    it('isolates AccessGrant records across tenants under localbi_app role', async () => {
      const crossTenantGrants = await TenantContextService.withTenantContext(
        prisma,
        directTenantId,
        async (tx) => {
          return tx.accessGrant.findMany({ where: { tenantId: agencyTenantId } });
        }
      );
      expect(crossTenantGrants.length).toBe(0);
    });
  });
});
