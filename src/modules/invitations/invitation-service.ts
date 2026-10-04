import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import { normalizeEmail } from '../auth/email-normalizer';
import { generateOpaqueToken, hashToken } from '../auth/token-utils';
import { PasswordService } from '../auth/password-service';
import { SessionService, ActiveSession, AuthenticatedUser } from '../auth/session-service';
import {
  createValidationError,
  createConflictError,
  createInvalidTokenError,
  createTenantAccessDeniedError,
  createResourceNotFoundError,
} from '../../shared/errors';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
  RoleType,
  ScopeMode,
  ScopeModeType,
} from '../../shared/authorization/policy';
import { MembershipService } from '../memberships/membership-service';
import { EmailService } from '../email/email-service';
import { getConfig } from '../../shared/config';
import { logger } from '../../shared/observability/logger';

export const INVITATION_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CreateInvitationInput {
  email: string;
  role: RoleType;
  scopeMode?: ScopeModeType;
  clientAccountId?: string;
  brandIds?: string[];
  locationIds?: string[];
}

export interface InvitationListItemDto {
  id: string;
  email: string;
  role: string;
  scopeMode: string;
  clientAccountId?: string | null;
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
  invitedBrandIds: string[];
  invitedLocationIds: string[];
}

export interface PublicInvitationDetails {
  id: string;
  tenantId: string;
  tenantName: string;
  clientAccountId?: string | null;
  clientAccountName?: string | null;
  email: string;
  role: string;
  expiresAt: Date;
  isExpired: boolean;
}

export class InvitationService {
  /**
   * Creates a user invitation for a tenant organization.
   * Enforces:
   * - Email normalization
   * - Role authority ceilings
   * - Duplicate membership prevention
   * - 256-bit CSPRNG token generation and SHA-256 hashed storage
   */
  public static async createInvitation(
    tenantId: string,
    input: CreateInvitationInput,
    context: AuthorizedContext
  ): Promise<{ rawToken: string; invitation: InvitationListItemDto }> {
    AuthorizationService.assertCan(context, Action.USER_INVITE);
    MembershipService.assertRoleAssignmentAuthority(context.role, input.role);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    const normalized = normalizeEmail(input.email);
    const scopeMode = input.scopeMode || ScopeMode.ALL;
    const brandIds = input.brandIds || [];
    const locationIds = input.locationIds || [];

    if (input.clientAccountId) {
      AuthorizationService.assertClientAccess(context, input.clientAccountId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Check if user already exists and is a member of this tenant
      const existingUser = await tx.user.findUnique({
        where: { email: normalized },
      });

      if (existingUser) {
        const existingMembership = await tx.tenantMembership.findUnique({
          where: {
            uq_membership_tenant_user: {
              tenantId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMembership) {
          throw createConflictError(`User "${normalized}" is already a member of this organization`);
        }
      }

      // 2. Invalidate any previous pending invitations for this email in this tenant
      await tx.invitation.updateMany({
        where: {
          tenantId,
          email: normalized,
          acceptedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      // 3. Generate 256-bit CSPRNG raw token and hash
      const rawToken = generateOpaqueToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + INVITATION_EXPIRATION_MS);

      const invitation = await tx.invitation.create({
        data: {
          tenantId,
          email: normalized,
          role: input.role,
          scopeMode,
          clientAccountId: input.clientAccountId || null,
          invitedBrandIds: brandIds,
          invitedLocationIds: locationIds,
          tokenHash,
          invitedBy: context.userId,
          expiresAt,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: Action.USER_INVITE,
          resourceType: 'Invitation',
          resourceId: invitation.id,
          newValues: { email: normalized, role: input.role, scopeMode, clientAccountId: input.clientAccountId },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, invitationId: invitation.id, email: normalized }, 'User invitation created');

      return {
        rawToken,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          scopeMode: invitation.scopeMode,
          clientAccountId: invitation.clientAccountId,
          invitedBy: invitation.invitedBy,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
          invitedBrandIds: invitation.invitedBrandIds,
          invitedLocationIds: invitation.invitedLocationIds,
        },
      };
    });
  }

  /**
   * Lists pending invitations for a tenant.
   */
  public static async listPendingInvitations(
    tenantId: string,
    context: AuthorizedContext
  ): Promise<InvitationListItemDto[]> {
    AuthorizationService.assertCan(context, Action.USER_INVITE);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const now = new Date();
      const invitations = await tx.invitation.findMany({
        where: {
          tenantId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      });

      return invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        scopeMode: inv.scopeMode,
        clientAccountId: inv.clientAccountId,
        invitedBy: inv.invitedBy,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        invitedBrandIds: inv.invitedBrandIds,
        invitedLocationIds: inv.invitedLocationIds,
      }));
    });
  }

  /**
   * Revokes a pending invitation.
   */
  public static async revokeInvitation(
    tenantId: string,
    invitationId: string,
    context: AuthorizedContext
  ): Promise<void> {
    AuthorizationService.assertCan(context, Action.USER_REMOVE);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const updated = await tx.invitation.updateMany({
        where: {
          id: invitationId,
          tenantId,
          acceptedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        throw createResourceNotFoundError('Invitation', invitationId);
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'user:revoke_invitation',
          resourceType: 'Invitation',
          resourceId: invitationId,
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });
    });
  }

  /**
   * Resolves public invitation details for user invitation acceptance screen.
   */
  public static async getInvitationByToken(rawToken: string): Promise<PublicInvitationDetails> {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 32) {
      throw createInvalidTokenError('Invalid or malformed invitation link');
    }

    const tokenHash = hashToken(rawToken);

    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        tenant: {
          select: { id: true, name: true },
        },
        clientAccount: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invitation || invitation.revokedAt !== null || invitation.acceptedAt !== null) {
      throw createInvalidTokenError('This invitation link has expired, been revoked, or already accepted');
    }

    const isExpired = invitation.expiresAt.getTime() <= Date.now();
    if (isExpired) {
      throw createInvalidTokenError('This invitation link has expired');
    }

    return {
      id: invitation.id,
      tenantId: invitation.tenant.id,
      tenantName: invitation.tenant.name,
      clientAccountId: invitation.clientAccount?.id || null,
      clientAccountName: invitation.clientAccount?.name || null,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      isExpired: false,
    };
  }

  /**
   * Atomically accepts an invitation.
   * Concurrency Safe: Uses an atomic conditional update to guarantee that duplicate
   * concurrent requests (e.g. double-click) cannot create duplicate memberships or double-accept.
   */
  public static async acceptInvitation(
    rawToken: string,
    options?: { fullName?: string; password?: string },
    existingUserId?: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ user: AuthenticatedUser; session: ActiveSession; rawToken: string }> {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 32) {
      throw createInvalidTokenError('Invalid or malformed invitation token');
    }

    const tokenHash = hashToken(rawToken);
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      // 1. Atomic lock: update accepted_at ONLY if currently unaccepted, unrevoked, and unexpired
      const lockResult = await tx.invitation.updateMany({
        where: {
          tokenHash,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          acceptedAt: now,
        },
      });

      if (lockResult.count === 0) {
        throw createConflictError('This invitation has already been accepted or is no longer valid');
      }

      // Fetch locked invitation record
      const invitation = await tx.invitation.findUniqueOrThrow({
        where: { tokenHash },
        include: { tenant: true },
      });

      // Establish tenant context for tenant-owned tables (tenant_memberships, scopes, audit_logs)
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${invitation.tenantId}, true)`;

      let userId = existingUserId;

      // 2. If new user registration
      if (!userId) {
        if (!options?.fullName || !options?.password) {
          throw createValidationError('Full name and password are required for new account registration');
        }

        PasswordService.validatePasswordStrength(options.password);
        const passwordHash = await PasswordService.hashPassword(options.password);

        // Check if user already exists
        const existing = await tx.user.findUnique({
          where: { email: invitation.email },
        });

        if (existing) {
          userId = existing.id;
        } else {
          const newUser = await tx.user.create({
            data: {
              email: invitation.email,
              fullName: options.fullName.trim(),
              status: 'ACTIVE',
              emailVerifiedAt: now,
              credential: {
                create: {
                  passwordHash,
                },
              },
            },
          });
          userId = newUser.id;
        }
      }

      // 3. Establish Tenant Membership
      const membership = await tx.tenantMembership.upsert({
        where: {
          uq_membership_tenant_user: {
            tenantId: invitation.tenantId,
            userId,
          },
        },
        create: {
          tenantId: invitation.tenantId,
          userId,
          role: invitation.role,
          scopeMode: invitation.scopeMode,
          status: 'ACTIVE',
        },
        update: {
          role: invitation.role,
          scopeMode: invitation.scopeMode,
          status: 'ACTIVE',
        },
      });

      // 4. Assign restricted scopes if applicable
      if (invitation.scopeMode === ScopeMode.RESTRICTED) {
        if (invitation.invitedBrandIds.length > 0) {
          await tx.brandAccessScope.createMany({
            data: invitation.invitedBrandIds.map((brandId) => ({
              tenantId: invitation.tenantId,
              membershipId: membership.id,
              brandId,
            })),
            skipDuplicates: true,
          });
        }

        if (invitation.invitedLocationIds.length > 0) {
          await tx.locationAccessScope.createMany({
            data: invitation.invitedLocationIds.map((locationId) => ({
              tenantId: invitation.tenantId,
              membershipId: membership.id,
              locationId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 4.5. Assign Client Account Access Grant if invited to a specific client account
      if (invitation.clientAccountId) {
        const existingGrant = await tx.accessGrant.findFirst({
          where: {
            tenantId: invitation.tenantId,
            userId,
            clientAccountId: invitation.clientAccountId,
          },
        });

        if (existingGrant) {
          await tx.accessGrant.update({
            where: { uq_access_grant_tenant_id: { tenantId: invitation.tenantId, id: existingGrant.id } },
            data: { role: invitation.role, status: 'ACTIVE' },
          });
        } else {
          await tx.accessGrant.create({
            data: {
              tenantId: invitation.tenantId,
              userId,
              role: invitation.role,
              scopeType: 'CLIENT',
              clientAccountId: invitation.clientAccountId,
              status: 'ACTIVE',
            },
          });
        }
      }

      // 5. Audit entry
      await tx.auditLog.create({
        data: {
          tenantId: invitation.tenantId,
          actorId: userId,
          actorRole: invitation.role,
          action: 'user:accept_invitation',
          resourceType: 'TenantMembership',
          resourceId: membership.id,
          ipAddress: metadata?.ipAddress || 'INTERNAL',
          userAgent: metadata?.userAgent || 'INTERNAL',
        },
      });

      // 6. Create session
      const { rawToken: sessionRawToken, session } = await SessionService.createSession(
        userId,
        {
          ipAddress: metadata?.ipAddress || 'UNKNOWN',
          userAgent: metadata?.userAgent || 'UNKNOWN',
        },
        tx
      );

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, email: true, fullName: true, status: true },
      });

      return {
        user,
        session,
        rawToken: sessionRawToken,
        tenantName: invitation.tenant.name,
        tenantSlug: invitation.tenant.slug,
      };
    });

    // Send welcome onboarding email asynchronously after successful commit
    try {
      const config = getConfig();
      EmailService.sendWelcome({
        recipientEmail: result.user.email,
        userName: result.user.fullName || result.user.email.split('@')[0],
        tenantName: result.tenantName,
        dashboardUrl: `${config.APP_URL}/t/${result.tenantSlug}/dashboard`,
      }).catch((err) => logger.warn({ err }, 'Failed to dispatch welcome email after invite acceptance'));
    } catch (err) {
      logger.warn({ err }, 'Error preparing welcome email dispatch');
    }

    return {
      user: result.user,
      session: result.session,
      rawToken: result.rawToken,
    };
  }
}
