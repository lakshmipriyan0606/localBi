import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { MerchantCatalogService } from '@/modules/merchant/merchant-catalog-service';
import { SyncQueueService } from '@/modules/sync/sync-queue';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; brandId: string }> }
) {
  try {
    const { tenantSlug, brandId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const { action, productId, productIds, force, async: runAsync } = body;

    if (action === 'single' && productId) {
      if (runAsync) {
        const queued = await SyncQueueService.scheduleMerchantProductSync({
          tenantId: authorizedContext.tenantId,
          brandId,
          productId,
          force,
        });
        return NextResponse.json({ success: true, queued });
      }

      const result = await MerchantCatalogService.syncProduct(authorizedContext, productId, { force });
      return NextResponse.json({ ...result });
    }

    if (action === 'batch') {
      const result = await MerchantCatalogService.syncProductsBatch(
        authorizedContext,
        brandId,
        productIds,
        { force }
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'reconcile') {
      const queued = await SyncQueueService.scheduleMerchantReconcile({
        tenantId: authorizedContext.tenantId,
        brandId,
      });
      return NextResponse.json({ success: true, queued });
    }

    return NextResponse.json(
      { error: 'Invalid sync action. Supported actions: single, batch, reconcile.' },
      { status: 400 }
    );
  } catch (error) {
    return handleRouteError(error, 'Failed to execute Merchant Center sync operation.');
  }
}
