import crypto from 'crypto';
import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
} from '../../shared/authorization/policy';
import {
  createValidationError,
  createConflictError,
  createResourceNotFoundError,
  createTenantAccessDeniedError,
} from '../../shared/errors';
import { logger } from '../../shared/observability/logger';
import { PortalDomainDto } from './agency-types';
import { DnsVerifier, DnsRecordLookup } from '../domains/dns-verifier';

export interface VerifyPortalDomainOptions {
  simulatedVerification?: boolean;
  dnsLookup?: DnsRecordLookup;
  timeoutMs?: number;
}

export class PortalDomainService {
  /**
   * Sanitizes and validates custom hostname format.
   */
  public static sanitizeHostname(raw: string): string {
    if (!raw || typeof raw !== 'string') {
      throw createValidationError('Invalid domain hostname format: empty');
    }
    const segment = raw
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0];
    const cleaned = (segment ? segment.split(':')[0] : '') || '';

    const hostRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (!cleaned || !hostRegex.test(cleaned)) {
      throw createValidationError(`Invalid domain hostname format: "${raw}"`);
    }

    return cleaned;
  }

  /**
   * Registers a custom portal domain for an agency tenant.
   */
  public static async registerPortalDomain(
    tenantId: string,
    rawHostname: string,
    context: AuthorizedContext
  ): Promise<PortalDomainDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.PORTAL_DOMAIN_MANAGE);

    const hostname = this.sanitizeHostname(rawHostname);

    // Global uniqueness check: Domain cannot be claimed if already registered
    const existing = await prisma.portalDomain.findUnique({
      where: { hostname },
    });

    if (existing) {
      if (existing.tenantId === tenantId) {
        throw createConflictError(`Domain "${hostname}" is already registered to your workspace.`);
      }
      throw createConflictError(`Domain "${hostname}" is already in use by another workspace.`);
    }

    const verificationToken = `localbi-verify-${crypto.randomBytes(24).toString('hex')}`;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      let domain;
      try {
        domain = await tx.portalDomain.create({
          data: {
            tenantId,
            hostname,
            status: 'PENDING',
            verificationToken,
            sslStatus: 'PENDING',
          },
        });
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        if (error.code === 'P2002' || (error.message && error.message.includes('Unique constraint'))) {
          throw createConflictError(`Domain "${hostname}" is already in use by another workspace.`);
        }
        throw err;
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'portal_domain:create',
          resourceType: 'PortalDomain',
          resourceId: domain.id,
          newValues: { hostname },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, domainId: domain.id, hostname }, 'Portal domain registered');

      return {
        id: domain.id,
        tenantId: domain.tenantId,
        hostname: domain.hostname,
        status: domain.status as 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'FAILED',
        verificationToken: domain.verificationToken,
        sslStatus: domain.sslStatus as 'PENDING' | 'ACTIVE' | 'FAILED',
        verifiedAt: domain.verifiedAt,
        createdAt: domain.createdAt,
        updatedAt: domain.updatedAt,
      };
    });
  }

  /**
   * Verifies custom domain ownership and activates SSL.
   */
  public static async verifyPortalDomain(
    tenantId: string,
    domainId: string,
    context: AuthorizedContext,
    optionsOrSimulated: boolean | VerifyPortalDomainOptions = true
  ): Promise<PortalDomainDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.PORTAL_DOMAIN_MANAGE);

    const isProduction =
      process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

    let simulated = false;
    let dnsLookup: DnsRecordLookup | undefined;
    let timeoutMs: number | undefined;

    if (typeof optionsOrSimulated === 'boolean') {
      simulated = optionsOrSimulated;
    } else if (optionsOrSimulated) {
      simulated = optionsOrSimulated.simulatedVerification ?? false;
      dnsLookup = optionsOrSimulated.dnsLookup;
      timeoutMs = optionsOrSimulated.timeoutMs;
    } else {
      simulated = process.env.NODE_ENV === 'test';
    }

    // MANDATORY SECURITY RULE: A development bypass CANNOT mark a production domain verified.
    if (isProduction && simulated) {
      throw createValidationError('Development verification bypass cannot be used in production.');
    }
    if (isProduction) {
      simulated = false;
    }

    let failureError: Error | null = null;

    const result = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const domain = await tx.portalDomain.findUnique({
        where: { uq_portal_domain_tenant_id: { tenantId, id: domainId } },
      });

      if (!domain) {
        throw createResourceNotFoundError('PortalDomain', domainId);
      }

      // Explicit state machine transition: PENDING/FAILED -> VERIFYING
      await tx.portalDomain.update({
        where: { uq_portal_domain_tenant_id: { tenantId, id: domainId } },
        data: { status: 'VERIFYING' },
      });

      if (!simulated) {
        const verificationResult = await DnsVerifier.verifyPortalDomain(
          domain.hostname,
          domain.verificationToken,
          { dnsLookup, timeoutMs }
        );

        if (!verificationResult.verified) {
          // Explicit state machine transition: VERIFYING -> FAILED
          // Requirement: Do not mark SSL failed merely because a DNS ownership check failed.
          const failed = await tx.portalDomain.update({
            where: { uq_portal_domain_tenant_id: { tenantId, id: domainId } },
            data: {
              status: 'FAILED',
              // sslStatus remains unchanged (PENDING)
            },
          });

          await tx.auditLog.create({
            data: {
              tenantId,
              actorId: context.userId,
              actorRole: context.role,
              action: 'portal_domain:verify_failed',
              resourceType: 'PortalDomain',
              resourceId: domainId,
              newValues: {
                hostname: domain.hostname,
                status: 'FAILED',
                reason: verificationResult.reason,
              },
              ipAddress: 'INTERNAL',
              userAgent: 'INTERNAL',
            },
          });

          logger.warn(
            { tenantId, domainId, hostname: domain.hostname, reason: verificationResult.reason },
            'Portal domain verification failed'
          );

          failureError = createValidationError(
            verificationResult.details
              ? `DNS verification failed (${verificationResult.reason}): ${verificationResult.details}`
              : `DNS verification failed (${verificationResult.reason}): ownership record not found.`
          );

          return {
            id: failed.id,
            tenantId: failed.tenantId,
            hostname: failed.hostname,
            status: 'FAILED' as const,
            verificationToken: failed.verificationToken,
            sslStatus: failed.sslStatus as 'PENDING' | 'ACTIVE' | 'FAILED',
            verifiedAt: failed.verifiedAt,
            createdAt: failed.createdAt,
            updatedAt: failed.updatedAt,
          };
        }
      }

      // Explicit state machine transition: VERIFYING -> ACTIVE
      // Requirement: DNS ownership verification and TLS certificate provisioning must have distinct meanings.
      // Successful DNS proof establishes ownership verification, but keeps SSL pending until the certificate provider confirms readiness.
      const verified = await tx.portalDomain.update({
        where: { uq_portal_domain_tenant_id: { tenantId, id: domainId } },
        data: {
          status: 'ACTIVE',
          // sslStatus remains domain.sslStatus ('PENDING') until explicit provider issuance
          verifiedAt: new Date(),
        },
      });

      // Link to tenant's white_label_configs
      await tx.whiteLabelConfig.upsert({
        where: { tenantId },
        create: {
          tenantId,
          portalDomainId: verified.id,
        },
        update: {
          portalDomainId: verified.id,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'portal_domain:verify',
          resourceType: 'PortalDomain',
          resourceId: domainId,
          newValues: { hostname: domain.hostname, status: 'ACTIVE' },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, domainId, hostname: domain.hostname }, 'Portal domain verified and activated');

      return {
        id: verified.id,
        tenantId: verified.tenantId,
        hostname: verified.hostname,
        status: verified.status as 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'FAILED',
        verificationToken: verified.verificationToken,
        sslStatus: verified.sslStatus as 'PENDING' | 'ACTIVE' | 'FAILED',
        verifiedAt: verified.verifiedAt,
        createdAt: verified.createdAt,
        updatedAt: verified.updatedAt,
      };
    });

    if (failureError) {
      throw failureError;
    }

    return result as PortalDomainDto;
  }

  /**
   * Removes a portal domain.
   */
  public static async removePortalDomain(
    tenantId: string,
    domainId: string,
    context: AuthorizedContext
  ): Promise<void> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.PORTAL_DOMAIN_MANAGE);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const domain = await tx.portalDomain.findUnique({
        where: { uq_portal_domain_tenant_id: { tenantId, id: domainId } },
      });

      if (!domain) {
        throw createResourceNotFoundError('PortalDomain', domainId);
      }

      // Unlink from whiteLabelConfig
      await tx.whiteLabelConfig.updateMany({
        where: { tenantId, portalDomainId: domainId },
        data: { portalDomainId: null },
      });

      await tx.portalDomain.delete({
        where: { uq_portal_domain_tenant_id: { tenantId, id: domainId } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'portal_domain:delete',
          resourceType: 'PortalDomain',
          resourceId: domainId,
          newValues: { hostname: domain.hostname },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, domainId, hostname: domain.hostname }, 'Portal domain removed');
    });
  }

  /**
   * Updates SSL certificate provisioning status.
   * Invoked when an edge certificate provider confirms certificate issuance or failure.
   */
  public static async updateSslStatus(
    tenantId: string,
    domainId: string,
    sslStatus: 'PENDING' | 'ACTIVE' | 'FAILED',
    context: AuthorizedContext
  ): Promise<PortalDomainDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.PORTAL_DOMAIN_MANAGE);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const domain = await tx.portalDomain.findUnique({
        where: { uq_portal_domain_tenant_id: { tenantId, id: domainId } },
      });

      if (!domain) {
        throw createResourceNotFoundError('PortalDomain', domainId);
      }

      const updated = await tx.portalDomain.update({
        where: { uq_portal_domain_tenant_id: { tenantId, id: domainId } },
        data: { sslStatus },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'portal_domain:ssl_status_update',
          resourceType: 'PortalDomain',
          resourceId: domainId,
          newValues: { hostname: domain.hostname, sslStatus },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, domainId, hostname: domain.hostname, sslStatus }, 'Portal domain SSL status updated');

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        hostname: updated.hostname,
        status: updated.status as 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'FAILED',
        verificationToken: updated.verificationToken,
        sslStatus: updated.sslStatus as 'PENDING' | 'ACTIVE' | 'FAILED',
        verifiedAt: updated.verifiedAt,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    });
  }
}
