import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { handleRouteError } from '@/shared/errors';

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
          status: 'ACTIVE'
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
          const ga4Resource = await tx.externalResource.upsert({
            where: {
              uq_external_resource_provider_id: {
                tenantId: tenant.id,
                provider: 'GOOGLE_BUSINESS_PROFILE',
                externalResourceId: ga4PropertyId
              }
            },
            update: {
              resourceName: `GA4 Property: ${ga4PropertyId}`,
              accountId: externalAccount.id
            },
            create: {
              tenantId: tenant.id,
              provider: 'GOOGLE_BUSINESS_PROFILE',
              externalResourceId: ga4PropertyId,
              resourceType: 'LOCATION',
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
