import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const resources = await prisma.externalResource.findMany({
    include: { internalMappings: true }
  });

  // Group by tenantId + provider + normalized externalResourceId
  const groups = {};
  for (const r of resources) {
    const key = r.tenantId + '::' + r.provider + '::' + r.externalResourceId.toLowerCase().replace(/\/$/, '');
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  let deletedCount = 0;
  for (const [key, group] of Object.entries(groups)) {
    if (group.length > 1) {
      console.log('Duplicate found:', key, '- Count:', group.length);
      const withMappings = group.find(r => r.internalMappings.length > 0);
      const keep = withMappings || group[0];
      const toDelete = group.filter(r => r.id !== keep.id && r.internalMappings.length === 0);

      for (const r of toDelete) {
        await prisma.connectionResourceAccess.deleteMany({ where: { resourceId: r.id } });
        await prisma.externalResource.delete({ where: { id: r.id } });
        console.log('  Deleted duplicate:', r.id, r.externalResourceId);
        deletedCount++;
      }
    }
  }
  console.log('Done. Deleted', deletedCount, 'duplicate resource(s).');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
