import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { CatalogMigrationService } from '@/modules/catalog/catalog-migration-service';
import { Action, assertAuthorizedAction } from '@/shared/authorization/roles';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    assertAuthorizedAction(authorizedContext.role, Action.STORE_PRODUCT_MANAGE);

    const report = await CatalogMigrationService.runFullMigration(authorizedContext.tenantId);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    return handleRouteError(error, 'Failed to run catalog migration.');
  }
}
