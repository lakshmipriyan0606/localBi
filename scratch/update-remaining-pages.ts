import fs from 'fs';
import path from 'path';

// 1. UPDATE THE THREE PAGE FILES to fetch isConnected
const pageFiles = [
  'e:/project/localBi/src/app/t/[tenantSlug]/reports/gbp/locations/page.tsx',
  'e:/project/localBi/src/app/t/[tenantSlug]/reports/gbp/search-terms/page.tsx',
  'e:/project/localBi/src/app/t/[tenantSlug]/reports/ga4/page.tsx'
];

for (const p of pageFiles) {
  let content = fs.readFileSync(p, 'utf8');
  
  // Fix the destructuring
  if (content.includes('const { brands, locations } = await TenantContextService.withTenantContext(')) {
    content = content.replace(
      'const { brands, locations } = await TenantContextService.withTenantContext(',
      'const { brands, locations, isConnected } = await TenantContextService.withTenantContext('
    );
  }
  
  // Fix the return inside the withTenantContext block
  if (content.includes('return { brands: bList, locations: lList };')) {
    content = content.replace(
      'return { brands: bList, locations: lList };',
      `const activeConnection = await tx.integrationConnection.findFirst({
        where: { tenantId: tenant.id, status: 'ACTIVE' }
      });

      return { brands: bList, locations: lList, isConnected: !!activeConnection };`
    );
  }

  // For GBP pages, pass isConnected down to the explorer
  if (p.includes('gbp')) {
    if (content.includes('initialBrandId={brands[0]?.id || \'\'}\n      />')) {
      content = content.replace(
        'initialBrandId={brands[0]?.id || \'\'}\n      />',
        'initialBrandId={brands[0]?.id || \'\'}\n        isConnected={isConnected}\n      />'
      );
    } else if (content.includes('initialBrandId={brands[0]?.id || \'\'}')) {
      // search-terms page
      content = content.replace(
        'initialBrandId={brands[0]?.id || \'\'}',
        'initialBrandId={brands[0]?.id || \'\'}\n        isConnected={isConnected}'
      );
    }
  }

  // For GA4, we modify the page directly later
  
  fs.writeFileSync(p, content, 'utf8');
  console.log(`Updated ${p}`);
}

// 2. UPDATE THE GBP EXPLORER COMPONENTS
const gbpExplorers = [
  'e:/project/localBi/src/features/reports/components/locations-performance-explorer.tsx',
  'e:/project/localBi/src/features/reports/components/search-terms-explorer.tsx'
];

for (const p of gbpExplorers) {
  let content = fs.readFileSync(p, 'utf8');

  // Add the props for isConnected
  if (content.includes('initialBrandId: string;')) {
    content = content.replace(
      'initialBrandId: string;',
      'initialBrandId: string;\n  isConnected?: boolean;'
    );
  }
  
  if (content.includes('initialBrandId,\n}:')) {
    content = content.replace(
      'initialBrandId,\n}:',
      'initialBrandId,\n  isConnected = true,\n}:'
    );
  }

  // Insert disconnected state before DrilldownView
  if (content.includes('<DrilldownView') && !content.includes('Google Account Not Connected')) {
    const drilldownRegex = /(<DrilldownView[\s\S]*?\/>)/;
    content = content.replace(drilldownRegex, `
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
  }

  // Wrap the return body with <> </>
  const returnIndex = content.lastIndexOf('return (');
  if (returnIndex !== -1 && !content.substring(returnIndex, returnIndex + 50).includes('<>')) {
    const beforeReturn = content.substring(0, returnIndex + 8);
    const afterReturn = content.substring(returnIndex + 8);
    
    const lastClosingParenIndex = afterReturn.lastIndexOf(');');
    if (lastClosingParenIndex !== -1) {
      const innerContent = afterReturn.substring(0, lastClosingParenIndex);
      const remainder = afterReturn.substring(lastClosingParenIndex);
      
      content = beforeReturn + '\n    <>\n' + innerContent + '\n    </>\n  ' + remainder;
    }
  }

  fs.writeFileSync(p, content, 'utf8');
  console.log(`Updated explorer ${p}`);
}
