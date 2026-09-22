import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SessionCookieManager } from "@/modules/auth/cookies";
import { ContextResolver } from "@/modules/auth/context-resolver";
import { Action, AuthorizationService } from "@/shared/authorization/policy";
import { ResourceDiscoveryService } from "@/modules/integrations/resource-discovery-service";
import { ResourceMappingService } from "@/modules/integrations/resource-mapping-service";
import { prisma } from "@/shared/database/client";
import { TenantContextService } from "@/shared/database/tenant-context";
import {
  handleRouteError,
  createResourceNotFoundError,
  createValidationError,
} from "@/shared/errors";
import { GoogleApiClient } from "@/modules/integrations/google/google-api-client";
import { GoogleOAuthService } from "@/modules/integrations/google/google-oauth-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } =
      await ContextResolver.resolveTenantContext(token, tenantSlug);

    if (!tenant || !authorizedContext) {
      return NextResponse.json(
        { error: "Tenant context not found" },
        { status: 404 },
      );
    }

    AuthorizationService.assertCan(authorizedContext, Action.TENANT_VIEW);

    const data = await TenantContextService.withTenantContext(
      prisma,
      tenant.id,
      async (tx) => {
        const accounts = await tx.externalAccount.findMany({
          where: { tenantId: tenant.id },
          include: {
            resources: {
              where: { tenantId: tenant.id },
            include: {
              internalMappings: {
                where: { tenantId: tenant.id },
              },
              connectionAccess: {
                where: { tenantId: tenant.id },
              },
            },
            },
          },
        });

        return accounts;
      },
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } =
      await ContextResolver.resolveTenantContext(token, tenantSlug);

    if (!tenant || !authorizedContext) {
      return NextResponse.json(
        { error: "Tenant context not found" },
        { status: 404 },
      );
    }

    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_MAP);

    const body = await request.json().catch(() => ({}));
    const connectionId = body.connectionId as string | undefined;

    // Resolve connection
    const connection = await TenantContextService.withTenantContext(
      prisma,
      tenant.id,
      async (tx) => {
        return connectionId
          ? tx.integrationConnection.findUnique({
              where: {
                uq_connection_tenant_id: {
                  tenantId: tenant.id,
                  id: connectionId,
                },
              },
            })
          : tx.integrationConnection.findFirst({
              where: { tenantId: tenant.id, status: "ACTIVE" },
            });
      },
    );

    if (!connection) {
      throw createResourceNotFoundError(
        "IntegrationConnection",
        connectionId || "active",
      );
    }

    // Support manual website URL registration for Google Search Console
    if (body.action === "ADD_MANUAL_PROPERTY" || body.siteUrl) {
      const rawUrl = String(body.siteUrl || "").trim();
      if (!rawUrl) {
        throw createValidationError("Website URL is required.");
      }

      let normalizedUrl = rawUrl;
      if (
        !normalizedUrl.startsWith("sc-domain:") &&
        !normalizedUrl.startsWith("http://") &&
        !normalizedUrl.startsWith("https://")
      ) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      if (
        normalizedUrl.startsWith("http://") ||
        normalizedUrl.startsWith("https://")
      ) {
        try {
          const parsed = new URL(normalizedUrl);
          normalizedUrl = parsed.href;
        } catch {
          throw createValidationError("Invalid website URL format.");
        }
      }

      let isVerified = false;

      if (connection && connection.encryptedRefreshToken) {
        try {
          const accessToken = await GoogleOAuthService.refreshAccessToken(
            connection.encryptedRefreshToken,
            tenant.id,
            connection.id
          );

          const gscSites = await GoogleApiClient.discoverGscResources(
            accessToken,
            tenantSlug,
          );

          let hostname = "";
          if (normalizedUrl.startsWith("sc-domain:")) {
            hostname = normalizedUrl.replace("sc-domain:", "");
          } else {
            hostname = new URL(normalizedUrl).hostname;
          }

          // Strip 'www.' for a more robust match if it's a domain
          const baseHostname = hostname.replace(/^www\./, "");

          const isVerifiedMatch = gscSites.some((s) => {
            const resId = s.externalResourceId.toLowerCase();
            return (
              resId === normalizedUrl.toLowerCase() ||
              resId.includes(hostname.toLowerCase()) ||
              resId.includes(baseHostname.toLowerCase())
            );
          });
          
          isVerified = isVerifiedMatch;

          // Write debug info to a file we can inspect
          const fs = require('fs');
          fs.writeFileSync('gsc-debug.log', JSON.stringify({
            timestamp: new Date().toISOString(),
            normalizedUrl,
            hostname,
            baseHostname,
            gscSitesFound: gscSites.map(s => s.externalResourceId),
            isVerifiedMatch
          }, null, 2) + '\n', { flag: 'a' });

        } catch (error: any) {
          const fs = require('fs');
          fs.writeFileSync('gsc-debug.log', JSON.stringify({
            timestamp: new Date().toISOString(),
            error: error.message || String(error),
            stack: error.stack
          }, null, 2) + '\n', { flag: 'a' });
          
          console.error("GSC Verification Error:", error);
          isVerified = false;
        }
      }

      const brandId = body.brandId as string | undefined;

      const resource = await TenantContextService.withTenantContext(
        prisma,
        tenant.id,
        async (tx) => {
          // Upsert GSC external account
          const gscAccount = await tx.externalAccount.upsert({
            where: {
              uq_external_account_provider_id: {
                tenantId: tenant.id,
                provider: "GOOGLE_SEARCH_CONSOLE",
                externalAccountId: "gsc_account_default",
              },
            },
            create: {
              tenantId: tenant.id,
              connectionId: connection.id,
              provider: "GOOGLE_SEARCH_CONSOLE",
              externalAccountId: "gsc_account_default",
              accountName: "Google Search Console",
            },
            update: {
              connectionId: connection.id,
            },
          });

          // Upsert ExternalResource
          const extRes = await tx.externalResource.upsert({
            where: {
              uq_external_resource_provider_id: {
                tenantId: tenant.id,
                provider: "GOOGLE_SEARCH_CONSOLE",
                externalResourceId: normalizedUrl,
              },
            },
            create: {
              tenantId: tenant.id,
              accountId: gscAccount.id,
              provider: "GOOGLE_SEARCH_CONSOLE",
              externalResourceId: normalizedUrl,
              resourceType: "PROPERTY",
              resourceName: normalizedUrl,
            },
            update: {
              accountId: gscAccount.id,
              resourceName: normalizedUrl,
            },
          });

          // Grant access
          await tx.connectionResourceAccess.upsert({
            where: {
              uq_connection_resource_access: {
                tenantId: tenant.id,
                connectionId: connection.id,
                resourceId: extRes.id,
              },
            },
            create: {
              tenantId: tenant.id,
              connectionId: connection.id,
              resourceId: extRes.id,
              canAccess: isVerified,
              lastVerifiedAt: new Date(),
            },
            update: {
              canAccess: isVerified,
              lastVerifiedAt: new Date(),
            },
          });

          return extRes;
        },
      );

      // If brandId is provided, map it to the brand immediately
      let mappingResult = null;
      if (brandId) {
        mappingResult = await ResourceMappingService.mapGscProperty(
          tenant.id,
          brandId,
          resource.id,
          authorizedContext,
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          resource,
          mapping: mappingResult,
        },
      });
    }

    const result = await ResourceDiscoveryService.discoverAndSyncResources(
      tenant.id,
      connection.id,
      tenant.slug,
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: "Tenant context not found" }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_MAP);

    const searchParams = request.nextUrl.searchParams;
    const resourceId = searchParams.get("resourceId");

    if (!resourceId) {
      throw createValidationError("Missing resourceId query parameter");
    }

    await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      const extRes = await tx.externalResource.findUnique({
        where: { id: resourceId },
        include: { internalMappings: true }
      });

      if (!extRes || extRes.tenantId !== tenant.id) {
        throw createResourceNotFoundError("ExternalResource", resourceId);
      }

      // Do not allow deleting resources that are actively mapped
      if (extRes.internalMappings.length > 0) {
        throw createValidationError("Cannot delete a resource that is currently mapped to a brand.");
      }

      await tx.externalResource.delete({
        where: { id: resourceId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
