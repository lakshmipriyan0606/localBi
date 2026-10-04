import { SafePageCrawler } from '../seo-intelligence/safe-page-crawler';
import { BacklinkRepository } from './backlink-repository';
import { logger } from '@/shared/observability/logger';

export interface BacklinkVerificationResult {
  verified: boolean;
  sourceUrl: string;
  targetUrl: string;
  foundHref?: string | null;
  anchorText?: string | null;
  isNofollow?: boolean;
  httpStatus?: number;
  message: string;
}

export class BacklinkVerificationService {
  /**
   * Safely verifies whether a known external linking URL contains a live hyperlink pointing to the target URL.
   * Leverages SafePageCrawler to ensure strict SSRF defenses (blocking private IPs, localhost, metadata).
   */
  public static async verifyLink(
    linkingUrl: string,
    targetUrl: string
  ): Promise<BacklinkVerificationResult> {
    const cleanTarget = BacklinkRepository.canonicalizeUrl(targetUrl);

    try {
      const crawlResult = await SafePageCrawler.crawlPage(linkingUrl, {
        timeoutMs: 10000,
        maxBytes: 1024 * 1024, // 1MB bounded
        maxRedirects: 3,
      });

      if (!crawlResult.success || !crawlResult.signals) {
        return {
          verified: false,
          sourceUrl: linkingUrl,
          targetUrl,
          httpStatus: crawlResult.httpStatus,
          message: `Verification crawl failed: ${crawlResult.error || 'Unable to load page'}`,
        };
      }

      // Check external links for matching canonical target URL
      const matchingLink = crawlResult.signals.externalLinks.find((l) => {
        const canonicalHref = BacklinkRepository.canonicalizeUrl(l.href);
        return canonicalHref === cleanTarget || canonicalHref.startsWith(cleanTarget);
      });

      if (matchingLink) {
        return {
          verified: true,
          sourceUrl: linkingUrl,
          targetUrl,
          foundHref: matchingLink.href,
          anchorText: matchingLink.text,
          isNofollow: matchingLink.isNofollow,
          httpStatus: crawlResult.httpStatus,
          message: 'Link detected on this page.',
        };
      }

      return {
        verified: false,
        sourceUrl: linkingUrl,
        targetUrl,
        httpStatus: crawlResult.httpStatus,
        message: 'Page was successfully crawled, but no matching hyperlink to target URL was found.',
      };
    } catch (err: any) {
      logger.error({ error: err.message, linkingUrl }, 'Exception during backlink verification');
      return {
        verified: false,
        sourceUrl: linkingUrl,
        targetUrl,
        message: `Verification error: ${err.message}`,
      };
    }
  }
}
