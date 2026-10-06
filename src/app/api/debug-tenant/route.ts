import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';

export const dynamic = 'force-dynamic';

/**
 * TEMPORARY DEBUG ENDPOINT — REMOVE AFTER DIAGNOSIS
 * GET /api/debug-tenant?slug=lakshmi-food-001
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') || 'lakshmi-food-001';
  const cookieStore = await cookies();

  // 1. Check all possible cookie names
  const primaryCookie = cookieStore.get('__Host-localbi_session');
  const fallbackCookie = cookieStore.get('localbi_session');
  const token = SessionCookieManager.getSessionToken(cookieStore);

  const cookieInfo = {
    primaryExists: !!primaryCookie?.value,
    fallbackExists: !!fallbackCookie?.value,
    tokenResolved: !!token,
    sessionCookieName: process.env.NODE_ENV === 'production' ? '__Host-localbi_session' : 'localbi_session',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL || 'not set',
  };

  if (!token) {
    return NextResponse.json({
      stage: 'NO_TOKEN',
      cookieInfo,
      error: 'No session token found in cookies',
    });
  }

  // 2. Try full tenant resolution
  try {
    const resolved = await ContextResolver.resolveTenantContext(token, slug);
    return NextResponse.json({
      stage: 'SUCCESS',
      cookieInfo,
      tenantSlug: resolved.tenant?.slug,
      tenantStatus: (resolved.tenant as any)?.status,
      userId: resolved.user?.id,
      userEmail: resolved.user?.email,
      role: resolved.authorizedContext?.role,
    });
  } catch (err: any) {
    return NextResponse.json({
      stage: 'RESOLUTION_FAILED',
      cookieInfo,
      error: {
        message: err?.message,
        code: err?.code,
        statusCode: err?.statusCode,
        stack: err?.stack?.split('\n').slice(0, 6),
      },
    });
  }
}
