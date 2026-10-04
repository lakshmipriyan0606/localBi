import { describe, it, expect } from 'vitest';
import { SafePageCrawler } from '@/modules/seo-intelligence/safe-page-crawler';

describe('SafePageCrawler SSRF & Security Defense Unit Tests', () => {
  describe('isPrivateOrBlockedIp', () => {
    it('blocks loopback addresses (127.0.0.1, 127.0.0.2, 127.1.2.3)', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('127.0.0.1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('127.0.0.2')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('127.255.255.255')).toBe(true);
    });

    it('blocks private class A (10.0.0.0/8)', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('10.0.0.1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('10.254.1.1')).toBe(true);
    });

    it('blocks private class B (172.16.0.0/12)', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('172.16.0.1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('172.20.10.5')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('172.31.255.255')).toBe(true);
      // Public IPs outside 172.16-172.31 should NOT be blocked
      expect(SafePageCrawler.isPrivateOrBlockedIp('172.15.0.1')).toBe(false);
      expect(SafePageCrawler.isPrivateOrBlockedIp('172.32.0.1')).toBe(false);
    });

    it('blocks private class C (192.168.0.0/16)', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('192.168.0.1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('192.168.1.100')).toBe(true);
    });

    it('blocks AWS/Azure/GCP cloud metadata IP (169.254.169.254) and link-local', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('169.254.169.254')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('169.254.0.1')).toBe(true);
    });

    it('blocks current network 0.0.0.0/8', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('0.0.0.0')).toBe(true);
    });

    it('blocks IPv6 loopback (::1) and unspecified (::)', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('::1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('::')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('blocks IPv6 unique local (fc00::/7)', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('fc00::1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('fd12:3456:789a::1')).toBe(true);
    });

    it('blocks IPv6 link-local (fe80::/10)', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('fe80::1')).toBe(true);
    });

    it('blocks IPv4-mapped IPv6 loopback and private ranges', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('::ffff:127.0.0.1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('::ffff:10.0.0.1')).toBe(true);
      expect(SafePageCrawler.isPrivateOrBlockedIp('::ffff:169.254.169.254')).toBe(true);
    });

    it('allows valid public routable IP addresses', () => {
      expect(SafePageCrawler.isPrivateOrBlockedIp('8.8.8.8')).toBe(false);
      expect(SafePageCrawler.isPrivateOrBlockedIp('1.1.1.1')).toBe(false);
      expect(SafePageCrawler.isPrivateOrBlockedIp('142.250.190.46')).toBe(false);
    });
  });

  describe('validateUrlAndResolve', () => {
    it('rejects unsupported protocols like file:, ftp:, gopher:, javascript:', async () => {
      const fileRes = await SafePageCrawler.validateUrlAndResolve('file:///etc/passwd');
      expect(fileRes.valid).toBe(false);
      expect(fileRes.errorCode).toBe('INVALID_PROTOCOL');

      const ftpRes = await SafePageCrawler.validateUrlAndResolve('ftp://example.com/file.txt');
      expect(ftpRes.valid).toBe(false);

      const jsRes = await SafePageCrawler.validateUrlAndResolve('javascript:alert(1)');
      expect(jsRes.valid).toBe(false);
    });

    it('blocks explicit localhost and internal hostname extensions', async () => {
      const local1 = await SafePageCrawler.validateUrlAndResolve('http://localhost:3000/api');
      expect(local1.valid).toBe(false);
      expect(local1.errorCode).toBe('PRIVATE_IP_BLOCKED');

      const local2 = await SafePageCrawler.validateUrlAndResolve('http://service.internal/status');
      expect(local2.valid).toBe(false);

      const local3 = await SafePageCrawler.validateUrlAndResolve('http://app.local');
      expect(local3.valid).toBe(false);
    });

    it('blocks direct private IP addresses in URL', async () => {
      const res = await SafePageCrawler.validateUrlAndResolve('http://169.254.169.254/latest/meta-data');
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('PRIVATE_IP_BLOCKED');
    });
  });

  describe('extractSeoSignals', () => {
    it('extracts Title, Meta Description, Canonical, Headings, and Word Count accurately', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Authentic Oud Perfume in Chennai | Aalim Perfumes</title>
          <meta name="description" content="Discover royal artisanal oud fragrances and attar in Chennai. Visit our Mannadi store today." />
          <link rel="canonical" href="https://aalimperfumes.com/services/oud-chennai" />
          <meta name="robots" content="index, follow" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": "Aalim Perfumes"
            }
          </script>
        </head>
        <body>
          <header><nav><a href="/home">Home</a></nav></header>
          <main>
            <h1>Premium Oud Perfume in Chennai</h1>
            <h2>Handcrafted Artisanal Blends</h2>
            <p>We source authentic Cambodian and Indian agarwood. Our master perfumers blend traditional attars that last 24 hours.</p>
            <h2>Frequently Asked Questions</h2>
            <p>Our store is open 7 days a week.</p>
            <a href="https://aalimperfumes.com/products/white-oud">White Oud</a>
            <a href="https://instagram.com/aalim">Follow us</a>
            <img src="/img/oud.jpg" alt="Artisanal Oud Bottle" />
            <img src="/img/store.jpg" />
          </main>
          <footer><p>&copy; 2026 Aalim Perfumes</p></footer>
        </body>
        </html>
      `;

      const signals = SafePageCrawler.extractSeoSignals(
        html,
        'https://aalimperfumes.com/services/oud-chennai',
        'https://aalimperfumes.com/services/oud-chennai',
        200,
        'oud perfume chennai',
        'Chennai'
      );

      expect(signals.title).toBe('Authentic Oud Perfume in Chennai | Aalim Perfumes');
      expect(signals.metaDescription).toBe(
        'Discover royal artisanal oud fragrances and attar in Chennai. Visit our Mannadi store today.'
      );
      expect(signals.canonical).toBe('https://aalimperfumes.com/services/oud-chennai');
      expect(signals.robots).toBe('index, follow');
      expect(signals.headings.h1).toContain('Premium Oud Perfume in Chennai');
      expect(signals.headings.h2).toContain('Handcrafted Artisanal Blends');
      expect(signals.structuredDataTypes).toContain('LocalBusiness');
      expect(signals.internalLinkCount).toBe(2); // /home and /products/white-oud
      expect(signals.externalLinkCount).toBe(1); // instagram
      expect(signals.imageCount).toBe(2);
      expect(signals.missingAltCount).toBe(1); // one img lacked alt
      expect(signals.indexability.isIndexable).toBe(true);
      expect(signals.keywordOccurrences.inTitle).toBe(true);
      expect(signals.keywordOccurrences.inH1).toBe(true);
    });

    it('correctly marks non-indexable status when HTTP 404 or noindex tag present', () => {
      const html = `<html><head><meta name="robots" content="noindex, nofollow" /></head><body>Page</body></html>`;
      const signals = SafePageCrawler.extractSeoSignals(
        html,
        'https://example.com/blocked',
        'https://example.com/blocked',
        404
      );

      expect(signals.indexability.isIndexable).toBe(false);
      expect(signals.indexability.reason).toContain('HTTP status 404');
    });
  });
});
