import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent MIME-type sniffing attacks
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking via iframes
          { key: 'X-Frame-Options', value: 'DENY' },
          // Legacy XSS filter (defence-in-depth for older browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Limit referrer information sent cross-origin
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser feature access
          { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=()' },
          // HSTS: only set in production where TLS is enforced
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
