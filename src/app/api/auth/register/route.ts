import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { RegistrationService, RegistrationInput } from '@/modules/auth/registration-service';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { handleRouteError } from '@/shared/errors';
import { logger } from '@/shared/observability/logger';

// Lightweight server-side rate limiter (5 registrations per IP per 15 min)
const registrationAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX        = 5;

function checkRegistrationRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = registrationAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    registrationAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const headerStore = await headers();
  const ip =
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerStore.get('x-real-ip') ||
    '127.0.0.1';

  if (!checkRegistrationRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many registration attempts. Please wait 15 minutes and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { fullName, email, password, workspaceName, workspaceSlug, timezone, industry, plan } = body;

    // Basic required field check before handing off to service
    const missing: string[] = [];
    if (!fullName)        missing.push('fullName');
    if (!email)           missing.push('email');
    if (!password)        missing.push('password');
    if (!workspaceName)   missing.push('workspaceName');
    if (!workspaceSlug)   missing.push('workspaceSlug');
    if (!timezone)        missing.push('timezone');
    if (!plan)            missing.push('plan');

    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    if (plan !== 'DIRECT_CLIENT' && plan !== 'AGENCY') {
      return NextResponse.json(
        { success: false, error: 'Invalid plan. Must be DIRECT_CLIENT or AGENCY.' },
        { status: 400 }
      );
    }

    const input: RegistrationInput = {
      fullName,
      email,
      password,
      workspaceName,
      workspaceSlug,
      timezone,
      industry: industry || undefined,
      plan,
    };

    const sessionMetadata = {
      ipAddress: ip,
      userAgent: headerStore.get('user-agent') || 'UNKNOWN',
    };

    const result = await RegistrationService.register(input, sessionMetadata);

    // Set session cookie (same mechanism as login)
    const cookieStore = await cookies();
    SessionCookieManager.setSessionCookie(cookieStore, result.rawToken);

    logger.info(
      { userId: result.user.id, tenantSlug: result.tenantSlug, ip },
      'Self-service registration API success'
    );

    return NextResponse.json(
      {
        success: true,
        tenantSlug: result.tenantSlug,
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, 'Registration failed');
  }
}
