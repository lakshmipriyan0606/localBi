import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)',
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get('host') || '';

  // Clean host (remove port if any)
  const currentHost = host.split(':')[0] || '';

  // Reserved platform hosts that do not trigger subdomain rewrites
  const reservedHosts = [
    'localhost',
    '127.0.0.1',
    'app.localbi.app',
    'localbi.app',
    'www.localbi.app',
    'localbii.vercel.app',
  ];

  // Check if current host is a subdomain or custom domain
  let subdomainOrDomain: string | null = null;

  if (currentHost.endsWith('.localhost')) {
    subdomainOrDomain = currentHost.replace('.localhost', '');
  } else if (currentHost.endsWith('.localbi.app') && currentHost !== 'app.localbi.app' && currentHost !== 'www.localbi.app') {
    subdomainOrDomain = currentHost.replace('.localbi.app', '');
  } else if (!reservedHosts.includes(currentHost) && !currentHost.includes('vercel.app')) {
    // Custom domain routing (e.g. store.brand.com)
    subdomainOrDomain = currentHost;
  }

  // If a valid subdomain or custom domain was detected and path isn't already rewritten
  if (subdomainOrDomain && !reservedHosts.includes(currentHost)) {
    // Avoid double rewrites if path already starts with /site/
    if (!url.pathname.startsWith('/site/')) {
      const rewriteUrl = new URL(`/site/${subdomainOrDomain}${url.pathname === '/' ? '' : url.pathname}`, req.url);
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  return NextResponse.next();
}
