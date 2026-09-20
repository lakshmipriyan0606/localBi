import fs from 'fs';

const filePath = 'e:/project/localBi/src/modules/integrations/google/google-api-client.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all occurrences of isMock definition to hardcode false
content = content.replace(/const isMock =[\s\S]*?;/g, 'const isMock = false; // Disabled mock data per user request');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Disabled mock data in google-api-client.ts');
