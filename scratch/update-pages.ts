import fs from 'fs';
import path from 'path';

const pages = ['queries', 'pages', 'countries', 'devices'];

const baseDir = 'e:/project/localBi/src/app/t/[tenantSlug]/reports/gsc';
const componentsDir = 'e:/project/localBi/src/features/reports/components';

for (const p of pages) {
  const pagePath = path.join(baseDir, p, 'page.tsx');
  let content = fs.readFileSync(pagePath, 'utf8');

  // Update page.tsx
  if (content.includes('const { brands, locations } = await')) {
    content = content.replace(
      'const { brands, locations } = await TenantContextService.withTenantContext(',
      'const { brands, locations, isConnected } = await TenantContextService.withTenantContext('
    );
    content = content.replace(
      'return { brands: bList, locations: lList };',
      `const activeConnection = await tx.integrationConnection.findFirst({
        where: { tenantId: tenant.id, status: 'ACTIVE' }
      });
      return { brands: bList, locations: lList, isConnected: !!activeConnection };`
    );
    content = content.replace(
      'initialBrandId={brands[0]?.id || \'\'}',
      'initialBrandId={brands[0]?.id || \'\'}\n        isConnected={isConnected}'
    );
    fs.writeFileSync(pagePath, content, 'utf8');
    console.log(`Updated ${pagePath}`);
  }

  // Update explorer component
  const compPath = path.join(componentsDir, `${p}-explorer.tsx`);
  let compContent = fs.readFileSync(compPath, 'utf8');
  
  if (compContent.includes('initialBrandId: string;')) {
    compContent = compContent.replace(
      'initialBrandId: string;',
      'initialBrandId: string;\n  isConnected?: boolean;'
    );
  }
  
  if (compContent.includes('initialBrandId,')) {
    compContent = compContent.replace(
      'initialBrandId,\n}:',
      'initialBrandId,\n  isConnected = true,\n}:'
    );
  }

  // Insert disconnected state before DrilldownView
  if (compContent.includes('<DrilldownView') && !compContent.includes('Google Account Not Connected')) {
    const drilldownRegex = /(<DrilldownView[\s\S]*?\/>)/;
    compContent = compContent.replace(drilldownRegex, `
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-slate-200 border-dashed rounded-2xl bg-slate-50/50 mt-6">
          <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Google Account Not Connected</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">You need to connect your Google account to view real-time performance analytics and reports.</p>
          <a href={\`/t/\${tenantSlug}/integrations\`} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-slate-50 shadow hover:bg-indigo-600/90 h-9 px-4 py-2">
            Connect Google Account
          </a>
        </div>
      ) : (
        $1
      )}
    `);
    fs.writeFileSync(compPath, compContent, 'utf8');
    console.log(`Updated ${compPath}`);
  }
}

console.log('All done');
