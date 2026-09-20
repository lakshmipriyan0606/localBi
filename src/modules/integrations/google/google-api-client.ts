import { getConfig } from "@/shared/config";
import { logger } from "@/shared/observability/logger";
import { createGoogleRateLimitedError } from "@/shared/errors";
import {
  MOCK_FIXTURES,
  MockGbpAccount,
  MockGscSite,
} from "./google-mock-fixtures";

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
   */
  public static async discoverGbpResources(
    accessToken: string,
    tenantSlug?: string,
  ): Promise<DiscoveredResourceAccount[]> {
    const config = getConfig();
    const isMock = false; // Disabled mock data per user request

    if (isMock) {
      logger.info(
        { tenantSlug },
        "Using high-fidelity GBP discovery fixtures for mock environment",
      );
      const fixtureKey = tenantSlug?.includes("xyz")
        ? "xyzFitness"
        : "abcDental";
      const fixture = MOCK_FIXTURES[fixtureKey];

      return fixture.gbpAccounts.map((acc: MockGbpAccount) => ({
        externalAccountId: acc.name,
        accountName: acc.accountName,
        provider: "GOOGLE_BUSINESS_PROFILE",
        resources: acc.locations.map((loc) => ({
          externalResourceId: loc.name,
          resourceType: "LOCATION" as const,
          resourceName: loc.title,
          address: loc.storefrontAddress.addressLines.join(", "),
          city: loc.storefrontAddress.locality,
          state: loc.storefrontAddress.administrativeArea,
          postalCode: loc.storefrontAddress.postalCode,
          country: loc.storefrontAddress.regionCode,
          storeCode: loc.storeCode,
          verified: loc.metadata?.hasVoiceOfMerchant ?? true,
        })),
      }));
    }

    try {
      // 1. Fetch Accounts
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
      const accounts = (accountsData.accounts || []) as Array<{
        name: string;
        accountName?: string;
      }>;
      const result: DiscoveredResourceAccount[] = [];

      for (const acc of accounts) {
        // 2. Fetch locations for each account
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode,storefrontAddress,metadata`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!locRes.ok) {
          logger.warn(
            { account: acc.name },
            "Failed to list locations for account",
          );
          continue;
        }

        const locData = await locRes.json();
        const locations = (locData.locations || []) as RawGbpLocation[];

        result.push({
          externalAccountId: acc.name,
          accountName: acc.accountName || acc.name,
          provider: "GOOGLE_BUSINESS_PROFILE",
          resources: locations.map((loc) => {
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
    tenantSlug?: string,
  ): Promise<DiscoveredResourceItem[]> {
    const config = getConfig();
    const isMock = false; // Disabled mock data per user request

    if (isMock) {
      logger.info(
        { tenantSlug },
        "Using high-fidelity GSC discovery fixtures for mock environment",
      );
      const fixtureKey = tenantSlug?.includes("xyz")
        ? "xyzFitness"
        : "abcDental";
      const fixture = MOCK_FIXTURES[fixtureKey];

      return fixture.gscSites.map((site: MockGscSite) => ({
        externalResourceId: site.siteUrl,
        resourceType: "PROPERTY" as const,
        resourceName: site.siteUrl,
        verified:
          site.permissionLevel === "siteOwner" ||
          site.permissionLevel === "siteFullUser",
      }));
    }

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
        verified:
          e.permissionLevel === "siteOwner" ||
          e.permissionLevel === "siteFullUser",
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
    const config = getConfig();
    const isMock = false; // Disabled mock data per user request

    if (isMock) {
      return this.generateMockGscRows(
        propertyUrl,
        startDate,
        endDate,
        dimensions,
      );
    }

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
    const config = getConfig();
    const isMock = false; // Disabled mock data per user request

    if (isMock) {
      return this.generateMockGbpEntries(
        locationResourceName,
        startDate,
        endDate,
      );
    }

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

  // --- Mock Generators for realistic developer testing ---

  private static generateMockGscRows(
    propertyUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[],
  ): GscSearchAnalyticsRow[] {
    const isAbc = propertyUrl.includes("abcdental");
    const rows: GscSearchAnalyticsRow[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (dimensions.length === 1 && dimensions[0] === "date") {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const seed = d.getDate() * 13 + d.getMonth() * 7;
        const impressions = isAbc ? 450 + (seed % 150) : 280 + (seed % 80);
        const clicks = Math.round(
          impressions * (isAbc ? 0.045 : 0.038) + (seed % 5),
        );
        const position = isAbc
          ? 8.2 + (seed % 10) * 0.1
          : 12.4 + (seed % 10) * 0.2;

        rows.push({
          keys: [dateStr],
          clicks,
          impressions,
          ctr: clicks / impressions,
          position: Math.round(position * 10) / 10,
        });
      }
    } else if (dimensions.includes("query")) {
      const queries = isAbc
        ? [
            "dental clinic anna nagar",
            "dentist in salem fairlands",
            "teeth whitening chennai cost",
            "root canal treatment chennai",
            "best dental doctor salem",
            "abc dental reviews",
          ]
        : [
            "gym in dharmapuri town centre",
            "fitness centre dharmapuri fees",
            "personal trainer dharmapuri",
            "xyz fitness timings",
            "weight loss gym dharmapuri",
          ];

      queries.forEach((q, idx) => {
        const impressions = 600 - idx * 80;
        const clicks = Math.round(impressions * (0.05 + idx * 0.005));
        rows.push({
          keys: [q],
          clicks,
          impressions,
          ctr: clicks / impressions,
          position: 3.2 + idx * 1.5,
        });
      });
    } else if (dimensions.includes("page")) {
      const base = isAbc
        ? "https://abcdental.example"
        : "https://xyzfitness.example";
      const pages = isAbc
        ? [
            `${base}/`,
            `${base}/locations/chennai-anna-nagar`,
            `${base}/locations/salem-fairlands`,
            `${base}/services/root-canal`,
            `${base}/services/teeth-whitening`,
          ]
        : [
            `${base}/`,
            `${base}/locations/dharmapuri-town-centre`,
            `${base}/membership-plans`,
            `${base}/personal-training`,
          ];

      pages.forEach((p, idx) => {
        const impressions = 800 - idx * 120;
        const clicks = Math.round(impressions * (0.048 + idx * 0.004));
        rows.push({
          keys: [p],
          clicks,
          impressions,
          ctr: clicks / impressions,
          position: 4.1 + idx * 1.8,
        });
      });
    } else if (dimensions.includes("device")) {
      rows.push(
        {
          keys: ["MOBILE"],
          clicks: isAbc ? 520 : 340,
          impressions: isAbc ? 11200 : 7800,
          ctr: 0.046,
          position: 7.8,
        },
        {
          keys: ["DESKTOP"],
          clicks: isAbc ? 280 : 120,
          impressions: isAbc ? 6400 : 3200,
          ctr: 0.043,
          position: 8.5,
        },
        {
          keys: ["TABLET"],
          clicks: isAbc ? 25 : 12,
          impressions: isAbc ? 600 : 310,
          ctr: 0.041,
          position: 8.9,
        },
      );
    }

    return rows;
  }

  private static generateMockGbpEntries(
    locationResourceName: string,
    startDate: string,
    endDate: string,
  ): GbpDailyMetricEntry[] {
    const entries: GbpDailyMetricEntry[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    const isChennai = locationResourceName.includes("293847192837");
    const multiplier = isChennai ? 1.5 : 1.0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const seed = d.getDate() * 7 + d.getMonth() * 3;

      entries.push(
        {
          date: dateStr,
          metricType: "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
          value: Math.round((25 + (seed % 15)) * multiplier),
        },
        {
          date: dateStr,
          metricType: "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
          value: Math.round((85 + (seed % 35)) * multiplier),
        },
        {
          date: dateStr,
          metricType: "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
          value: Math.round((110 + (seed % 45)) * multiplier),
        },
        {
          date: dateStr,
          metricType: "CALL_CLICKS",
          value: Math.round((8 + (seed % 6)) * multiplier),
        },
        {
          date: dateStr,
          metricType: "WEBSITE_CLICKS",
          value: Math.round((14 + (seed % 10)) * multiplier),
        },
        {
          date: dateStr,
          metricType: "BUSINESS_DIRECTION_REQUESTS",
          value: Math.round((12 + (seed % 8)) * multiplier),
        },
      );
    }

    return entries;
  }
}
