import { Prisma } from '@prisma/client';
import { AppError, createResourceNotFoundError } from '@/shared/errors';

export interface ResolvedGoogleConnection {
  connectionId: string;
  encryptedRefreshToken: string;
  externalEmail: string;
  externalSubjectId: string;
  grantedScopes: string[];
  externalResourceId: string;
}

/**
 * Service to deterministically resolve the authorized Google OAuth connection
 * for a specific mapped LocalBI location or external resource.
 *
 * CRITICAL SAAS INVARIANT:
 * Never use `tx.integrationConnection.findFirst({ where: { tenantId } })`!
 * In a multi-brand / multi-connection environment, each brand or location may be serviced
 * by different Google identities. Connection lookup must always traverse:
 * Location -> InternalResourceMapping -> ExternalResource -> ConnectionResourceAccess / Account -> IntegrationConnection.
 */
export class GoogleConnectionResolver {
  /**
   * Resolves the active Google connection for an internal Location ID.
   */
  public static async resolveForLocation(
    tx: Prisma.TransactionClient,
    tenantId: string,
    locationId: string
  ): Promise<ResolvedGoogleConnection> {
    const mapping = await tx.internalResourceMapping.findFirst({
      where: {
        tenantId,
        internalType: 'LOCATION',
        internalId: locationId,
        resource: {
          provider: 'GOOGLE_BUSINESS_PROFILE',
        },
      },
      include: {
        resource: {
          include: {
            account: {
              include: {
                connection: true,
              },
            },
            connectionAccess: {
              where: {
                tenantId,
                canAccess: true,
              },
              include: {
                connection: true,
              },
            },
          },
        },
      },
    });

    if (!mapping || !mapping.resource) {
      throw createResourceNotFoundError(
        'InternalResourceMapping',
        `Location "${locationId}" is not mapped to any Google Business Profile location.`
      );
    }

    const resource = mapping.resource;

    // 1. Try finding an ACTIVE connection from connectionAccess join records
    const accessibleRecord = resource.connectionAccess.find(
      (ca) => ca.connection && ca.connection.status === 'ACTIVE' && ca.canAccess
    );

    if (accessibleRecord && accessibleRecord.connection) {
      return {
        connectionId: accessibleRecord.connection.id,
        encryptedRefreshToken: accessibleRecord.connection.encryptedRefreshToken,
        externalEmail: accessibleRecord.connection.externalEmail,
        externalSubjectId: accessibleRecord.connection.externalSubjectId,
        grantedScopes: accessibleRecord.connection.grantedScopes,
        externalResourceId: resource.externalResourceId,
      };
    }

    // 2. Fall back to parent account's connection if active
    if (resource.account?.connection && resource.account.connection.status === 'ACTIVE') {
      return {
        connectionId: resource.account.connection.id,
        encryptedRefreshToken: resource.account.connection.encryptedRefreshToken,
        externalEmail: resource.account.connection.externalEmail,
        externalSubjectId: resource.account.connection.externalSubjectId,
        grantedScopes: resource.account.connection.grantedScopes,
        externalResourceId: resource.externalResourceId,
      };
    }

    // If connection exists but is REVOKED or EXPIRED
    const anyConn = accessibleRecord?.connection || resource.account?.connection;
    if (anyConn) {
      throw new AppError({
        code: 'GBP_CONNECTION_REVOKED',
        message: `The Google connection (${anyConn.externalEmail}) for this location is ${anyConn.status.toLowerCase()}. Please re-authenticate.`,
        statusCode: 403,
        isOperational: true,
      });
    }

    throw new AppError({
      code: 'GBP_NOT_CONFIGURED',
      message: 'No active Google connection is authorized to access this Google Business Profile location.',
      statusCode: 403,
      isOperational: true,
    });
  }

  /**
   * Resolves the active Google connection for an external resource ID.
   */
  public static async resolveForResource(
    tx: Prisma.TransactionClient,
    tenantId: string,
    resourceId: string
  ): Promise<ResolvedGoogleConnection> {
    const resource = await tx.externalResource.findUnique({
      where: {
        uq_external_resource_tenant_id: {
          tenantId,
          id: resourceId,
        },
      },
      include: {
        account: {
          include: {
            connection: true,
          },
        },
        connectionAccess: {
          where: {
            tenantId,
            canAccess: true,
          },
          include: {
            connection: true,
          },
        },
      },
    });

    if (!resource) {
      throw createResourceNotFoundError('ExternalResource', resourceId);
    }

    const accessibleRecord = resource.connectionAccess.find(
      (ca) => ca.connection && ca.connection.status === 'ACTIVE' && ca.canAccess
    );

    if (accessibleRecord && accessibleRecord.connection) {
      return {
        connectionId: accessibleRecord.connection.id,
        encryptedRefreshToken: accessibleRecord.connection.encryptedRefreshToken,
        externalEmail: accessibleRecord.connection.externalEmail,
        externalSubjectId: accessibleRecord.connection.externalSubjectId,
        grantedScopes: accessibleRecord.connection.grantedScopes,
        externalResourceId: resource.externalResourceId,
      };
    }

    if (resource.account?.connection && resource.account.connection.status === 'ACTIVE') {
      return {
        connectionId: resource.account.connection.id,
        encryptedRefreshToken: resource.account.connection.encryptedRefreshToken,
        externalEmail: resource.account.connection.externalEmail,
        externalSubjectId: resource.account.connection.externalSubjectId,
        grantedScopes: resource.account.connection.grantedScopes,
        externalResourceId: resource.externalResourceId,
      };
    }

    throw new AppError({
      code: 'GBP_CONNECTION_REVOKED',
      message: 'No active Google connection found for this resource.',
      statusCode: 403,
      isOperational: true,
    });
  }
}
