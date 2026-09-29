import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { GoogleApiClient, DiscoveredResourceAccount, DiscoveredResourceItem } from './google/google-api-client';
import { GoogleOAuthService } from './google/google-oauth-service';
import { createResourceNotFoundError } from '@/shared/errors';
import { logger } from '@/shared/observability/logger';

export class ResourceDiscoveryService {
  /**
   * Discovers and synchronizes external Google resources (GBP Locations & GSC Properties)
   * into the tenant's data plane (external_accounts, external_resources, connection_resource_access).
   */
  public static async discoverAndSyncResources(
    tenantId: string,
    connectionId: string,
  ) {
    // 1. Fetch connection inside tenant context
    const connection = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.integrationConnection.findUnique({
        where: {
          uq_connection_tenant_id: {
            tenantId,
            id: connectionId,
          },
        },
      });
    });

    if (!connection || connection.status !== 'ACTIVE') {
      throw createResourceNotFoundError('IntegrationConnection', connectionId);
    }

    logger.info({ tenantId, connectionId, email: connection.externalEmail }, '[Discovery] Starting resource discovery - fetching Google access token');

    // 2. Refresh or obtain access token using encrypted refresh token
    const accessToken = await GoogleOAuthService.refreshAccessToken(
      connection.encryptedRefreshToken,
      tenantId,
      connection.id
    );

    logger.info({ tenantId }, '[Discovery] Access token obtained successfully');

    // 3. Discover GBP Accounts and Locations
    let gbpAccounts: DiscoveredResourceAccount[] = [];
    try {
      gbpAccounts = await GoogleApiClient.discoverGbpResources(accessToken);
      logger.info({ tenantId, accountsFound: gbpAccounts.length, locations: gbpAccounts.map(a => ({ account: a.externalAccountId, locations: a.resources.map(r => r.resourceName) })) }, '[Discovery] GBP discovery result');
    } catch (err: unknown) {
      logger.warn({ err }, '[Discovery] Failed to discover GBP resources, continuing with GSC');
    }

    // 4. Discover GSC Properties
    let gscSites: DiscoveredResourceItem[] = [];
    try {
      gscSites = await GoogleApiClient.discoverGscResources(accessToken);
    } catch (err: unknown) {
      logger.warn({ err }, "Failed to discover GSC resources");
    }

    if (gbpAccounts.length === 0 && gscSites.length === 0) {
      logger.info({ tenantId, connectionId }, "No resources discovered from either GBP or GSC");
    }

    // 5. Persist into tenant data plane in a single transaction
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Persist GBP Accounts and Locations
      for (const acc of gbpAccounts) {
        const externalAccount = await tx.externalAccount.upsert({
          where: {
            uq_external_account_provider_id: {
              tenantId,
              provider: acc.provider,
              externalAccountId: acc.externalAccountId,
            },
          },
          create: {
            tenantId,
            connectionId: connection.id,
            provider: acc.provider,
            externalAccountId: acc.externalAccountId,
            accountName: acc.accountName,
          },
          update: {
            connectionId: connection.id,
            accountName: acc.accountName,
          },
        });

        for (const loc of acc.resources) {
          const resource = await tx.externalResource.upsert({
            where: {
              uq_external_resource_provider_id: {
                tenantId,
                provider: acc.provider,
                externalResourceId: loc.externalResourceId,
              },
            },
            create: {
              tenantId,
              accountId: externalAccount.id,
              provider: acc.provider,
              externalResourceId: loc.externalResourceId,
              resourceType: loc.resourceType,
              resourceName: loc.resourceName,
            },
            update: {
              accountId: externalAccount.id,
              resourceName: loc.resourceName,
            },
          });

          await tx.connectionResourceAccess.upsert({
            where: {
              uq_connection_resource_access: {
                tenantId,
                connectionId: connection.id,
                resourceId: resource.id,
              },
            },
            create: {
              tenantId,
              connectionId: connection.id,
              resourceId: resource.id,
              canAccess: true,
              lastVerifiedAt: new Date(),
            },
            update: {
              canAccess: true,
              lastVerifiedAt: new Date(),
            },
          });
        }
      }

      // Persist GSC Properties (under a virtual GSC account)
      if (gscSites.length > 0) {
        const gscAccount = await tx.externalAccount.upsert({
          where: {
            uq_external_account_provider_id: {
              tenantId,
              provider: 'GOOGLE_SEARCH_CONSOLE',
              externalAccountId: 'gsc_account_default',
            },
          },
          create: {
            tenantId,
            connectionId: connection.id,
            provider: 'GOOGLE_SEARCH_CONSOLE',
            externalAccountId: 'gsc_account_default',
            accountName: 'Google Search Console',
          },
          update: {
            connectionId: connection.id,
          },
        });

        for (const site of gscSites) {
          const resource = await tx.externalResource.upsert({
            where: {
              uq_external_resource_provider_id: {
                tenantId,
                provider: 'GOOGLE_SEARCH_CONSOLE',
                externalResourceId: site.externalResourceId,
              },
            },
            create: {
              tenantId,
              accountId: gscAccount.id,
              provider: 'GOOGLE_SEARCH_CONSOLE',
              externalResourceId: site.externalResourceId,
              resourceType: site.resourceType,
              resourceName: site.resourceName,
            },
            update: {
              accountId: gscAccount.id,
              resourceName: site.resourceName,
            },
          });

          await tx.connectionResourceAccess.upsert({
            where: {
              uq_connection_resource_access: {
                tenantId,
                connectionId: connection.id,
                resourceId: resource.id,
              },
            },
            create: {
              tenantId,
              connectionId: connection.id,
              resourceId: resource.id,
              canAccess: site.verified ?? true,
              lastVerifiedAt: new Date(),
            },
            update: {
              canAccess: site.verified ?? true,
              lastVerifiedAt: new Date(),
            },
          });
        }
      }
    });

    logger.info({ tenantId, connectionId }, 'Resource discovery completed successfully');
    return {
      gbpAccountsCount: gbpAccounts.length,
      gbpLocationsCount: gbpAccounts.reduce(
        (sum: number, a: DiscoveredResourceAccount) => sum + a.resources.length,
        0
      ),
      gscPropertiesCount: gscSites.length,
    };
  }
}
