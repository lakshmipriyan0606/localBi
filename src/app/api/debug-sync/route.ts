import { NextResponse } from 'next/server';
import { SyncWorkerService } from '@/modules/sync/sync-worker';
import { prisma } from '@/shared/database/client';
import { SyncQueueService } from '@/modules/sync/sync-queue';

export async function GET() {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'lakshmi-food' } });
    if (!tenant) return NextResponse.json({ error: 'no tenant' });
    
    const locMappings = await prisma.internalResourceMapping.findMany({
      where: { tenantId: tenant.id, internalType: 'LOCATION' },
      include: { resource: true }
    });
    
    if (locMappings.length === 0) return NextResponse.json({ error: 'no loc mappings' });
    
    const account = await prisma.externalAccount.findFirst({ where: { tenantId: tenant.id } });
    if (!account) return NextResponse.json({ error: 'no account' });
    
    const mapping = locMappings[0];
    const scheduled = await SyncQueueService.scheduleGbpReviewSync({
      tenantId: tenant.id,
      locationId: mapping.internalId,
      locationResourceName: mapping.resource.externalResourceId,
      accountId: account.externalAccountId.replace('accounts/', ''),
    });
    
    return NextResponse.json({ success: true, scheduled });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
