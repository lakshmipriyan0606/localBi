const fs = require('fs');
const path = require('path');

const pageFiles = [
  'src/app/t/[tenantSlug]/reports/gsc/queries/page.tsx',
  'src/app/t/[tenantSlug]/reports/gsc/pages/page.tsx',
  'src/app/t/[tenantSlug]/reports/gsc/countries/page.tsx',
  'src/app/t/[tenantSlug]/reports/gsc/devices/page.tsx'
];

for (const file of pageFiles) {
  const filePath = path.join('e:/project/localBi', file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace the old logic
  const oldLogic = `      const activeConnection = await tx.integrationConnection.findFirst({
        where: { tenantId: tenant.id, status: 'ACTIVE' }
      });
      return { brands: bList, locations: lList, isConnected: !!activeConnection };`;

  const newLogic = `      const activeConnection = await tx.integrationConnection.findFirst({
        where: { tenantId: tenant.id, status: 'ACTIVE' }
      });

      const hasGscScope = activeConnection?.grantedScopes.includes('https://www.googleapis.com/auth/webmasters.readonly') ?? false;
      const mappings = await tx.internalResourceMapping.findMany({
        where: { tenantId: tenant.id, internalType: 'BRAND' }
      });
      const hasGscMapping = mappings.length > 0;

      return { brands: bList, locations: lList, isConnected: hasGscScope && hasGscMapping };`;

  if (content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
    fs.writeFileSync(filePath, content);
    console.log(`Updated backend logic in ${file}`);
  } else {
    console.log(`Could not find old logic in ${file}`);
  }
}
