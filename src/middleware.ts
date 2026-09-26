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
  ];

  // Check if current host is a subdomain
  // e.g. "lakshmi-food.localhost" or "lakshmi-food.localbi.app"
  let subdomain: string | null = null;

  if (currentHost.endsWith('.localhost')) {
    subdomain = currentHost.replace('.localhost', '');
  } else if (currentHost.endsWith('.localbi.app') && currentHost !== 'app.localbi.app' && currentHost !== 'www.localbi.app') {
    subdomain = currentHost.replace('.localbi.app', '');
  }

  // If a valid subdomain was detected and the path isn't already rewritten
  if (subdomain && !reservedHosts.includes(currentHost)) {
    // Avoid double rewrites if path already starts with /site/
    if (!url.pathname.startsWith('/site/')) {
      const rewriteUrl = new URL(`/site/${subdomain}${url.pathname === '/' ? '' : url.pathname}`, req.url);
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  return NextResponse.next();
}
