import crypto from 'crypto';
import { logger } from '../../shared/observability/logger';

export interface DnsRecordLookup {
  resolveTxt(hostname: string): Promise<string[][]>;
  resolveCname(hostname: string): Promise<string[]>;
  resolve4?(hostname: string): Promise<string[]>;
}

export type DnsFailureReason =
  | 'VERIFIED'
  | 'MISSING_RECORD'
  | 'TOKEN_MISMATCH'
  | 'DNS_TIMEOUT'
  | 'DNS_ERROR'
  | 'INVALID_HOSTNAME';

export interface DnsVerificationResult {
  verified: boolean;
  reason: DnsFailureReason;
  details?: string;
  checkedAt: Date;
}

interface DnsError extends Error {
  code?: string;
}

class DefaultNodeDnsLookup implements DnsRecordLookup {
  async resolveTxt(hostname: string): Promise<string[][]> {
    const dns = await import('dns').then((m) => m.promises);
    return dns.resolveTxt(hostname);
  }

  async resolveCname(hostname: string): Promise<string[]> {
    const dns = await import('dns').then((m) => m.promises);
    return dns.resolveCname(hostname);
  }

  async resolve4(hostname: string): Promise<string[]> {
    const dns = await import('dns').then((m) => m.promises);
    return dns.resolve4(hostname);
  }
}

const defaultLookup = new DefaultNodeDnsLookup();

export class DnsVerifier {
  private static readonly DEFAULT_TIMEOUT_MS = 5000;

  /**
   * Derives a deterministic, cryptographically unpredictable verification token
   * for a storefront domain, bound to the tenant, brand, domain ID and hostname.
   */
  public static generateStorefrontVerificationToken(
    tenantId: string,
    brandId: string,
    domainId: string,
    hostname: string
  ): string {
    const secret =
      process.env.ENCRYPTION_KEY ||
      process.env.APP_SECRET ||
      'localbi-storefront-domain-verification-salt';
    return crypto
      .createHmac('sha256', secret)
      .update(`${tenantId}:${brandId}:${domainId}:${hostname.toLowerCase().trim()}`)
      .digest('hex')
      .slice(0, 32);
  }

  /**
   * Helper that executes a DNS query with strict timeout handling.
   */
  private static async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    description: string
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`DNS lookup timed out (${timeoutMs}ms) for ${description}`) as DnsError;
        error.code = 'ETIMEOUT';
        reject(error);
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Verifies DNS ownership proof for an agency portal domain.
   * Checks TXT records on the hostname and _localbi-challenge subdomain.
   * Can also check CNAME records pointing to configured agency portal targets.
   */
  public static async verifyPortalDomain(
    hostname: string,
    verificationToken: string,
    options?: {
      dnsLookup?: DnsRecordLookup;
      timeoutMs?: number;
    }
  ): Promise<DnsVerificationResult> {
    const checkedAt = new Date();
    const cleanHost = hostname.toLowerCase().trim();
    const lookup = options?.dnsLookup || defaultLookup;
    const timeoutMs = options?.timeoutMs || this.DEFAULT_TIMEOUT_MS;

    if (!cleanHost || cleanHost.length < 3) {
      return {
        verified: false,
        reason: 'INVALID_HOSTNAME',
        details: 'Hostname is empty or malformed',
        checkedAt,
      };
    }

    const hostnamesToCheck = [cleanHost, `_localbi-challenge.${cleanHost}`];
    const txtRecords: string[][] = [];
    let timedOut = false;
    let lookupError: Error | null = null;

    for (const host of hostnamesToCheck) {
      try {
        const records = await this.executeWithTimeout(
          () => lookup.resolveTxt(host),
          timeoutMs,
          `TXT ${host}`
        );
        if (records && records.length > 0) {
          txtRecords.push(...records);
        }
      } catch (err: unknown) {
        const dnsErr = err as DnsError;
        if (dnsErr.code === 'ETIMEOUT') {
          timedOut = true;
        } else if (
          dnsErr.code !== 'ENOTFOUND' &&
          dnsErr.code !== 'ENODATA' &&
          dnsErr.code !== 'NODATA' &&
          dnsErr.code !== 'SERVFAIL'
        ) {
          lookupError = dnsErr;
        }
      }
    }

    // Inspect collected TXT entries
    if (txtRecords.length > 0) {
      for (const entry of txtRecords) {
        const combined = entry.join('').trim();
        // Support either exact token or "localbi-verify=<token>"
        if (
          combined === verificationToken ||
          combined === `localbi-verify=${verificationToken}` ||
          combined.toLowerCase() === `localbi-verify=${verificationToken.toLowerCase()}`
        ) {
          logger.info(
            { hostname: cleanHost, reason: 'VERIFIED' },
            'Portal domain ownership successfully verified via DNS TXT record'
          );
          return {
            verified: true,
            reason: 'VERIFIED',
            checkedAt,
          };
        }
      }
    }

    // Also check CNAME as fallback ownership proof if configured
    try {
      const cnames = await this.executeWithTimeout(
        () => lookup.resolveCname(cleanHost),
        timeoutMs,
        `CNAME ${cleanHost}`
      );
      const portalCnameTarget = (process.env.PORTAL_CNAME_TARGET || 'portal.localbi.app').toLowerCase();
      if (
        cnames &&
        cnames.some(
          (c) =>
            c.toLowerCase().includes(portalCnameTarget) ||
            c.toLowerCase().includes('portal.localbi.app')
        )
      ) {
        logger.info(
          { hostname: cleanHost, reason: 'VERIFIED' },
          'Portal domain ownership successfully verified via DNS CNAME record'
        );
        return {
          verified: true,
          reason: 'VERIFIED',
          checkedAt,
        };
      }
    } catch (err: unknown) {
      const dnsErr = err as DnsError;
      if (dnsErr.code === 'ETIMEOUT') {
        timedOut = true;
      }
    }

    if (timedOut) {
      logger.warn(
        { hostname: cleanHost, reason: 'DNS_TIMEOUT' },
        'Portal domain DNS verification timed out'
      );
      return {
        verified: false,
        reason: 'DNS_TIMEOUT',
        details: `DNS lookup timed out after ${timeoutMs}ms. Propagation may still be in progress.`,
        checkedAt,
      };
    }

    if (lookupError) {
      logger.warn(
        { hostname: cleanHost, reason: 'DNS_ERROR' },
        'Portal domain DNS query encountered an unexpected resolver error'
      );
      return {
        verified: false,
        reason: 'DNS_ERROR',
        details: lookupError.message,
        checkedAt,
      };
    }

    if (txtRecords.length > 0) {
      return {
        verified: false,
        reason: 'TOKEN_MISMATCH',
        details: 'DNS TXT records found, but verification token did not match expected value.',
        checkedAt,
      };
    }

    return {
      verified: false,
      reason: 'MISSING_RECORD',
      details: 'No matching DNS TXT verification record was detected. Please verify your DNS settings.',
      checkedAt,
    };
  }

  /**
   * Verifies DNS records for a client-owned storefront domain.
   * Checks CNAME (pointing to localbi or vercel-dns), A record (76.76.21.21),
   * or TXT record containing the cryptographic storefront verification token.
   */
  public static async verifyStorefrontDomain(
    hostname: string,
    expectedToken: string,
    options?: {
      dnsLookup?: DnsRecordLookup;
      timeoutMs?: number;
    }
  ): Promise<DnsVerificationResult> {
    const checkedAt = new Date();
    const cleanHost = hostname.toLowerCase().trim();
    const lookup = options?.dnsLookup || defaultLookup;
    const timeoutMs = options?.timeoutMs || this.DEFAULT_TIMEOUT_MS;

    if (!cleanHost || cleanHost.length < 3) {
      return {
        verified: false,
        reason: 'INVALID_HOSTNAME',
        details: 'Hostname is empty or malformed',
        checkedAt,
      };
    }

    let timedOut = false;

    // 1. Check CNAME (common for subdomains like www.example.com)
    if (cleanHost.split('.').length > 2) {
      try {
        const cnames = await this.executeWithTimeout(
          () => lookup.resolveCname(cleanHost),
          timeoutMs,
          `CNAME ${cleanHost}`
        );
        const validCnames = ['vercel-dns.com', 'localbi', 'sites.localbi.app'];
        if (
          cnames &&
          cnames.some((c) => validCnames.some((valid) => c.toLowerCase().includes(valid)))
        ) {
          logger.info(
            { hostname: cleanHost, reason: 'VERIFIED' },
            'Storefront domain ownership successfully verified via CNAME'
          );
          return {
            verified: true,
            reason: 'VERIFIED',
            checkedAt,
          };
        }
      } catch (err: unknown) {
        const dnsErr = err as DnsError;
        if (dnsErr.code === 'ETIMEOUT') timedOut = true;
      }
    }

    // 2. Check A record (common for apex root domains like example.com)
    if (lookup.resolve4) {
      try {
        const ips = await this.executeWithTimeout(
          () => lookup.resolve4!(cleanHost),
          timeoutMs,
          `A ${cleanHost}`
        );
        const validIps = ['76.76.21.21'];
        if (ips && ips.some((ip) => validIps.includes(ip))) {
          logger.info(
            { hostname: cleanHost, reason: 'VERIFIED' },
            'Storefront domain ownership successfully verified via A record'
          );
          return {
            verified: true,
            reason: 'VERIFIED',
            checkedAt,
          };
        }
      } catch (err: unknown) {
        const dnsErr = err as DnsError;
        if (dnsErr.code === 'ETIMEOUT') timedOut = true;
      }
    }

    // 3. Check TXT record (cryptographic ownership challenge)
    const hostnamesToCheck = [cleanHost, `_localbi-challenge.${cleanHost}`];
    const txtRecords: string[][] = [];

    for (const host of hostnamesToCheck) {
      try {
        const records = await this.executeWithTimeout(
          () => lookup.resolveTxt(host),
          timeoutMs,
          `TXT ${host}`
        );
        if (records && records.length > 0) {
          txtRecords.push(...records);
        }
      } catch (err: unknown) {
        const dnsErr = err as DnsError;
        if (dnsErr.code === 'ETIMEOUT') timedOut = true;
      }
    }

    if (txtRecords.length > 0) {
      for (const entry of txtRecords) {
        const combined = entry.join('').trim();
        if (
          combined === expectedToken ||
          combined === `localbi-verify=${expectedToken}` ||
          combined === `localbi-site-verification=${expectedToken}` ||
          combined.toLowerCase() === `localbi-verify=${expectedToken.toLowerCase()}`
        ) {
          logger.info(
            { hostname: cleanHost, reason: 'VERIFIED' },
            'Storefront domain ownership successfully verified via TXT record'
          );
          return {
            verified: true,
            reason: 'VERIFIED',
            checkedAt,
          };
        }
      }
    }

    if (timedOut) {
      logger.warn(
        { hostname: cleanHost, reason: 'DNS_TIMEOUT' },
        'Storefront domain DNS lookup timed out'
      );
      return {
        verified: false,
        reason: 'DNS_TIMEOUT',
        details: `DNS lookup timed out after ${timeoutMs}ms. Propagation may still be in progress.`,
        checkedAt,
      };
    }

    if (txtRecords.length > 0) {
      return {
        verified: false,
        reason: 'TOKEN_MISMATCH',
        details: 'DNS TXT records detected, but verification token did not match expected value.',
        checkedAt,
      };
    }

    return {
      verified: false,
      reason: 'MISSING_RECORD',
      details:
        'No valid CNAME (cname.vercel-dns.com), A record (76.76.21.21), or TXT verification record detected.',
      checkedAt,
    };
  }
}
