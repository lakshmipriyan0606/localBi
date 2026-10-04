import { prisma } from '@/shared/database/client';
import { PasswordService } from './password-service';
import { SessionService, SessionMetadata, ActiveSession, AuthenticatedUser } from './session-service';
import { normalizeEmail } from './email-normalizer';
import { TenantService } from '@/modules/tenancy/tenant-service';
import { FeatureKey } from '@/modules/agency/agency-types';
import { Action, Role } from '@/shared/authorization/policy';
import {
  createValidationError,
  createConflictError,
} from '@/shared/errors';
import { logger } from '@/shared/observability/logger';

// ─── Reserved slugs that cannot be claimed as workspace identifiers ────────────
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'www', 'app', 'localbi', 'localbi-app', 'support',
  'billing', 'dashboard', 'help', 'login', 'logout', 'register', 'signup',
  'onboarding', 'mail', 'status', 'health', 'system', 'internal', 'ops',
  'dev', 'staging', 'prod', 'production', 'test', 'demo', 'sandbox',
  'root', 'null', 'undefined', 'true', 'false', 'new', 'create',
  'client', 'tenant', 'user', 'users', 'site', 'sites', 'blog', 'about',
  'contact', 'privacy', 'terms', 'security', 'legal',
]);

export type RegistrationPlan = 'DIRECT_CLIENT' | 'AGENCY';

export interface RegistrationInput {
  fullName: string;
  email: string;
  password: string;
  workspaceName: string;
  workspaceSlug: string;
  timezone: string;
  industry?: string;
  plan: RegistrationPlan;
}

export interface RegistrationResult {
  user: AuthenticatedUser;
  session: ActiveSession;
  rawToken: string;
  tenantSlug: string;
}

/** Default entitlement seeds per plan */
const PLAN_ENTITLEMENTS: Record<RegistrationPlan, Array<{ featureKey: string; enabled: boolean; limits: Record<string, unknown> }>> = {
  DIRECT_CLIENT: [
    { featureKey: FeatureKey.GBP,            enabled: true,  limits: { locations: 3 } },
    { featureKey: FeatureKey.WEBSITE,        enabled: true,  limits: { microsites: 1 } },
    { featureKey: FeatureKey.ANALYTICS,      enabled: true,  limits: {} },
    { featureKey: FeatureKey.RANK_TRACKING,  enabled: true,  limits: { keywords: 50 } },
    { featureKey: FeatureKey.OPPORTUNITIES,  enabled: true,  limits: {} },
    { featureKey: FeatureKey.CONTENT,        enabled: true,  limits: {} },
    { featureKey: FeatureKey.LISTINGS,       enabled: true,  limits: { providers: 5 } },
    { featureKey: FeatureKey.REPORTING,      enabled: true,  limits: {} },
    { featureKey: FeatureKey.MERCHANT,       enabled: false, limits: {} },
    { featureKey: FeatureKey.CALL_TRACKING,  enabled: false, limits: {} },
    { featureKey: FeatureKey.WHITELABEL,     enabled: false, limits: {} },
  ],
  AGENCY: [
    { featureKey: FeatureKey.GBP,            enabled: true,  limits: { locations: 25 } },
    { featureKey: FeatureKey.WEBSITE,        enabled: true,  limits: { microsites: 10 } },
    { featureKey: FeatureKey.ANALYTICS,      enabled: true,  limits: {} },
    { featureKey: FeatureKey.RANK_TRACKING,  enabled: true,  limits: { keywords: 200 } },
    { featureKey: FeatureKey.OPPORTUNITIES,  enabled: true,  limits: {} },
    { featureKey: FeatureKey.CONTENT,        enabled: true,  limits: {} },
    { featureKey: FeatureKey.LISTINGS,       enabled: true,  limits: { providers: 10 } },
    { featureKey: FeatureKey.REPORTING,      enabled: true,  limits: {} },
    { featureKey: FeatureKey.MERCHANT,       enabled: true,  limits: {} },
    { featureKey: FeatureKey.CALL_TRACKING,  enabled: true,  limits: {} },
    { featureKey: FeatureKey.WHITELABEL,     enabled: true,  limits: {} },
  ],
};

export class RegistrationService {
  /**
   * Validates a workspace slug for registration.
   * Returns the normalized slug or throws a validation error.
   */
  public static validateWorkspaceSlug(slug: string): string {
    const normalized = TenantService.validateSlug(slug);

    if (RESERVED_SLUGS.has(normalized)) {
      throw createValidationError(`"${normalized}" is a reserved workspace name and cannot be used`);
    }

    return normalized;
  }

  /**
   * Checks whether a slug is available for registration.
   * Returns `true` if available, `false` if taken or reserved.
   */
  public static async isSlugAvailable(slug: string): Promise<boolean> {
    let normalized: string;
    try {
      normalized = this.validateWorkspaceSlug(slug);
    } catch {
      return false;
    }

    const existing = await prisma.tenant.findUnique({
      where: { slug: normalized },
      select: { id: true },
    });

    return existing === null;
  }

  /**
   * Validates a full name for registration.
   */
  private static validateFullName(name: string): string {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed.length < 2) {
      throw createValidationError('Full name must be at least 2 characters');
    }
    if (trimmed.length > 100) {
      throw createValidationError('Full name must not exceed 100 characters');
    }
    return trimmed;
  }

  /**
   * Atomically registers a new user, creates their workspace (tenant),
   * seeds plan-based entitlements, and returns an active session.
   *
   * The entire operation runs inside a single Prisma interactive transaction
   * so any failure rolls back all created records.
   */
  public static async register(
    input: RegistrationInput,
    sessionMetadata: SessionMetadata
  ): Promise<RegistrationResult> {
    // ── Input validation (fail fast before any I/O) ──────────────────────────
    const fullName       = this.validateFullName(input.fullName);
    const normalizedEmail = normalizeEmail(input.email);
    const workspaceSlug  = this.validateWorkspaceSlug(input.workspaceSlug);
    const workspaceName  = (input.workspaceName || '').trim();

    if (!workspaceName || workspaceName.length < 2) {
      throw createValidationError('Workspace name must be at least 2 characters');
    }
    if (workspaceName.length > 100) {
      throw createValidationError('Workspace name must not exceed 100 characters');
    }

    // Password strength validated inside hashPassword
    const passwordHash = await PasswordService.hashPassword(input.password);

    // ── Pre-flight uniqueness checks (fast, outside transaction) ────────────
    const [emailExists, slugExists] = await Promise.all([
      prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
      prisma.tenant.findUnique({ where: { slug: workspaceSlug }, select: { id: true } }),
    ]);

    if (emailExists) {
      throw createConflictError('An account with this email address already exists');
    }
    if (slugExists) {
      throw createConflictError(`Workspace slug "${workspaceSlug}" is already taken`);
    }

    // ── Atomic transaction: user + credential + tenant + membership + entitlements + session ──
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          fullName,
          status: 'ACTIVE',
        },
      });

      // 2. Create password credential
      await tx.userCredential.create({
        data: {
          userId: user.id,
          passwordHash,
        },
      });

      // 3. Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: workspaceName,
          slug: workspaceSlug,
          timezone: input.timezone || 'UTC',
          contactEmail: normalizedEmail,
          industry: input.industry || null,
          plan: input.plan === 'AGENCY' ? 'AGENCY' : 'STANDARD',
          tenantType: input.plan === 'AGENCY' ? 'AGENCY' : 'DIRECT_CLIENT',
          status: 'ACTIVE',
          version: 1,
        },
      });

      // 4. Set tenant RLS context for tenant-scoped tables
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;

      // 5. Create owner membership
      const ownerRole = input.plan === 'AGENCY' ? Role.AGENCY_OWNER : Role.CLIENT_OWNER;
      await tx.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: ownerRole,
          scopeMode: 'ALL',
          status: 'ACTIVE',
        },
      });

      // 6. Seed plan-based entitlements
      const entitlements = PLAN_ENTITLEMENTS[input.plan];
      await tx.tenantEntitlement.createMany({
        data: entitlements.map((e) => ({
          tenantId: tenant.id,
          featureKey: e.featureKey,
          enabled: e.enabled,
          limits: e.limits,
          source: 'PLAN_DEFAULT',
        })),
        skipDuplicates: true,
      });

      // 7. Create a default Brand for the tenant
      await tx.brand.create({
        data: {
          tenantId: tenant.id,
          name: workspaceName,
          slug: workspaceSlug,
        },
      });

      // 8. Audit log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: user.id,
          actorRole: ownerRole,
          action: Action.TENANT_UPDATE,
          resourceType: 'Tenant',
          resourceId: tenant.id,
          newValues: { event: 'SELF_REGISTRATION', plan: input.plan, slug: tenant.slug },
          ipAddress: sessionMetadata.ipAddress || 'UNKNOWN',
          userAgent: sessionMetadata.userAgent || 'UNKNOWN',
        },
      });

      // 9. Create session (within transaction so it rolls back on failure)
      const { rawToken, session } = await SessionService.createSession(user.id, sessionMetadata, tx);

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName ?? '',
          status: user.status,
        } as AuthenticatedUser,
        session,
        rawToken,
        tenantSlug: tenant.slug,
      };
    });

    logger.info(
      { userId: result.user.id, tenantSlug: result.tenantSlug, plan: input.plan },
      'New self-service registration completed'
    );

    return result;
  }
}
