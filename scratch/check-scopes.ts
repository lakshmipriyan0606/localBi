import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../src/shared/database/tenant-context';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.$queryRawUnsafe(`SELECT * FROM tenants WHERE slug = 'lakshmi-food'`);
  const tenantId = (tenants as any[])[0].id;

  await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
    const conns = await tx.integrationConnection.findMany({
      where: { tenantId }
    });
    console.log(JSON.stringify(conns, null, 2));
  });
}
main().finally(() => prisma.$disconnect());
