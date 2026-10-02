import { logger } from "@/shared/observability/logger";
import { createGoogleRateLimitedError, ErrorCode, createGa4Error, AppError } from "@/shared/errors";

export interface DiscoveredResourceAccount {
  externalAccountId: string;
  accountName: string;
  provider: string;
  resources: DiscoveredResourceItem[];
}

export interface DiscoveredResourceItem {
  externalResourceId: string;
  resourceType: "LOCATION" | "PROPERTY";
  resourceName: string;
  address?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  postalCode?: string | undefined;
  country?: string | undefined;
  storeCode?: string | undefined;
  verified?: boolean | undefined;
}

export interface GscSearchAnalyticsRow {
  keys?: string[] | undefined;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GbpDailyMetricEntry {
  date: string;
  metricType: string;
  value: number;
}

interface RawGbpLocation {
  name: string;
  title?: string;          // v1 API field
  locationName?: string;   // v4 API field (legacy)
  storeCode?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  metadata?: {
    hasVoiceOfMerchant?: boolean;
  };
}

interface RawGscSiteEntry {
  siteUrl: string;
  permissionLevel?: string;
}

export class GoogleApiClient {
  /**
   * Discovers GBP accounts and locations accessible to this token.
   *
   * Handles three account types returned by the Google Account Management API:
   *   - PERSONAL / LOCATION_GROUP: can list locations directly.
   *   - ORGANIZATION (Business Manager): cannot list locations directly; must
   *     first fetch its child location-group sub-accounts, then list locations
   *     from each child. Silently skipping ORGANIZATION accounts is the root
   *     cause of "No Store Locations Found" when a business is managed through
   *     Business Manager.
   *
   * A synthetic wildcard account ("accounts/-") is also queried to catch any
   * locations the user manages directly that are not returned by the accounts
   * API. Locations are deduplicated by resource name across all sources.
   */
  public static async discoverGbpResources(
    accessToken: string,
  ): Promise<DiscoveredResourceAccount[]> {
    try {
      // 1. Fetch top-level accounts with pagination
      let pageToken: string | undefined = undefined;
      const topLevelAccounts: Array<{
        name: string;
        accountName?: string;
        type?: string; // PERSONAL, LOCATION_GROUP, ORGANIZATION, USER_GROUP
      }> = [];

      do {
        const url: string = pageToken
          ? `https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageToken=${encodeURIComponent(pageToken)}`
          : "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";

        const accountsRes = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!accountsRes.ok) {
          const errText = await accountsRes.text().catch(() => "");
          logger.error(
            { status: accountsRes.status, errText: errText.slice(0, 300) },
            "GBP account management API returned error"
          );

          if (accountsRes.status === 401) {
            throw new AppError({
              code: "GOOGLE_AUTH_REQUIRED",
              message: "Google OAuth token has expired or is invalid. Please reconnect Google.",
              statusCode: 401,
              isOperational: true,
            });
          }

          if (accountsRes.status === 403) {
            throw new AppError({
              code: "GBP_PERMISSION_REQUIRED",
              message: "Google Business Profile management permission denied. Please re-authenticate with business.manage scope.",
              statusCode: 403,
              isOperational: true,
            });
          }

          if (accountsRes.status === 429) {
            if (errText.includes('quota_limit_value": "0"') || errText.includes("RESOURCE_EXHAUSTED")) {
              throw new AppError({
                code: "GBP_API_QUOTA_REQUIRED",
                message: "Google Business Profile API quota is 0 requests/min. Your Google Cloud project requires Business Profile API approval/quota from Google.",
                statusCode: 429,
                isOperational: true,
              });
            }
            throw createGoogleRateLimitedError(
              "Google is temporarily limiting requests. Please wait a moment, then click Refresh again.",
            );
          }

          throw new Error(
            `Failed to fetch GBP accounts (${accountsRes.status}): ${accountsRes.statusText}`,
          );
        }

        const accountsData = await accountsRes.json();
        const batch = (accountsData.accounts || []) as typeof topLevelAccounts;
        topLevelAccounts.push(...batch);
        pageToken = accountsData.nextPageToken;
      } while (pageToken);

      logger.info({ accountsCount: topLevelAccounts.length }, "GBP top-level accounts discovered");

      // 2. Expand ORGANIZATION accounts into their child location-group sub-accounts with pagination.
      const expandedAccounts: Array<{ name: string; accountName?: string }> = [];

      for (const acc of topLevelAccounts) {
        if (acc.type === "ORGANIZATION") {
          logger.info(
            { account: acc.name },
            "GBP account is ORGANIZATION (Business Manager); fetching child location groups",
          );

          let subPageToken: string | undefined = undefined;
          do {
            const subUrl: string = subPageToken
              ? `https://mybusinessaccountmanagement.googleapis.com/v1/${acc.name}/accounts?pageToken=${encodeURIComponent(subPageToken)}`
              : `https://mybusinessaccountmanagement.googleapis.com/v1/${acc.name}/accounts`;

            const subRes = await fetch(subUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (subRes.ok) {
              const subData = await subRes.json();
              const subAccounts = (subData.accounts || []) as Array<{
                name: string;
                accountName?: string;
              }>;
              expandedAccounts.push(...subAccounts);
              subPageToken = subData.nextPageToken;
            } else {
              logger.warn(
                { account: acc.name, status: subRes.status },
                "Failed to fetch sub-accounts for ORGANIZATION; falling back to direct query",
              );
              expandedAccounts.push(acc);
              break;
            }
          } while (subPageToken);
        } else {
          expandedAccounts.push(acc);
        }
      }

      // 3. Always include the wildcard "accounts/-" endpoint which lists ALL locations
      //    the authenticated user has access to, regardless of account ownership level.
      //    This is critical for users who are Owner (not Primary Owner) — the accounts 
      //    list API may return empty for them, but accounts/- always returns their locations.
      expandedAccounts.unshift({
        name: "accounts/-",
        accountName: "Directly Managed Locations",
      });

      // Deduplicate accounts by name before querying locations
      const seenAccountNames = new Set<string>();
      const uniqueAccounts = expandedAccounts.filter((acc) => {
        if (seenAccountNames.has(acc.name)) return false;
        seenAccountNames.add(acc.name);
        return true;
      });

      logger.info({ totalAccounts: uniqueAccounts.length }, "GBP accounts to query for locations");

      // 4. Fetch locations for each resolved account and deduplicate by location name
      const result: DiscoveredResourceAccount[] = [];
      const seenLocationNames = new Set<string>();

      for (const acc of uniqueAccounts) {
        let locPageToken: string | undefined = undefined;
        const locationsForAccount: RawGbpLocation[] = [];

        do {
          const v1Url: string = locPageToken
            ? `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode,storefrontAddress,metadata&pageSize=100&pageToken=${encodeURIComponent(locPageToken)}`
            : `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode,storefrontAddress,metadata&pageSize=100`;

          let locRes = await fetch(v1Url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          // Fallback: some accounts only work with the older v4 endpoint
          if (!locRes.ok && !locPageToken) {
            logger.warn(
              { account: acc.name, status: locRes.status },
              "v1 locations endpoint failed; trying legacy v4",
            );
            locRes = await fetch(
              `https://mybusiness.googleapis.com/v4/${acc.name}/locations`,
              { headers: { Authorization: `Bearer ${accessToken}` } },
            );
          }

          if (!locRes.ok) {
            logger.warn(
              { account: acc.name, status: locRes.status },
              "Failed to list locations for account on both v1 and v4",
            );
            break;
          }

          const locData = await locRes.json();
          const batch = (locData.locations || []) as RawGbpLocation[];
          locationsForAccount.push(...batch);
          locPageToken = locData.nextPageToken;
        } while (locPageToken);

        logger.info({ account: acc.name, count: locationsForAccount.length }, "Locations found for account");

        // Filter out locations already seen from another account (deduplication)
        const uniqueLocations = locationsForAccount.filter((loc) => {
          if (seenLocationNames.has(loc.name)) return false;
          seenLocationNames.add(loc.name);
          return true;
        });

        if (uniqueLocations.length === 0) continue;

        result.push({
          externalAccountId: acc.name,
          accountName: acc.accountName || acc.name,
          provider: "GOOGLE_BUSINESS_PROFILE",
          resources: uniqueLocations.map((loc) => {
            const addressObj = loc.storefrontAddress || {};
            const addressLines = addressObj.addressLines || [];
            return {
              externalResourceId: String(loc.name),
              resourceType: "LOCATION" as const,
              resourceName: String(loc.title || loc.locationName || "Untitled Location"),
              address: addressLines.join(", "),
              city: addressObj.locality,
              state: addressObj.administrativeArea,
              postalCode: addressObj.postalCode,
              country: addressObj.regionCode,
              storeCode: loc.storeCode,
              verified: loc.metadata?.hasVoiceOfMerchant,
            };
          }),
        });
      }

      return result;
    } catch (err) {
      logger.error({ err }, "Error during GBP resource discovery");
      throw err;
    }
  }

  /**
   * Discovers GSC verified properties accessible to this token.
   */
  public static async discoverGscResources(
    accessToken: string,
  ): Promise<DiscoveredResourceItem[]> {

    try {
      const res = await fetch(
        "https://www.googleapis.com/webmasters/v3/sites",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!res.ok) {
        if (res.status === 429) {
          throw createGoogleRateLimitedError(
            "Google is temporarily limiting requests. Please wait a moment, then click Refresh again.",
          );
        }
        throw new Error(`Failed to fetch GSC sites: ${res.statusText}`);
      }

      const data = await res.json();
      const entries = (data.siteEntry || []) as RawGscSiteEntry[];

      return entries.map((e) => ({
        externalResourceId: String(e.siteUrl),
        resourceType: "PROPERTY" as const,
        resourceName: String(e.siteUrl),
        verified: e.permissionLevel !== "siteUnverifiedUser",
      }));
    } catch (err) {
      logger.error({ err }, "Error during GSC site discovery");
      throw err;
    }
  }

  /**
   * Queries Google Search Console Search Analytics API for multi-grain reporting with offset pagination.
   */
  public static async queryGscSearchAnalytics(
    accessToken: string,
    propertyUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = ["date"],
    searchType: string = "WEB",
    dimensionFilterGroups?: Array<{
      groupType?: 'and';
      filters: Array<{
        dimension: 'page' | 'query' | 'country' | 'device' | 'searchAppearance' | string;
        operator: 'contains' | 'equals' | 'notContains' | 'notEquals' | 'includingRegex' | 'excludingRegex' | string;
        expression: string;
      }>;
    }>,
  ): Promise<GscSearchAnalyticsRow[]> {
    const encodedSiteUrl = encodeURIComponent(propertyUrl);
    const rowLimit = 25000;
    let startRow = 0;
    const allRows: GscSearchAnalyticsRow[] = [];

    while (true) {
      const bodyPayload: Record<string, unknown> = {
        startDate,
        endDate,
        dimensions,
        type: searchType.toLowerCase(),
        startRow,
        rowLimit,
        aggregationType: "auto",
      };

      if (dimensionFilterGroups && dimensionFilterGroups.length > 0) {
        bodyPayload['dimensionFilterGroups'] = dimensionFilterGroups;
      }

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GSC Query failed (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const rows = (data.rows || []) as GscSearchAnalyticsRow[];
      allRows.push(...rows);

      // Stop if fewer rows than rowLimit was returned (reached the end)
      if (rows.length < rowLimit) {
        break;
      }

      startRow += rowLimit;
    }

    return allRows;
  }

  /**
   * Queries GBP Performance API for daily metrics (30-day bounded).
   */
  public static async queryGbpPerformanceMetrics(
    accessToken: string,
    locationResourceName: string,
    startDate: string,
    endDate: string,
  ): Promise<GbpDailyMetricEntry[]> {
    const url = new URL(
      `https://businessprofileperformance.googleapis.com/v1/${locationResourceName}:fetchMultiDailyMetricsTimeSeries`,
    );
    url.searchParams.append(
      "dailyMetrics",
      "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
    );
    url.searchParams.append(
      "dailyMetrics",
      "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
    );
    url.searchParams.append("dailyMetrics", "BUSINESS_IMPRESSIONS_MOBILE_MAPS");
    url.searchParams.append(
      "dailyMetrics",
      "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
    );
    url.searchParams.append("dailyMetrics", "CALL_CLICKS");
    url.searchParams.append("dailyMetrics", "WEBSITE_CLICKS");
    url.searchParams.append("dailyMetrics", "BUSINESS_DIRECTION_REQUESTS");

    const [sYear, sMonth, sDay] = startDate.split("-").map(Number);
    const [eYear, eMonth, eDay] = endDate.split("-").map(Number);

    url.searchParams.append("dailyRange.startDate.year", String(sYear));
    url.searchParams.append("dailyRange.startDate.month", String(sMonth));
    url.searchParams.append("dailyRange.startDate.day", String(sDay));
    url.searchParams.append("dailyRange.endDate.year", String(eYear));
    url.searchParams.append("dailyRange.endDate.month", String(eMonth));
    url.searchParams.append("dailyRange.endDate.day", String(eDay));

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error(
        { status: response.status, locationResourceName },
        "GBP Performance query failed"
      );

      if (response.status === 401) {
        throw new AppError({
          code: "GOOGLE_AUTH_REQUIRED",
          message: "Google OAuth token has expired or is invalid.",
          statusCode: 401,
          isOperational: true,
        });
      }
      if (response.status === 403) {
        throw new AppError({
          code: "GBP_PERMISSION_REQUIRED",
          message: "Google Business Profile performance permission denied.",
          statusCode: 403,
          isOperational: true,
        });
      }
      if (response.status === 404) {
        throw new AppError({
          code: "GBP_LOCATION_NOT_FOUND",
          message: `Google location ${locationResourceName} was not found on Google Business Profile.`,
          statusCode: 404,
          isOperational: true,
        });
      }
      if (response.status === 429) {
        if (err.includes('quota_limit_value": "0"') || err.includes("RESOURCE_EXHAUSTED")) {
          throw new AppError({
            code: "GBP_API_QUOTA_REQUIRED",
            message: "Google Business Profile Performance API quota is 0. Access must be enabled in Google Cloud Console.",
            statusCode: 429,
            isOperational: true,
          });
        }
        throw createGoogleRateLimitedError();
      }

      throw new Error(
        `GBP Performance query failed (${response.status}): ${err}`,
      );
    }

    const data = await response.json();
    const entries: GbpDailyMetricEntry[] = [];

    const multiSeries = data.multiDailyMetricTimeSeries || [];
    for (const item of multiSeries) {
      const series = item.dailyMetricTimeSeries || {};
      const metricType = series.dailyMetric;
      const timeSeries = series.timeSeries || {};
      const datedValues = timeSeries.datedValues || [];

      for (const dv of datedValues) {
        const d = dv.date || {};
        const dateStr = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
        entries.push({
          date: dateStr,
          metricType,
          value: Number(dv.value || 0),
        });
      }
    }

    return entries;
  }

  /**
   * Discovers GA4 Accounts and Properties using Google Analytics Admin API v1beta.
   * Endpoint: GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries
   */
  public static async discoverGa4Resources(
    accessToken: string
  ): Promise<DiscoveredResourceAccount[]> {
    const discoveredAccounts: DiscoveredResourceAccount[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const url = new URL("https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
      url.searchParams.set("pageSize", "200");
      if (pageToken) {
        url.searchParams.set("pageToken", pageToken);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const status = response.status;
        const errText = await response.text();
        logger.error(
          { status, operation: "ga4.discovery.failed", message: errText.slice(0, 300) },
          "Google Analytics Admin API accountSummaries.list failed"
        );
        if (status === 401) {
          throw createGa4Error(ErrorCode.GA4_AUTH_REQUIRED, "Google OAuth authentication expired or invalid.", 401);
        }
        if (status === 403) {
          throw createGa4Error(ErrorCode.GA4_PERMISSION_REQUIRED, "Google Analytics permission denied. Re-authentication with analytics.readonly scope required.", 403);
        }
        if (status === 429) {
          throw createGoogleRateLimitedError();
        }
        throw createGa4Error(ErrorCode.GA4_PROVIDER_ERROR, `Google Analytics discovery failed with HTTP ${status}: ${errText.slice(0, 200)}`, status);
      }

      const data = await response.json();
      const accountSummaries = data.accountSummaries || [];

      for (const acc of accountSummaries) {
        const externalAccountId = acc.account || acc.name || "ga4_unknown_account";
        const accountName = acc.displayName || "Google Analytics Account";
        const resources: DiscoveredResourceItem[] = [];

        const propertySummaries = acc.propertySummaries || [];
        for (const prop of propertySummaries) {
          // Normalize property resource ID to "properties/123456789"
          const cleanId = String(prop.property || "").replace(/^properties\//, "");
          if (!cleanId) continue;

          resources.push({
            externalResourceId: `properties/${cleanId}`,
            resourceType: "PROPERTY",
            resourceName: prop.displayName || `GA4 Property ${cleanId}`,
          });
        }

        if (resources.length > 0) {
          discoveredAccounts.push({
            externalAccountId,
            accountName,
            provider: "GOOGLE_ANALYTICS_4",
            resources,
          });
        }
      }

      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    logger.info(
      {
        operation: "ga4.discovery.success",
        accountCount: discoveredAccounts.length,
        propertyCount: discoveredAccounts.reduce((sum, a) => sum + a.resources.length, 0),
      },
      "GA4 Property discovery completed"
    );

    return discoveredAccounts;
  }

  /**
   * Queries Google Analytics Data API v1beta for real property reporting.
   * Endpoint: POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
   */
  public static async queryGa4AnalyticsReport(params: {
    accessToken: string;
    propertyId: string;
    dateRanges: Array<{ startDate: string; endDate: string; name?: string | undefined }>;
    dimensions?: string[] | undefined;
    metrics: string[];
    limit?: number | undefined;
    dimensionFilter?: Record<string, unknown> | undefined;
    orderBys?: Array<{
      metric?: { metricName: string };
      dimension?: { dimensionName: string };
      desc?: boolean;
    }> | undefined;
  }): Promise<{
    dimensionHeaders?: Array<{ name: string }>;
    metricHeaders?: Array<{ name: string; type: string }>;
    rows?: Array<{
      dimensionValues?: Array<{ value: string }>;
      metricValues?: Array<{ value: string }>;
    }>;
    totals?: Array<{
      dimensionValues?: Array<{ value: string }>;
      metricValues?: Array<{ value: string }>;
    }>;
    rowCount?: number;
    metadata?: Record<string, unknown>;
  }> {
    const cleanPropId = params.propertyId.replace(/^properties\//, "");
    if (!cleanPropId || !/^\d+$/.test(cleanPropId)) {
      throw createGa4Error(ErrorCode.GA4_PROPERTY_NOT_FOUND, `Invalid GA4 Property ID format: "${params.propertyId}"`, 400);
    }

    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runReport`;

    const body: Record<string, unknown> = {
      dateRanges: params.dateRanges.map((dr) => ({
        startDate: dr.startDate,
        endDate: dr.endDate,
        ...(dr.name ? { name: dr.name } : {}),
      })),
      metrics: params.metrics.map((m) => ({ name: m })),
    };

    if (params.dimensions && params.dimensions.length > 0) {
      body["dimensions"] = params.dimensions.map((d) => ({ name: d }));
    }

    if (params.limit && params.limit > 0) {
      body["limit"] = params.limit;
    }

    if (params.dimensionFilter) {
      body["dimensionFilter"] = params.dimensionFilter;
    }

    if (params.orderBys && params.orderBys.length > 0) {
      body["orderBys"] = params.orderBys;
    }

    logger.info(
      {
        operation: "ga4.report.start",
        propertyId: `properties/${cleanPropId}`,
        metrics: params.metrics,
        dimensions: params.dimensions || [],
        dimensionFilter: params.dimensionFilter,
        dateRanges: params.dateRanges,
      },
      "Initiating GA4 Data API runReport"
    );

    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const status = response.status;
      const errText = await response.text();
      logger.error(
        {
          operation: "ga4.report.failed",
          propertyId: `properties/${cleanPropId}`,
          status,
          durationMs,
          message: errText.slice(0, 300),
        },
        "GA4 runReport failed"
      );

      if (status === 401) {
        throw createGa4Error(ErrorCode.GA4_AUTH_REQUIRED, "Google OAuth authentication expired or invalid.", 401);
      }
      if (status === 403) {
        throw createGa4Error(ErrorCode.GA4_PROPERTY_ACCESS_DENIED, `User does not have permission to access GA4 property: properties/${cleanPropId}`, 403);
      }
      if (status === 404) {
        throw createGa4Error(ErrorCode.GA4_PROPERTY_NOT_FOUND, `GA4 property properties/${cleanPropId} was not found on Google Analytics.`, 404);
      }
      if (status === 429) {
        throw createGoogleRateLimitedError();
      }
      throw createGa4Error(ErrorCode.GA4_REPORT_FAILED, `GA4 report failed with status ${status}: ${errText.slice(0, 200)}`, status);
    }

    const json = await response.json();
    logger.info(
      {
        operation: "ga4.report.success",
        propertyId: `properties/${cleanPropId}`,
        rowCount: json.rowCount ?? json.rows?.length ?? 0,
        durationMs,
      },
      "GA4 runReport succeeded"
    );

    return json;
  }
}
