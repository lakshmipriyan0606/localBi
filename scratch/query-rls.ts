import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../src/shared/database/tenant-context';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.$queryRawUnsafe(`SELECT * FROM tenants WHERE slug = 'lakshmi-food'`);
  if (!tenants || (tenants as any[]).length === 0) return console.log('Tenant not found');
  const tenantId = (tenants as any[])[0].id;
  
  await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
    const rs = await tx.externalResource.findMany({
      where: { tenantId },
      include: { connectionAccess: true }
    });
    console.log(JSON.stringify(rs, null, 2));
  });
}

main().finally(() => prisma.$disconnect());
