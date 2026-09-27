import { logger } from "@/shared/observability/logger";
import { createGoogleRateLimitedError } from "@/shared/errors";

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
  title?: string;
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
      // 1. Fetch top-level accounts
      const accountsRes = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!accountsRes.ok) {
        if (accountsRes.status === 429) {
          throw createGoogleRateLimitedError(
            "Google is temporarily limiting requests. Please wait a moment, then click Refresh again.",
          );
        }
        throw new Error(
          `Failed to fetch GBP accounts: ${accountsRes.statusText}`,
        );
      }

      const accountsData = await accountsRes.json();
      const topLevelAccounts = (accountsData.accounts || []) as Array<{
        name: string;
        accountName?: string;
        type?: string; // PERSONAL, LOCATION_GROUP, ORGANIZATION, USER_GROUP
      }>;

      // 2. Expand ORGANIZATION accounts into their child location-group sub-accounts.
      //    Business Manager accounts (type === 'ORGANIZATION') do not own locations
      //    directly — their child LOCATION_GROUP accounts do. The old code silently
      //    skipped these via the `continue` on a failed locations fetch, which is
      //    why "Lakshmi food" (under a Business Manager org) was never discovered.
      const expandedAccounts: Array<{ name: string; accountName?: string }> = [];

      for (const acc of topLevelAccounts) {
        if (acc.type === "ORGANIZATION") {
          logger.info(
            { account: acc.name },
            "GBP account is ORGANIZATION (Business Manager); fetching child location groups",
          );
          const subRes = await fetch(
            `https://mybusinessaccountmanagement.googleapis.com/v1/${acc.name}/accounts`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (subRes.ok) {
            const subData = await subRes.json();
            const subAccounts = (subData.accounts || []) as Array<{
              name: string;
              accountName?: string;
            }>;
            expandedAccounts.push(...subAccounts);
          } else {
            // Could not fetch sub-accounts; fall back to querying the org directly
            logger.warn(
              { account: acc.name, status: subRes.status },
              "Failed to fetch sub-accounts for ORGANIZATION; falling back to direct query",
            );
            expandedAccounts.push(acc);
          }
        } else {
          expandedAccounts.push(acc);
        }
      }

      // 3. Prepend wildcard account to capture directly managed locations that
      //    may not appear under any formal location group.
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

      // 4. Fetch locations for each resolved account and deduplicate by location name
      const result: DiscoveredResourceAccount[] = [];
      const seenLocationNames = new Set<string>();

      for (const acc of uniqueAccounts) {
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode,storefrontAddress,metadata`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!locRes.ok) {
          logger.warn(
            { account: acc.name, status: locRes.status },
            "Failed to list locations for account",
          );
          continue;
        }

        const locData = await locRes.json();
        const locations = (locData.locations || []) as RawGbpLocation[];

        // Filter out locations already seen from another account (deduplication)
        const uniqueLocations = locations.filter((loc) => {
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
              resourceName: String(loc.title || "Untitled Location"),
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
   * Queries Google Search Console Search Analytics API for multi-grain reporting.
   */
  public static async queryGscSearchAnalytics(
    accessToken: string,
    propertyUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = ["date"],
    searchType: string = "WEB",
  ): Promise<GscSearchAnalyticsRow[]> {
    const encodedSiteUrl = encodeURIComponent(propertyUrl);
    const bodyPayload = {
      startDate,
      endDate,
      dimensions,
      type: searchType.toLowerCase(),
      rowLimit: 25000,
      aggregationType: "auto",
    };

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
    return (data.rows || []) as GscSearchAnalyticsRow[];
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
   * Queries Google Analytics Data API v1beta for property reporting.
   */
  public static async queryGa4AnalyticsReport(
    accessToken: string,
    propertyId: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = ["date"],
    metrics: string[] = [
      "activeUsers",
      "newUsers",
      "eventCount",
      "keyEvents",
      "averageSessionDuration",
      "bounceRate",
    ],
  ): Promise<any> {
    const cleanPropId = propertyId.replace(/^properties\//, "");
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runReport`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: dimensions.map((d) => ({ name: d })),
        metrics: metrics.map((m) => ({ name: m })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GA4 runReport failed (${response.status}): ${errText}`);
    }

    return response.json();
  }
}
