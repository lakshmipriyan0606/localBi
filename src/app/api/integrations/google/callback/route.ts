import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { CryptoEnvelopeService } from '@/shared/crypto/envelope';
import { ResourceDiscoveryService } from '@/modules/integrations/resource-discovery-service';
import { logger } from '@/shared/observability/logger';
import { createValidationError } from '@/shared/errors';
import crypto from 'node:crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateToken = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (errorParam) {
    logger.warn({ errorParam }, 'Google OAuth callback returned error');
    return NextResponse.redirect(new URL(`/clients?error=${encodeURIComponent(errorParam)}`, request.url));
  }

  if (!code || !stateToken) {
    return NextResponse.json(
      { error: 'Missing code or state in OAuth callback' },
      { status: 400 }
    );
  }

  try {
    // 1. Verify and decode HMAC-signed state
    const state = GoogleOAuthService.verifyState(stateToken);
    const { tenantId, userId, returnUrl, nonce, sessionHash } = state;

    // 2. Fetch tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Tenant not found or inactive' }, { status: 404 });
    }

    // 3. Authenticate session & enforce authorization
    const cookieStore = await cookies();
    const rawSessionToken = SessionCookieManager.getSessionToken(cookieStore);
    if (!rawSessionToken) {
      logger.warn({ tenantId, userId }, 'OAuth callback invoked without session cookie');
      return NextResponse.redirect(new URL(`/client/${tenant.slug}/integrations?error=unauthorized`, request.url));
    }

    // Resolve tenant context to verify active membership
    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawSessionToken, tenant.slug);
    if (!authorizedContext) {
      return NextResponse.redirect(new URL(`/client/${tenant.slug}/integrations?error=unauthorized`, request.url));
    }

    // Verify callback was initiated by this user
    if (authorizedContext.userId !== userId) {
      logger.warn(
        { stateUserId: userId, sessionUserId: authorizedContext.userId },
        'OAuth callback user mismatch'
      );
      return NextResponse.redirect(new URL(`/client/${tenant.slug}/integrations?error=user_mismatch`, request.url));
    }

    // Verify browser session binding if present in state
    if (sessionHash) {
      const currentSessionHash = crypto
        .createHash('sha256')
        .update(rawSessionToken)
        .digest('hex')
        .slice(0, 16);
      if (currentSessionHash !== sessionHash) {
        logger.warn('OAuth callback session binding mismatch');
        return NextResponse.redirect(new URL(`/client/${tenant.slug}/integrations?error=session_mismatch`, request.url));
      }
    }

    // Assert user has permission to connect integrations
    AuthorizationService.assertCan(authorizedContext, Action.INTEGRATION_CONNECT);

    // 4. One-time nonce consumption (replay protection)
    const nonceValid = await GoogleOAuthService.consumeNonce(nonce);
    if (!nonceValid) {
      logger.warn({ nonce }, 'OAuth callback state token replayed or already consumed');
      return NextResponse.redirect(new URL(`/client/${tenant.slug}/integrations?error=state_replayed`, request.url));
    }

    // 5. Exchange code for tokens
    const tokens = await GoogleOAuthService.exchangeCodeForTokens(code);

    // 4. Check for existing connection under this tenant
    const existing = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.integrationConnection.findUnique({
        where: {
          uq_connection_provider_sub: {
            tenantId,
            provider: 'GOOGLE',
            externalSubjectId: tokens.sub,
          },
        },
      });
    });

    let encryptedRefreshTokenJson = '';
    const connectionId = existing?.id || `conn_${crypto.randomBytes(12).toString('hex')}`;

    if (tokens.refreshToken) {
      // Encrypt fresh refresh token using AES-256-GCM envelope
      const envelope = CryptoEnvelopeService.encrypt({
        plaintext: tokens.refreshToken,
        tenantId,
        connectionId,
      });
      encryptedRefreshTokenJson = JSON.stringify(envelope);
    } else if (existing?.encryptedRefreshToken) {
      // Retain valid existing encrypted refresh token
      encryptedRefreshTokenJson = existing.encryptedRefreshToken;
      logger.info({ tenantId, sub: tokens.sub }, 'Retained existing encrypted refresh token on re-consent');
    } else {
      throw createValidationError(
        'Google did not return a refresh token and no prior credential was found. Please disconnect localBi in your Google Security settings and try again.'
      );
    }

    // 5. Upsert connection in database
    const connection = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.integrationConnection.upsert({
        where: {
          uq_connection_provider_sub: {
            tenantId,
            provider: 'GOOGLE',
            externalSubjectId: tokens.sub,
          },
        },
        create: {
          id: connectionId,
          tenantId,
          provider: 'GOOGLE',
          externalSubjectId: tokens.sub,
          externalEmail: tokens.email,
          encryptedRefreshToken: encryptedRefreshTokenJson,
          tokenKeyVersion: 1,
          grantedScopes: tokens.grantedScopes,
          status: 'ACTIVE',
          lastUsedAt: new Date(),
        },
        update: {
          externalEmail: tokens.email,
          encryptedRefreshToken: encryptedRefreshTokenJson,
          grantedScopes: tokens.grantedScopes,
          status: 'ACTIVE',
          revokedAt: null,
          lastUsedAt: new Date(),
        },
      });
    });

    // 6. Trigger automatic resource discovery
    try {
      await ResourceDiscoveryService.discoverAndSyncResources(tenant.id, connection.id);
    } catch (discErr) {
      logger.error({ discErr }, 'Automatic resource discovery following OAuth failed');
    }

    const destination = returnUrl || `/client/${tenant.slug}/integrations`;
    const redirectUrl = new URL(destination, request.url);
    redirectUrl.searchParams.set('connected', '1');

    return NextResponse.redirect(redirectUrl);
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to process Google OAuth callback');
    return NextResponse.json(
      { error: (err as Error).message || 'OAuth callback failed' },
      { status: 500 }
    );
  }
}
