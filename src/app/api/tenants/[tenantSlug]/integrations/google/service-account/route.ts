import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { handleRouteError } from '@/shared/errors';
import { getGA4Client } from '@/shared/lib/google-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_CONNECT);

    const body = await request.json().catch(() => ({}));
    const { ga4PropertyId, gscSiteUrl, brandId } = body;

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Validate GA4 Property ID format (must be numeric)
    if (ga4PropertyId) {
      if (!/^\d+$/.test(String(ga4PropertyId).trim())) {
        return NextResponse.json(
          { error: `GA4 Property ID must contain only digits. Received: "${ga4PropertyId}"` },
          { status: 400 }
        );
      }

      // Validate that the property actually exists and is accessible via the service account
      try {
        const ga4Client = await getGA4Client();
        await ga4Client.properties.runReport({
          property: `properties/${ga4PropertyId}`,
          requestBody: {
            dateRanges: [{ startDate: 'today', endDate: 'today' }],
            dimensions: [{ name: 'date' }],
            metrics: [{ name: 'sessions' }],
            limit: '1',
          },
        });
      } catch (err: any) {
        const msg = err?.message || String(err);
        const isNotFound = msg.includes('404') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('permission');
        return NextResponse.json(
          {
            error: isNotFound
              ? `GA4 Property "${ga4PropertyId}" was not found or the service account does not have access. Please check the property ID and ensure the service account has been added as a Viewer in Google Analytics.`
              : `GA4 Property "${ga4PropertyId}" could not be verified: ${msg}`,
          },
          { status: 400 }
        );
      }
    }

    // Hardcoded service account email - should match your google-credentials.json client_email
    const serviceAccountEmail = 'localbi-data-fetcher@localbi-508918.iam.gserviceaccount.com';

    const result = await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      // 1. Create or ensure a mock connection exists for this service account
      const connection = await tx.integrationConnection.upsert({
        where: {
          uq_connection_provider_sub: {
            tenantId: tenant.id,
            provider: 'google',
            externalSubjectId: 'service-account'
          }
        },
        update: {
          lastUsedAt: new Date(),
          status: 'ACTIVE',
          encryptedRefreshToken: 'service-account-mock-token',
          grantedScopes: [
            'service-account',
            'https://www.googleapis.com/auth/business.manage',
            'https://www.googleapis.com/auth/webmasters.readonly'
          ]
        },
        create: {
          tenantId: tenant.id,
          provider: 'google',
          externalSubjectId: 'service-account',
          externalEmail: serviceAccountEmail,
          encryptedRefreshToken: 'service-account-mock-token',
          tokenKeyVersion: 1,
          grantedScopes: [
            'service-account',
            'https://www.googleapis.com/auth/business.manage',
            'https://www.googleapis.com/auth/webmasters.readonly'
          ]
        }
      });

      // We must also create an ExternalAccount because externalResources require an account link
      const externalAccount = await tx.externalAccount.upsert({
        where: {
          uq_external_account_provider_id: {
            tenantId: tenant.id,
            provider: 'google',
            externalAccountId: 'service-account'
          }
        },
        update: {
          accountName: serviceAccountEmail
        },
        create: {
          tenantId: tenant.id,
          connectionId: connection.id,
          externalAccountId: 'service-account',
          provider: 'google',
          accountName: serviceAccountEmail
        }
      });

      // 2. Map GA4 Property to the first Location of the brand
      if (ga4PropertyId) {
        // Find a location to map to
        const location = await tx.location.findFirst({
          where: { tenantId: tenant.id, brandId }
        });

        if (location) {
          // Remove any previously registered GA4 resources for this tenant
          // so that re-submitting with a new property ID replaces the old one
          const oldGa4Resources = await tx.externalResource.findMany({
            where: { tenantId: tenant.id, provider: 'GOOGLE_ANALYTICS_4' },
            include: { internalMappings: true }
          });
          for (const old of oldGa4Resources) {
            await tx.internalResourceMapping.deleteMany({ where: { tenantId: tenant.id, resourceId: old.id } });
            await tx.connectionResourceAccess.deleteMany({ where: { resourceId: old.id } });
            await tx.externalResource.delete({ where: { id: old.id } });
          }

          const ga4Resource = await tx.externalResource.create({
            data: {
              tenantId: tenant.id,
              provider: 'GOOGLE_ANALYTICS_4',
              externalResourceId: ga4PropertyId,
              resourceType: 'PROPERTY',
              resourceName: `GA4 Property: ${ga4PropertyId}`,
              accountId: externalAccount.id
            }
          });

          await tx.internalResourceMapping.upsert({
            where: {
              uq_internal_resource_mapping: {
                tenantId: tenant.id,
                internalType: 'LOCATION',
                internalId: location.id,
                resourceId: ga4Resource.id
              }
            },
            update: {},
            create: {
              tenantId: tenant.id,
              internalType: 'LOCATION',
              internalId: location.id,
              resourceId: ga4Resource.id
            }
          });
        }
      }


      // 3. Map GSC URL to the Brand
      if (gscSiteUrl) {
        const gscResource = await tx.externalResource.upsert({
          where: {
            uq_external_resource_provider_id: {
              tenantId: tenant.id,
              provider: 'GOOGLE_SEARCH_CONSOLE',
              externalResourceId: gscSiteUrl
            }
          },
          update: {
            resourceName: gscSiteUrl,
            accountId: externalAccount.id
          },
          create: {
            tenantId: tenant.id,
            provider: 'GOOGLE_SEARCH_CONSOLE',
            externalResourceId: gscSiteUrl,
            resourceType: 'PROPERTY',
            resourceName: gscSiteUrl,
            accountId: externalAccount.id
          }
        });

        await tx.internalResourceMapping.upsert({
          where: {
            uq_internal_resource_mapping: {
              tenantId: tenant.id,
              internalType: 'BRAND',
              internalId: brandId,
              resourceId: gscResource.id
            }
          },
          update: {},
          create: {
            tenantId: tenant.id,
            internalType: 'BRAND',
            internalId: brandId,
            resourceId: gscResource.id
          }
        });

        const propertyType = gscSiteUrl.startsWith('sc-domain:') ? 'DOMAIN' : 'URL_PREFIX';
        await tx.gscProperty.upsert({
          where: {
            uq_gsc_property_url: {
              tenantId: tenant.id,
              propertyUrl: gscSiteUrl
            }
          },
          update: {
            resourceId: gscResource.id,
            propertyType
          },
          create: {
            tenantId: tenant.id,
            resourceId: gscResource.id,
            propertyUrl: gscSiteUrl,
            propertyType
          }
        });
      }

      return { success: true, connectionId: connection.id };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
