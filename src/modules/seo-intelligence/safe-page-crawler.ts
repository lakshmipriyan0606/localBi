import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { logger } from '@/shared/observability/logger';
import { SeoPageSignals } from './seo-types';

export interface CrawlerFetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  userAgent?: string;
  keywordContext?: string;
  locationContext?: string;
}

export interface CrawlResult {
  success: boolean;
  url: string;
  finalUrl: string;
  httpStatus: number;
  signals: SeoPageSignals | null;
  error?: string;
  errorCode?:
    | 'INVALID_PROTOCOL'
    | 'PRIVATE_IP_BLOCKED'
    | 'DNS_RESOLUTION_FAILED'
    | 'TOO_MANY_REDIRECTS'
    | 'RESPONSE_TOO_LARGE'
    | 'UNSUPPORTED_MIME_TYPE'
    | 'TIMEOUT'
    | 'HTTP_ERROR'
    | 'FETCH_FAILED';
}

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_BYTES = 1024 * 1024; // 1 MB limit to prevent memory blowout
const USER_AGENT = 'Mozilla/5.0 (compatible; LocalBi-SeoBot/1.0; +https://localbi.com/bot)';

export class SafePageCrawler {
  /**
   * Strictly validates whether an IP address belongs to any private, loopback,
   * link-local, carrier-grade NAT, or cloud metadata network.
   */
  public static isPrivateOrBlockedIp(ipAddress: string): boolean {
    const cleanIp = ipAddress.trim().toLowerCase();

    // Check IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
    if (cleanIp.startsWith('::ffff:')) {
      const v4Part = cleanIp.slice(7);
      if (net.isIPv4(v4Part)) {
        return this.isPrivateOrBlockedIp(v4Part);
      }
    }

    if (net.isIPv4(cleanIp)) {
      const parts = cleanIp.split('.').map((p) => parseInt(p, 10));
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        return true;
      }
      const [p0, p1] = parts as [number, number, number, number];

      // 0.0.0.0/8 (Current network)
      if (p0 === 0) return true;

      // 127.0.0.0/8 (Loopback)
      if (p0 === 127) return true;

      // 10.0.0.0/8 (Private RFC 1918)
      if (p0 === 10) return true;

      // 172.16.0.0/12 (Private RFC 1918: 172.16.x.x - 172.31.x.x)
      if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;

      // 192.168.0.0/16 (Private RFC 1918)
      if (p0 === 192 && p1 === 168) return true;

      // 169.254.0.0/16 (Link-local / AWS / Azure / GCP Metadata 169.254.169.254)
      if (p0 === 169 && p1 === 254) return true;

      // 100.64.0.0/10 (Carrier grade NAT)
      if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;

      return false;
    }

    if (net.isIPv6(cleanIp)) {
      // Loopback ::1
      if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;
      // Unspecified ::
      if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true;
      // Unique Local Addresses (fc00::/7) -> fc00 to fdff
      if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;
      // Link-Local Addresses (fe80::/10) -> fe80 to febf
      if (/^fe[89ab]/i.test(cleanIp)) return true;

      return false;
    }

    return true; // Unknown IP formats are blocked by default
  }

  /**
   * Validates target URL scheme and resolves DNS addresses to verify they are public.
   */
  public static async validateUrlAndResolve(
    rawUrl: string
  ): Promise<{ valid: boolean; resolvedIp?: string; urlObj?: URL; error?: string; errorCode?: CrawlResult['errorCode'] }> {
    let urlObj: URL;
    try {
      urlObj = new URL(rawUrl);
    } catch {
      return { valid: false, error: 'Malformed URL', errorCode: 'INVALID_PROTOCOL' };
    }

    // Enforce HTTP / HTTPS only
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return {
        valid: false,
        error: `Protocol "${urlObj.protocol}" is blocked. Only http: and https: are permitted.`,
        errorCode: 'INVALID_PROTOCOL',
      };
    }

    const hostname = urlObj.hostname.toLowerCase();

    // Block explicit localhost and internal domain patterns
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.arpa') ||
      hostname.endsWith('.lan')
    ) {
      return {
        valid: false,
        error: `Internal hostname "${hostname}" is blocked.`,
        errorCode: 'PRIVATE_IP_BLOCKED',
      };
    }

    // Direct IP address check
    if (net.isIP(hostname)) {
      if (this.isPrivateOrBlockedIp(hostname)) {
        return {
          valid: false,
          error: `Direct private IP "${hostname}" is blocked.`,
          errorCode: 'PRIVATE_IP_BLOCKED',
        };
      }
      return { valid: true, resolvedIp: hostname, urlObj };
    }

    // Resolve DNS
    try {
      const addresses = await dns.lookup(hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        return {
          valid: false,
          error: `DNS lookup returned no addresses for "${hostname}".`,
          errorCode: 'DNS_RESOLUTION_FAILED',
        };
      }

      for (const addr of addresses) {
        if (this.isPrivateOrBlockedIp(addr.address)) {
          return {
            valid: false,
            error: `Hostname "${hostname}" resolved to prohibited address ${addr.address}.`,
            errorCode: 'PRIVATE_IP_BLOCKED',
          };
        }
      }

      return { valid: true, resolvedIp: addresses[0]?.address, urlObj };
    } catch (err: any) {
      return {
        valid: false,
        error: `DNS lookup failed for "${hostname}": ${err.message}`,
        errorCode: 'DNS_RESOLUTION_FAILED',
      };
    }
  }

  /**
   * Safely crawls a single web page with SSRF protection, redirect verification,
   * size limits, and timeout enforcement.
   */
  public static async crawlPage(
    initialUrl: string,
    options: CrawlerFetchOptions = {}
  ): Promise<CrawlResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

    let currentUrl = initialUrl;
    let redirectCount = 0;

    while (redirectCount <= maxRedirects) {
      // 1. Validate URL & DNS safety on EVERY hop (initial request and each redirect)
      const validation = await this.validateUrlAndResolve(currentUrl);
      if (!validation.valid || !validation.urlObj || !validation.resolvedIp) {
        return {
          success: false,
          url: initialUrl,
          finalUrl: currentUrl,
          httpStatus: 0,
          signals: null,
          error: validation.error,
          errorCode: validation.errorCode,
        };
      }

      const { urlObj, resolvedIp } = validation;

      try {
        const fetchResult = await this.performSingleFetch(urlObj, resolvedIp, {
          timeoutMs,
          maxBytes,
          userAgent: options.userAgent ?? USER_AGENT,
        });

        // Handle Redirects (301, 302, 303, 307, 308)
        if (
          fetchResult.status >= 300 &&
          fetchResult.status < 400 &&
          fetchResult.headers['location']
        ) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            return {
              success: false,
              url: initialUrl,
              finalUrl: currentUrl,
              httpStatus: fetchResult.status,
              signals: null,
              error: `Maximum redirect limit of ${maxRedirects} exceeded.`,
              errorCode: 'TOO_MANY_REDIRECTS',
            };
          }

          // Resolve relative redirect against current URL
          const nextLocation = fetchResult.headers['location'];
          const resolvedRedirectUrl = new URL(nextLocation, urlObj).toString();
          currentUrl = resolvedRedirectUrl;
          continue;
        }

        // Check Content-Type (must be HTML)
        const contentType = (fetchResult.headers['content-type'] || '').toLowerCase();
        if (
          !contentType.includes('text/html') &&
          !contentType.includes('application/xhtml+xml') &&
          !contentType.includes('text/plain')
        ) {
          return {
            success: false,
            url: initialUrl,
            finalUrl: currentUrl,
            httpStatus: fetchResult.status,
            signals: null,
            error: `Unsupported MIME type: "${contentType}". Only text/html is supported.`,
            errorCode: 'UNSUPPORTED_MIME_TYPE',
          };
        }

        // Extract Structured Page Signals
        const signals = this.extractSeoSignals(
          fetchResult.bodyText,
          initialUrl,
          currentUrl,
          fetchResult.status,
          options.keywordContext,
          options.locationContext
        );

        return {
          success: fetchResult.status >= 200 && fetchResult.status < 400,
          url: initialUrl,
          finalUrl: currentUrl,
          httpStatus: fetchResult.status,
          signals,
          error: fetchResult.status >= 400 ? `HTTP status ${fetchResult.status}` : undefined,
          errorCode: fetchResult.status >= 400 ? 'HTTP_ERROR' : undefined,
        };
      } catch (err: any) {
        const isTimeout = err.message?.includes('timeout') || err.code === 'ETIMEDOUT';
        const isTooLarge = err.message?.includes('Maximum payload size exceeded');
        return {
          success: false,
          url: initialUrl,
          finalUrl: currentUrl,
          httpStatus: 0,
          signals: null,
          error: err.message,
          errorCode: isTimeout ? 'TIMEOUT' : isTooLarge ? 'RESPONSE_TOO_LARGE' : 'FETCH_FAILED',
        };
      }
    }

    return {
      success: false,
      url: initialUrl,
      finalUrl: currentUrl,
      httpStatus: 0,
      signals: null,
      error: 'Redirect loop or limit exceeded',
      errorCode: 'TOO_MANY_REDIRECTS',
    };
  }

  /**
   * Executes a bounded HTTP request with strict socket timeout and byte limits.
   */
  private static performSingleFetch(
    urlObj: URL,
    resolvedIp: string,
    opts: { timeoutMs: number; maxBytes: number; userAgent: string }
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; bodyText: string }> {
    return new Promise((resolve, reject) => {
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const port = urlObj.port ? parseInt(urlObj.port, 10) : isHttps ? 443 : 80;

      const reqOptions: https.RequestOptions = {
        host: resolvedIp,
        port,
        path: `${urlObj.pathname}${urlObj.search}`,
        method: 'GET',
        headers: {
          Host: urlObj.host, // Send proper Host header for virtual hosts / SNI
          'User-Agent': opts.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity', // Avoid compressed payload issues
          Connection: 'close',
        },
        timeout: opts.timeoutMs,
        servername: isHttps ? urlObj.hostname : undefined, // SNI support
      };

      let timer: NodeJS.Timeout | null = null;

      const req = client.request(reqOptions, (res) => {
        let receivedBytes = 0;
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          receivedBytes += chunk.length;
          if (receivedBytes > opts.maxBytes) {
            req.destroy(new Error(`Maximum payload size exceeded (${opts.maxBytes} bytes limit)`));
            return;
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          if (timer) clearTimeout(timer);
          const bodyText = Buffer.concat(chunks).toString('utf-8');
          resolve({
            status: res.statusCode || 200,
            headers: res.headers,
            bodyText,
          });
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error(`Connection timed out after ${opts.timeoutMs}ms`));
      });

      req.on('error', (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      });

      timer = setTimeout(() => {
        req.destroy(new Error(`Fetch timed out after ${opts.timeoutMs}ms`));
      }, opts.timeoutMs + 500);

      req.end();
    });
  }

  /**
   * Deterministically extracts SEO signals from HTML without running scripts or external dependencies.
   */
  public static extractSeoSignals(
    html: string,
    initialUrl: string,
    finalUrl: string,
    httpStatus: number,
    keywordContext?: string,
    locationContext?: string
  ): SeoPageSignals {
    // 1. Clean out scripts, styles, svg, and comments
    const sanitizedHtml = html
      .replace(/<!--[\s\S]*?-->/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '');

    // 2. Extract Title
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const title = titleMatch?.[1] ? this.cleanText(titleMatch[1]) : null;

    // 3. Extract Meta Description
    const metaDescMatch =
      /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i.exec(html) ||
      /<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i.exec(html);
    const metaDescription = metaDescMatch?.[1] ? this.cleanText(metaDescMatch[1]) : null;

    // 4. Extract Canonical URL
    const canonicalMatch =
      /<link[^>]*rel=["']canonical["'][^>]*href=["']([\s\S]*?)["']/i.exec(html) ||
      /<link[^>]*href=["']([\s\S]*?)["'][^>]*rel=["']canonical["']/i.exec(html);
    const canonical = canonicalMatch?.[1] ? canonicalMatch[1].trim() : null;

    // 5. Extract Meta Robots
    const robotsMatch =
      /<meta[^>]*name=["']robots["'][^>]*content=["']([\s\S]*?)["']/i.exec(html) ||
      /<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']robots["']/i.exec(html);
    const robots = robotsMatch?.[1] ? robotsMatch[1].trim().toLowerCase() : null;

    // 6. Extract Headings (H1, H2, H3)
    const h1 = this.extractHeadingTags(sanitizedHtml, 'h1');
    const h2 = this.extractHeadingTags(sanitizedHtml, 'h2');
    const h3 = this.extractHeadingTags(sanitizedHtml, 'h3');

    // 7. Extract Main Body Content (excluding navigation, headers, footers, forms)
    const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(sanitizedHtml);
    let bodyHtml = bodyMatch?.[1] || sanitizedHtml;
    // Strip header, footer, nav, aside elements for main content
    bodyHtml = bodyHtml
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '');

    const strippedText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = strippedText.length > 0 ? strippedText.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;

    // Bounded main content summary (first 400 chars)
    const mainContentSummary = strippedText.slice(0, 400).trim();

    // 8. Links analysis
    let internalLinkCount = 0;
    let externalLinkCount = 0;
    try {
      const baseDomain = new URL(finalUrl).hostname.replace(/^www\./, '');
      const linkRegex = /<a[^>]*href=["']([^"']+)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(html)) !== null) {
        const href = m[1]?.trim();
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          continue;
        }
        try {
          const resolved = new URL(href, finalUrl);
          const linkDomain = resolved.hostname.replace(/^www\./, '');
          if (linkDomain === baseDomain) {
            internalLinkCount++;
          } else {
            externalLinkCount++;
          }
        } catch {
          // relative link
          internalLinkCount++;
        }
      }
    } catch {
      // Fallback
    }

    // 9. Images and Alt text
    let imageCount = 0;
    let missingAltCount = 0;
    const imgRegex = /<img([^>]+)>/gi;
    let imgM: RegExpExecArray | null;
    while ((imgM = imgRegex.exec(html)) !== null) {
      imageCount++;
      const tagContent = imgM[1] || '';
      if (!/alt=["'][^"']+["']/i.test(tagContent)) {
        missingAltCount++;
      }
    }

    // 10. Structured Data (JSON-LD schema types)
    const structuredDataTypes: string[] = [];
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jsonM: RegExpExecArray | null;
    while ((jsonM = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(jsonM[1] || '{}');
        const types = this.extractJsonLdTypes(parsed);
        for (const t of types) {
          if (!structuredDataTypes.includes(t)) structuredDataTypes.push(t);
        }
      } catch {
        // Malformed JSON-LD ignored
      }
    }

    // 11. FAQ Signals
    const faqSignals: Array<{ question: string; answerSnippet?: string }> = [];
    // Check for schema FAQPage
    if (structuredDataTypes.includes('FAQPage')) {
      faqSignals.push({ question: 'Structured FAQPage Schema detected' });
    }
    // Also look for common FAQ heading or details/summary tags
    const faqHeadings = [...h2, ...h3].filter((h) => /faq|frequently asked|questions/i.test(h));
    for (const q of faqHeadings.slice(0, 5)) {
      faqSignals.push({ question: q });
    }

    // 12. Service topics & location signals
    const serviceTopics = this.extractTopicSignals(strippedText, h1, h2);
    const locationSignals = this.extractLocationSignals(strippedText, title, locationContext);

    // 13. Keyword Occurrences
    const kw = keywordContext?.trim().toLowerCase() || '';
    const kwTokens = kw.split(/\s+/).filter((w) => w.length > 2);
    const hasKw = (str: string | null) => {
      if (!str || !kw) return false;
      const lower = str.toLowerCase();
      return lower.includes(kw) || (kwTokens.length > 1 && kwTokens.every((t) => lower.includes(t)));
    };

    const inTitle = hasKw(title);
    const inMetaDescription = hasKw(metaDescription);
    const inH1 = h1.some((h) => hasKw(h));
    const inH2 = h2.some((h) => hasKw(h));

    let inBodyCount = 0;
    if (kw && strippedText) {
      const escapedKw = kw.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const matches = strippedText.match(new RegExp(`\\b${escapedKw}\\b`, 'gi'));
      inBodyCount = matches ? matches.length : 0;
    }

    // 14. Indexability assessment
    let isIndexable = httpStatus >= 200 && httpStatus < 300;
    let reason = 'Page signals indicate regular indexability (HTTP 200)';
    if (httpStatus >= 400) {
      isIndexable = false;
      reason = `HTTP status ${httpStatus} prevents indexing`;
    } else if (robots && (robots.includes('noindex') || robots.includes('none'))) {
      isIndexable = false;
      reason = `Meta robots contains "${robots}"`;
    } else if (canonical && !this.isCanonicalSelfMatching(finalUrl, canonical)) {
      reason = `Canonical points to different URL: ${canonical}`;
    }

    return {
      url: initialUrl,
      finalUrl,
      httpStatus,
      title,
      metaDescription,
      canonical,
      robots,
      headings: { h1, h2, h3 },
      mainContentSummary,
      wordCount,
      internalLinkCount,
      externalLinkCount,
      imageCount,
      missingAltCount,
      structuredDataTypes,
      faqSignals,
      serviceTopics,
      locationSignals,
      keywordOccurrences: {
        inTitle,
        inMetaDescription,
        inH1,
        inH2,
        inBodyCount,
      },
      indexability: {
        isIndexable,
        reason,
      },
      language: this.extractHtmlLang(html),
      capturedAt: new Date(),
    };
  }

  private static cleanText(raw: string): string {
    return raw
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static extractHeadingTags(html: string, tag: 'h1' | 'h2' | 'h3'): string[] {
    const results: string[] = [];
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      if (match[1]) {
        const text = this.cleanText(match[1]);
        if (text && !results.includes(text)) {
          results.push(text);
        }
      }
    }
    return results;
  }

  private static extractJsonLdTypes(obj: any): string[] {
    const types: string[] = [];
    if (!obj || typeof obj !== 'object') return types;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        types.push(...this.extractJsonLdTypes(item));
      }
      return types;
    }

    if (obj['@type']) {
      if (typeof obj['@type'] === 'string') {
        types.push(obj['@type']);
      } else if (Array.isArray(obj['@type'])) {
        types.push(...obj['@type']);
      }
    }

    if (obj['@graph'] && Array.isArray(obj['@graph'])) {
      types.push(...this.extractJsonLdTypes(obj['@graph']));
    }

    return types;
  }

  private static extractHtmlLang(html: string): string | null {
    const match = /<html[^>]*lang=["']([^"']+)["']/i.exec(html);
    return match?.[1] ? match[1].trim() : null;
  }

  private static isCanonicalSelfMatching(finalUrl: string, canonical: string): boolean {
    try {
      const u1 = new URL(finalUrl);
      const u2 = new URL(canonical, finalUrl);
      return (
        u1.hostname.replace(/^www\./, '') === u2.hostname.replace(/^www\./, '') &&
        u1.pathname.replace(/\/$/, '') === u2.pathname.replace(/\/$/, '')
      );
    } catch {
      return false;
    }
  }

  private static extractTopicSignals(text: string, h1: string[], h2: string[]): string[] {
    const topics: string[] = [];
    const candidates = [...h1, ...h2];
    for (const c of candidates) {
      if (c.length >= 4 && c.length <= 60 && !topics.includes(c)) {
        topics.push(c);
      }
    }
    return topics.slice(0, 10);
  }

  private static extractLocationSignals(text: string, title: string | null, targetLocation?: string): string[] {
    const locations: string[] = [];
    if (targetLocation && targetLocation.trim().length > 1) {
      const loc = targetLocation.trim();
      const regex = new RegExp(`\\b${loc}\\b`, 'i');
      if (title && regex.test(title)) {
        locations.push(`${loc} (in Title)`);
      }
      if (regex.test(text)) {
        locations.push(`${loc} (in Content)`);
      }
    }
    return locations;
  }
}
