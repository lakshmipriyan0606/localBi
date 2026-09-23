/**
 * TEMPORARY DEBUG ENDPOINT — DELETE AFTER DEBUGGING
 * GET /api/tenants/[tenantSlug]/integrations/google/debug-gbp
 *
 * Returns the raw Google API responses for accounts and locations
 * so we can diagnose why GBP locations are not being discovered.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SessionCookieManager } from "@/modules/auth/cookies";
import { ContextResolver } from "@/modules/auth/context-resolver";
import { prisma } from "@/shared/database/client";
import { TenantContextService } from "@/shared/database/tenant-context";
import { GoogleOAuthService } from "@/modules/integrations/google/google-oauth-service";
import { handleRouteError } from "@/shared/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant } = await ContextResolver.resolveTenantContext(token, tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Get the active connection
    const connection = await TenantContextService.withTenantContext(
      prisma,
      tenant.id,
      async (tx) => {
        return tx.integrationConnection.findFirst({
          where: { tenantId: tenant.id, status: "ACTIVE" },
        });
      },
    );

    if (!connection) {
      return NextResponse.json({ error: "No active Google connection found" }, { status: 404 });
    }

    // Get fresh access token
    const accessToken = await GoogleOAuthService.refreshAccessToken(
      connection.encryptedRefreshToken,
      tenant.id,
      connection.id,
    );

    const debugLog: Record<string, unknown> = {
      connectionEmail: connection.externalEmail,
      grantedScopes: connection.grantedScopes,
    };

    // Step 1: Raw accounts response
    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const accountsRaw = await accountsRes.json();
    debugLog.accountsApiStatus = accountsRes.status;
    debugLog.accountsApiResponse = accountsRaw;

    const accounts = (accountsRaw.accounts || []) as Array<{
      name: string;
      accountName?: string;
      type?: string;
    }>;

    // Step 2: Wildcard locations
    const wildcardRes = await fetch(
      "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title,storeCode,storefrontAddress,metadata",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const wildcardRaw = await wildcardRes.json();
    debugLog.wildcardLocationsApiStatus = wildcardRes.status;
    debugLog.wildcardLocationsApiResponse = wildcardRaw;

    // Step 3: Per-account location fetch + org sub-account expansion
    const perAccountResults: Record<string, unknown>[] = [];

    for (const acc of accounts) {
      const entry: Record<string, unknown> = {
        accountName: acc.name,
        type: acc.type,
      };

      if (acc.type === "ORGANIZATION") {
        // Fetch sub-accounts
        const subRes = await fetch(
          `https://mybusinessaccountmanagement.googleapis.com/v1/${acc.name}/accounts`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const subRaw = await subRes.json();
        entry.subAccountsStatus = subRes.status;
        entry.subAccountsResponse = subRaw;

        // Fetch locations for each sub-account
        const subAccounts = (subRaw.accounts || []) as Array<{ name: string }>;
        const subLocationResults = [];
        for (const sub of subAccounts) {
          const subLocRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${sub.name}/locations?readMask=name,title,storeCode,storefrontAddress,metadata`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          const subLocRaw = await subLocRes.json();
          subLocationResults.push({
            subAccount: sub.name,
            status: subLocRes.status,
            response: subLocRaw,
          });
        }
        entry.subLocationResults = subLocationResults;
      } else {
        // Fetch locations directly
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode,storefrontAddress,metadata`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const locRaw = await locRes.json();
        entry.locationsStatus = locRes.status;
        entry.locationsResponse = locRaw;
      }

      perAccountResults.push(entry);
    }

    debugLog.perAccountResults = perAccountResults;

    return NextResponse.json({ debug: debugLog }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
