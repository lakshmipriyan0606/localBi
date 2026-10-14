import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { GoogleOAuthService } from './google-oauth-service';
import { AppError, ErrorCode, createValidationError } from '@/shared/errors';
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
   * Validates that the requested sitemap URL belongs to the authorized Search Console property.
   */
  public static validateSitemapOwnership(siteUrl: string, targetUrl: string): void {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    } catch {
      throw createValidationError(`Invalid sitemap URL provided: "${targetUrl}"`);
    }

    if (siteUrl.startsWith('sc-domain:')) {
      const domain = siteUrl.replace(/^sc-domain:/, '').trim().toLowerCase();
      const host = parsed.hostname.toLowerCase();
      if (host !== domain && !host.endsWith(`.${domain}`)) {
        throw createValidationError(
          `The requested sitemap URL (${parsed.href}) does not belong to the verified domain property (${domain}).`
        );
      }
    } else {
      const prefix = siteUrl.trim().toLowerCase();
      if (!parsed.href.toLowerCase().startsWith(prefix)) {
        throw createValidationError(
          `The requested sitemap URL (${parsed.href}) does not belong to the verified URL-prefix property (${siteUrl}).`
        );
      }
    }
  }

  /**
   * Fetches sitemaps from Google Search Console Webmasters API and merges with stored submissions.
   */
  public static async getSitemaps(
    tenantId: string,
    brandId?: string,
    propertyId?: string
  ): Promise<GscSitemapsSummary> {
    const { activeConnection, property } = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        const conn = await tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
        });

        let prop = null;
        if (propertyId) {
          prop = await tx.gscProperty.findFirst({ where: { tenantId, id: propertyId } });
        } else if (brandId) {
          const mapping = await tx.internalResourceMapping.findFirst({
            where: {
              tenantId,
              internalId: brandId,
              resource: { provider: 'GOOGLE_SEARCH_CONSOLE' },
            },
            include: { resource: true },
          });
          if (mapping) {
            prop = await tx.gscProperty.findFirst({
              where: {
                tenantId,
                OR: [
                  { propertyUrl: mapping.resource.externalResourceId },
                  { resourceId: mapping.resourceId },
                ],
              },
            });
          }
        }

        if (!prop) {
          prop = await tx.gscProperty.findFirst({
            where: { tenantId },
          });
        }

        return { activeConnection: conn, property: prop };
      }
    );

    if (!activeConnection || !property) {
      throw new Error('Google Search Console is not connected for this tenant.');
    }

    const siteUrl = property.propertyUrl;
    const storageKey = `${tenantId}:${siteUrl}`;
    let googleSitemaps: Array<Record<string, unknown>> = [];

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

      let apiSuccess = false;

      if (res.ok) {
        const json = await res.json();
        googleSitemaps = json.sitemap || [];
        apiSuccess = true;
      } else {
        logger.warn({ status: res.status }, 'GSC Sitemaps API returned non-OK status');
      }

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

      const allStored = await getStoredSitemaps();

      if (apiSuccess) {
        // If API succeeded, GSC is the absolute source of truth. 
        // Sync local cache to exactly match GSC so deletions reflect instantly.
        allStored[storageKey] = formattedGoogle;
        await saveStoredSitemaps(allStored);
        
        return {
          propertyUrl: siteUrl,
          sitemaps: formattedGoogle,
        };
      } else {
        // If API failed (e.g., rate limit, network issue), fall back to local cache
        return {
          propertyUrl: siteUrl,
          sitemaps: allStored[storageKey] || [],
        };
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to query GSC Sitemaps API');
      const allStored = await getStoredSitemaps();
      return {
        propertyUrl: siteUrl,
        sitemaps: allStored[storageKey] || [],
      };
    }
  }

  /**
   * Submits a sitemap to Google Search Console and registers it in local storage.
   */
  public static async submitSitemap(
    tenantId: string,
    sitemapUrlOrPath: string,
    brandId?: string,
    propertyId?: string
  ): Promise<GscSitemapItem> {
    const { activeConnection, property } = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        const conn = await tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
        });

        let prop = null;
        if (propertyId) {
          prop = await tx.gscProperty.findFirst({ where: { tenantId, id: propertyId } });
        } else if (brandId) {
          const mapping = await tx.internalResourceMapping.findFirst({
            where: {
              tenantId,
              internalId: brandId,
              resource: { provider: 'GOOGLE_SEARCH_CONSOLE' },
            },
            include: { resource: true },
          });
          if (mapping) {
            prop = await tx.gscProperty.findFirst({
              where: {
                tenantId,
                OR: [
                  { propertyUrl: mapping.resource.externalResourceId },
                  { resourceId: mapping.resourceId },
                ],
              },
            });
          }
        }

        if (!prop) {
          prop = await tx.gscProperty.findFirst({
            where: { tenantId },
          });
        }

        return { activeConnection: conn, property: prop };
      }
    );

    if (!activeConnection || !property) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        statusCode: 400,
        message: 'Google Search Console is not connected for this tenant. Please connect an account first.',
      });
    }

    const siteUrl = property.propertyUrl;
    const cleanSite = siteUrl.replace(/\/$/, '');
    const cleanPath = sitemapUrlOrPath.trim().replace(/^\//, '');

    const fullSitemapUrl = cleanPath.startsWith('http')
      ? cleanPath
      : `${cleanSite}/${cleanPath}`;

    // Validate ownership before submission
    this.validateSitemapOwnership(siteUrl, fullSitemapUrl);

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
        throw new AppError({
          code: ErrorCode.CONFLICT,
          statusCode: submitRes.status,
          message: `Google API returned ${submitRes.status}: ${body}`,
        });
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, 'Google Sitemaps submit request failed');
      throw new AppError({
        code: ErrorCode.GOOGLE_AUTH_REVOKED,
        statusCode: 403,
        message: 'Failed to submit sitemap to Google Search Console. Ensure your account is connected and you have verified ownership of this property in GSC.',
        cause: err,
      });
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
    const storageKey = `${tenantId}:${siteUrl}`;
    const list = allStored[storageKey] || [];
    const filtered = list.filter((s) => s.path !== fullSitemapUrl);
    filtered.unshift(newSitemap);
    allStored[storageKey] = filtered;
    await saveStoredSitemaps(allStored);

    return newSitemap;
  }

  /**
   * Deletes a submitted sitemap from Google Search Console and local storage.
   */
  public static async deleteSitemap(
    tenantId: string,
    sitemapUrl: string,
    brandId?: string,
    propertyId?: string
  ): Promise<{ success: boolean }> {
    const { activeConnection, property } = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        const conn = await tx.integrationConnection.findFirst({
          where: { tenantId, status: 'ACTIVE' },
        });

        let prop = null;
        if (propertyId) {
          prop = await tx.gscProperty.findFirst({ where: { tenantId, id: propertyId } });
        } else if (brandId) {
          const mapping = await tx.internalResourceMapping.findFirst({
            where: {
              tenantId,
              internalId: brandId,
              resource: { provider: 'GOOGLE_SEARCH_CONSOLE' },
            },
            include: { resource: true },
          });
          if (mapping) {
            prop = await tx.gscProperty.findFirst({
              where: {
                tenantId,
                OR: [
                  { propertyUrl: mapping.resource.externalResourceId },
                  { resourceId: mapping.resourceId },
                ],
              },
            });
          }
        }

        if (!prop) {
          prop = await tx.gscProperty.findFirst({
            where: { tenantId },
          });
        }

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

        const delRes = await fetch(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property.propertyUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!delRes.ok && delRes.status !== 204) {
          const body = await delRes.text();
          throw new AppError({
            code: ErrorCode.CONFLICT,
            statusCode: delRes.status,
            message: `Google API returned ${delRes.status}: ${body}`,
          });
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        logger.error({ err }, 'Google Sitemaps delete request failed');
        throw new AppError({
          code: ErrorCode.GOOGLE_AUTH_REVOKED,
          statusCode: 403,
          message: 'Failed to delete sitemap from Google Search Console. Ensure your account is connected and you have verified ownership of this property in GSC.',
          cause: err,
        });
      }
    }

    // Remove from local storage
    const allStored = await getStoredSitemaps();
    const storageKey = property ? `${tenantId}:${property.propertyUrl}` : tenantId;
    if (allStored[storageKey]) {
      allStored[storageKey] = allStored[storageKey].filter((s) => s.path !== sitemapUrl);
      await saveStoredSitemaps(allStored);
    }

    return { success: true };
  }
}
