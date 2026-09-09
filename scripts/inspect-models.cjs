const fs = require('fs');
const content = fs.readFileSync('prisma/schema.prisma', 'utf-8');

const models = [];
let currentModel = null;

for (const rawLine of content.split('\n')) {
  const line = rawLine.trim();
  const mMatch = line.match(/^model\s+(\w+)\s+\{/);
  if (mMatch) {
    currentModel = { name: mMatch[1], tableName: mMatch[1].toLowerCase(), fields: [], hasTenantId: false };
    models.push(currentModel);
  } else if (currentModel) {
    if (line.includes('@@map(')) {
      const mapMatch = line.match(/@@map\("([^"]+)"\)/);
      if (mapMatch) currentModel.tableName = mapMatch[1];
    }
    const fMatch = line.match(/^(\w+)\s+/);
    if (fMatch) {
      currentModel.fields.push(fMatch[1]);
      if (fMatch[1] === 'tenantId') currentModel.hasTenantId = true;
    }
  }
}

console.log('Total models:', models.length);
const tenantModels = models.filter(m => m.hasTenantId);
console.log(`Tenant models (${tenantModels.length}):`, tenantModels.map(m => m.tableName));
const controlPlaneModels = models.filter(m => !m.hasTenantId);
console.log(`Control plane models (${controlPlaneModels.length}):`, controlPlaneModels.map(m => m.tableName));
