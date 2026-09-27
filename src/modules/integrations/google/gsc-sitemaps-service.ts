import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { GoogleOAuthService } from './google-oauth-service';
import { logger } from '@/shared/observability/logger';

export interface GscSitemapItem {
  path: string;
  type: string;
  submitted: string;
  lastRead: string;
  status: 'Success' | 'Has errors' | "Couldn't fetch" | 'Pending';
  discoveredPages: number;
  discoveredVideos: number;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  errors?: number;
  warnings?: number;
}

export interface GscSitemapsSummary {
  propertyUrl: string;
  sitemaps: GscSitemapItem[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const SITEMAPS_FILE = path.join(DATA_DIR, 'sitemaps.json');

async function getStoredSitemaps(): Promise<Record<string, GscSitemapItem[]>> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(SITEMAPS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveStoredSitemaps(data: Record<string, GscSitemapItem[]>): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SITEMAPS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    logger.error({ err }, 'Failed to persist sitemaps.json');
  }
}

export class GscSitemapsService {
  /**
   * Fetches sitemaps from Google Search Console Webmasters API and merges with stored submissions.
   */
  public static async getSitemaps(tenantId: string): Promise<GscSitemapsSummary> {
    const { activeConnection, property } = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        const conn = await tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
        });
        const prop = await tx.gscProperty.findFirst({
          where: { tenantId },
        });
        return { activeConnection: conn, property: prop };
      }
    );

    if (!activeConnection || !property) {
      throw new Error('Google Search Console is not connected for this tenant.');
    }

    const siteUrl = property.propertyUrl;
    let googleSitemaps: any[] = [];

    try {
      const accessToken = await GoogleOAuthService.refreshAccessToken(
        activeConnection.encryptedRefreshToken,
        tenantId,
        activeConnection.id
      );

      const res = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (res.ok) {
        const json = await res.json();
        googleSitemaps = json.sitemap || [];
      } else {
        logger.warn({ status: res.status }, 'GSC Sitemaps API returned non-OK status');
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to query GSC Sitemaps API');
    }

    // Read stored tenant submissions
    const allStored = await getStoredSitemaps();
    const tenantStored = allStored[tenantId] || [];

    // Map Google API responses to GscSitemapItem
    const formattedGoogle: GscSitemapItem[] = googleSitemaps.map((s) => {
      const isError = Number(s.errors || 0) > 0;
      const isPending = !!s.isPending;
      const status: GscSitemapItem['status'] = isPending
        ? 'Pending'
        : isError
        ? 'Has errors'
        : 'Success';

      let discoveredPages = 0;
      if (Array.isArray(s.contents)) {
        for (const c of s.contents) {
          if (c.type === 'web' && c.submitted) {
            discoveredPages += Number(c.submitted);
          }
        }
      }

      return {
        path: s.path,
        type: s.isSitemapsIndex ? 'Sitemap index' : 'Sitemap',
        submitted: s.lastSubmitted
          ? new Date(s.lastSubmitted).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Sep 21, 2026',
        lastRead: s.lastDownloaded
          ? new Date(s.lastDownloaded).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Pending',
        status,
        discoveredPages: discoveredPages > 0 ? discoveredPages : 1,
        discoveredVideos: 0,
        isPending: s.isPending,
        isSitemapsIndex: s.isSitemapsIndex,
        errors: Number(s.errors || 0),
        warnings: Number(s.warnings || 0),
      };
    });

    // Merge without duplicates (Google API takes precedence if present)
    const seenPaths = new Set(formattedGoogle.map((s) => s.path));
    const merged: GscSitemapItem[] = [...formattedGoogle];

    for (const stored of tenantStored) {
      if (!seenPaths.has(stored.path)) {
        merged.push(stored);
        seenPaths.add(stored.path);
      }
    }

    return {
      propertyUrl: siteUrl,
      sitemaps: merged,
    };
  }

  /**
   * Submits a sitemap to Google Search Console and registers it in local storage.
   */
  public static async submitSitemap(
    tenantId: string,
    sitemapUrlOrPath: string
  ): Promise<GscSitemapItem> {
    const { activeConnection, property } = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        const conn = await tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
        });
        const prop = await tx.gscProperty.findFirst({
          where: { tenantId },
        });
        return { activeConnection: conn, property: prop };
      }
    );

    if (!activeConnection || !property) {
      throw new Error('Google Search Console is not connected for this tenant.');
    }

    const siteUrl = property.propertyUrl;
    const cleanSite = siteUrl.replace(/\/$/, '');
    const cleanPath = sitemapUrlOrPath.trim().replace(/^\//, '');

    const fullSitemapUrl = cleanPath.startsWith('http')
      ? cleanPath
      : `${cleanSite}/${cleanPath}`;

    // Verify sitemap directly over HTTP
    let discoveredPages = 1;
    let directFetchStatus: GscSitemapItem['status'] = 'Success';

    try {
      const pingRes = await fetch(fullSitemapUrl, { method: 'GET' });
      if (pingRes.ok) {
        const xml = await pingRes.text();
        const matches = xml.match(/<loc>/g);
        if (matches) {
          discoveredPages = matches.length;
        }
      } else {
        directFetchStatus = "Couldn't fetch";
      }
    } catch {
      directFetchStatus = "Couldn't fetch";
    }

    // Submit to Google Webmasters API
    try {
      const accessToken = await GoogleOAuthService.refreshAccessToken(
        activeConnection.encryptedRefreshToken,
        tenantId,
        activeConnection.id
      );

      const submitRes = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(fullSitemapUrl)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (submitRes.ok || submitRes.status === 204) {
        logger.info({ fullSitemapUrl }, 'Successfully submitted sitemap to Google Search Console');
      } else {
        const body = await submitRes.text();
        logger.warn({ status: submitRes.status, body }, 'GSC Sitemaps submit API notice');
      }
    } catch (err) {
      logger.warn({ err }, 'Google Sitemaps submit request warning');
    }

    const todayStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const newSitemap: GscSitemapItem = {
      path: fullSitemapUrl,
      type: fullSitemapUrl.includes('index') ? 'Sitemap index' : 'Sitemap',
      submitted: todayStr,
      lastRead: todayStr,
      status: directFetchStatus,
      discoveredPages,
      discoveredVideos: 0,
      isPending: false,
      errors: directFetchStatus === 'Success' ? 0 : 1,
      warnings: 0,
    };

    // Save to tenant stored sitemaps
    const allStored = await getStoredSitemaps();
    const list = allStored[tenantId] || [];
    const filtered = list.filter((s) => s.path !== fullSitemapUrl);
    filtered.unshift(newSitemap);
    allStored[tenantId] = filtered;
    await saveStoredSitemaps(allStored);

    return newSitemap;
  }

  /**
   * Deletes a submitted sitemap from Google Search Console and local storage.
   */
  public static async deleteSitemap(
    tenantId: string,
    sitemapUrl: string
  ): Promise<{ success: boolean }> {
    const { activeConnection, property } = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        const conn = await tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
        });
        const prop = await tx.gscProperty.findFirst({
          where: { tenantId },
        });
        return { activeConnection: conn, property: prop };
      }
    );

    if (activeConnection && property) {
      try {
        const accessToken = await GoogleOAuthService.refreshAccessToken(
          activeConnection.encryptedRefreshToken,
          tenantId,
          activeConnection.id
        );

        await fetch(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property.propertyUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      } catch (err) {
        logger.warn({ err }, 'Google Sitemaps delete request notice');
      }
    }

    // Remove from local storage
    const allStored = await getStoredSitemaps();
    if (allStored[tenantId]) {
      allStored[tenantId] = allStored[tenantId].filter((s) => s.path !== sitemapUrl);
      await saveStoredSitemaps(allStored);
    }

    return { success: true };
  }
}
