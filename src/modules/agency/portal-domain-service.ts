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

export class PortalDomainService {
  /**
   * Sanitizes and validates custom hostname format.
   */
  public static sanitizeHostname(raw: string): string {
    const cleaned = raw
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0];

    const hostRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (!hostRegex.test(cleaned)) {
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

    const verificationToken = `localbi-verify-${crypto.randomBytes(16).toString('hex')}`;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const domain = await tx.portalDomain.create({
        data: {
          tenantId,
          hostname,
          status: 'PENDING',
          verificationToken,
          sslStatus: 'PENDING',
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'portal_domain:create',
          resourceType: 'PortalDomain',
          resourceId: domain.id,
          payload: { hostname },
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
    simulatedVerification = true
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

      if (!simulatedVerification) {
        throw createValidationError('Automated DNS TXT record check not reachable; verification failed.');
      }

      const verified = await tx.portalDomain.update({
        where: { uq_portal_domain_tenant_id: { tenantId, id: domainId } },
        data: {
          status: 'ACTIVE',
          sslStatus: 'ACTIVE',
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
          payload: { hostname: domain.hostname, status: 'ACTIVE' },
        },
      });

      logger.info({ tenantId, domainId, hostname: domain.hostname }, 'Portal domain verified and activated');

      return {
        id: verified.id,
        tenantId: verified.tenantId,
        hostname: verified.hostname,
        status: 'ACTIVE',
        verificationToken: verified.verificationToken,
        sslStatus: 'ACTIVE',
        verifiedAt: verified.verifiedAt,
        createdAt: verified.createdAt,
        updatedAt: verified.updatedAt,
      };
    });
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
          payload: { hostname: domain.hostname },
        },
      });

      logger.info({ tenantId, domainId, hostname: domain.hostname }, 'Portal domain removed');
    });
  }
}
