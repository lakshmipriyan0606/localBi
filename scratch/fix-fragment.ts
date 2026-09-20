import fs from 'fs';
import path from 'path';

const pages = ['queries', 'pages', 'countries', 'devices'];
const componentsDir = 'e:/project/localBi/src/features/reports/components';

for (const p of pages) {
  const compPath = path.join(componentsDir, `${p}-explorer.tsx`);
  let compContent = fs.readFileSync(compPath, 'utf8');
  
  // Find "return (\n    \n      {!isConnected" and wrap it in a fragment
  if (compContent.includes('return (\n    \n      {!isConnected')) {
    compContent = compContent.replace(
      'return (\n    \n      {!isConnected',
      'return (\n    <>\n      {!isConnected'
    );
    
    // Find the end of the DrilldownView and add </>
    compContent = compContent.replace(
      '      />\n      )}\n    ',
      '      />\n      )}\n    </>'
    );
    
    fs.writeFileSync(compPath, compContent, 'utf8');
    console.log(`Fixed ${compPath}`);
  }
}
