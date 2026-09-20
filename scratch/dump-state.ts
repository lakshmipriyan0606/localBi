import { PrismaClient } from '@prisma/client';
import { ResourceMappingService } from '../src/modules/integrations/resource-mapping-service';
import { Action, AuthorizedContext } from '../src/shared/authorization/policy';
import * as fs from 'fs';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.$queryRawUnsafe(`SELECT * FROM tenants WHERE slug = 'lakshmi-food'`);
  const tenantId = (tenants as any[])[0].id;
  
  const ctx: AuthorizedContext = {
    tenantId,
    userId: 'test_user',
    isSuperAdmin: true,
    userRole: 'OWNER',
    brands: [],
    locations: [],
    scopeMode: 'ALL'
  };

  const state = await ResourceMappingService.listTenantMappingState(tenantId, ctx);
  
  fs.writeFileSync('scratch/state.json', JSON.stringify(state, null, 2));
  console.log('State written to scratch/state.json');
}

main().finally(() => prisma.$disconnect());
