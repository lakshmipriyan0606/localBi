import { PrismaClient } from '@prisma/client';
import { ReportingService } from '../src/modules/reports/reporting-service';

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public' }
  }
});

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: 'lakshmi-food' }});
  const tenantId = tenants[0].id;
  const brandId = 'cmu9eqki30001ubj4kulafgt4';
  const startDate = '2026-08-21';
  const endDate = '2026-09-20';

  const summary = await ReportingService.getPerformanceSummary({
    tenantId,
    brandId,
    startDate,
    endDate,
    context: {
      tenantId,
      userId: 'test_user',
      role: 'ADMIN',
      grantedBrandIds: new Set([brandId]),
      grantedLocationIds: new Set(),
      scopeMode: 'RESTRICTED'
    } as any,
  });

  console.log('Summary returned by ReportingService:', JSON.stringify(summary, null, 2));
}

main().then(() => process.exit(0)).catch(console.error);
