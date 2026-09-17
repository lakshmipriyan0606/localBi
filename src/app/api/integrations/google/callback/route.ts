import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
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
    return NextResponse.redirect(new URL(`/tenants?error=${encodeURIComponent(errorParam)}`, request.url));
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
    const { tenantId, returnUrl } = state;

    // 2. Fetch tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Tenant not found or inactive' }, { status: 404 });
    }

    // 3. Exchange code for tokens
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
      await ResourceDiscoveryService.discoverAndSyncResources(tenant.id, connection.id, tenant.slug);
    } catch (discErr) {
      logger.error({ discErr }, 'Automatic resource discovery following OAuth failed');
    }

    const destination = returnUrl || `/t/${tenant.slug}/integrations`;
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
