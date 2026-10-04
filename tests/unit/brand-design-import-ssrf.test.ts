import { describe, it, expect } from 'vitest';
import { BrandDesignImportService } from '@/modules/page-builder/brand-design-import';

describe('BrandDesignImportService — SSRF Protection & Design Token Extraction', () => {
  describe('Disallowed IP Detection', () => {
    it('blocks loopback IPv4 addresses', () => {
      expect(BrandDesignImportService.isDisallowedIp('127.0.0.1')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('127.12.34.56')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('127.255.255.255')).toBe(true);
    });

    it('blocks private RFC 1918 IPv4 ranges', () => {
      // 10.0.0.0/8
      expect(BrandDesignImportService.isDisallowedIp('10.0.0.1')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('10.255.255.255')).toBe(true);

      // 172.16.0.0/12
      expect(BrandDesignImportService.isDisallowedIp('172.16.0.1')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('172.31.255.255')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('172.32.0.1')).toBe(false); // public

      // 192.168.0.0/16
      expect(BrandDesignImportService.isDisallowedIp('192.168.1.1')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('192.168.254.254')).toBe(true);
    });

    it('blocks link-local and cloud metadata addresses', () => {
      expect(BrandDesignImportService.isDisallowedIp('169.254.169.254')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('169.254.1.1')).toBe(true);
    });

    it('blocks IPv6 loopback, link-local, and unique local addresses', () => {
      expect(BrandDesignImportService.isDisallowedIp('::1')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('0:0:0:0:0:0:0:1')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('fe80::1')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('fc00::1')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('fd12:3456:789a::1')).toBe(true);
    });

    it('blocks IPv4-mapped IPv6 loopback and private ranges', () => {
      expect(BrandDesignImportService.isDisallowedIp('::ffff:127.0.0.1')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('::ffff:10.0.0.1')).toBe(true);
      expect(BrandDesignImportService.isDisallowedIp('::ffff:169.254.169.254')).toBe(true);
    });

    it('allows valid public IP addresses', () => {
      expect(BrandDesignImportService.isDisallowedIp('8.8.8.8')).toBe(false);
      expect(BrandDesignImportService.isDisallowedIp('1.1.1.1')).toBe(false);
      expect(BrandDesignImportService.isDisallowedIp('93.184.216.34')).toBe(false); // example.com
      expect(BrandDesignImportService.isDisallowedIp('2606:4700:4700::1111')).toBe(false); // Cloudflare public IPv6
    });
  });

  describe('URL Safety Validation', () => {
    it('rejects unsupported protocols', async () => {
      await expect(BrandDesignImportService.validateUrlSafety('ftp://example.com')).rejects.toThrow(
        /Unsupported protocol/
      );
      await expect(BrandDesignImportService.validateUrlSafety('file:///etc/passwd')).rejects.toThrow(
        /Unsupported protocol/
      );
      await expect(BrandDesignImportService.validateUrlSafety('gopher://example.com')).rejects.toThrow(
        /Unsupported protocol/
      );
    });

    it('rejects localhost and local domains', async () => {
      await expect(BrandDesignImportService.validateUrlSafety('http://localhost:3000')).rejects.toThrow(
        /SSRF Protection/
      );
      await expect(BrandDesignImportService.validateUrlSafety('http://sub.localhost')).rejects.toThrow(
        /SSRF Protection/
      );
      await expect(BrandDesignImportService.validateUrlSafety('http://company.internal')).rejects.toThrow(
        /SSRF Protection/
      );
    });

    it('rejects integer / hex encoded IP addresses', async () => {
      await expect(BrandDesignImportService.validateUrlSafety('http://2130706433')).rejects.toThrow(
        /SSRF Protection/
      );
      await expect(BrandDesignImportService.validateUrlSafety('http://0x7f000001')).rejects.toThrow(
        /SSRF Protection/
      );
    });
  });

  describe('Visual Design Token Extraction', () => {
    it('extracts theme-color, typography, and border radius from HTML without copying body text', () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Aalim Perfumes Official</title>
          <meta name="description" content="Luxury artisanal attars and fine fragrances.">
          <meta name="theme-color" content="#b45309">
          <link rel="icon" href="/assets/favicon.ico">
          <meta property="og:image" content="https://example.com/assets/og-brand.png">
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap">
          <style>
            :root {
              --secondary-color: #1e293b;
              --accent-color: #f59e0b;
            }
            .btn { border-radius: 9999px; }
          </style>
        </head>
        <body>
          <h1>Welcome to our store</h1>
          <p>This is proprietary body content that should not be cloned.</p>
        </body>
        </html>
      `;

      const result = BrandDesignImportService.extractDesignTokens(mockHtml, 'https://example.com');

      expect(result.theme.primaryColor).toBe('#b45309');
      expect(result.theme.secondaryColor).toBe('#1e293b');
      expect(result.theme.accentColor).toBe('#f59e0b');
      expect(result.theme.fontHeading).toContain('Playfair Display');
      expect(result.theme.buttonRadius).toBe('9999px');
      expect(result.extractedAssets.title).toBe('Aalim Perfumes Official');
      expect(result.extractedAssets.description).toBe('Luxury artisanal attars and fine fragrances.');
      expect(result.extractedAssets.faviconUrl).toBe('https://example.com/assets/favicon.ico');
      expect(result.extractedAssets.logoUrl).toBe('https://example.com/assets/og-brand.png');

      // Ensure no body content was cloned into theme
      expect(JSON.stringify(result.theme)).not.toContain('proprietary body content');
    });

    it('falls back to default tokens with warnings when colors are not detectable', () => {
      const bareHtml = `<html><head><title>Minimal</title></head><body>No styles</body></html>`;
      const result = BrandDesignImportService.extractDesignTokens(bareHtml, 'https://example.com');

      expect(result.theme.primaryColor).toBe('#4F46E5');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.extractedAssets.title).toBe('Minimal');
    });
  });
});
