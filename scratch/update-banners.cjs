const fs = require('fs');
const path = require('path');

const components = [
  'queries-explorer.tsx',
  'pages-explorer.tsx',
  'countries-explorer.tsx',
  'devices-explorer.tsx'
];

for (const component of components) {
  const filePath = path.join('e:/project/localBi/src/features/reports/components', component);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const oldTitle = `Google Account Not Connected`;
  const oldDesc = `You need to connect your Google account to view real-time\n            performance analytics and reports.`;
  const oldDescAlternative = `You need to connect your Google account to view real-time performance analytics and reports.`;
  const oldButton = `Connect Google Account`;
  
  const newTitle = `Website Domain Not Linked`;
  const newDesc = `You need to link a valid Google property to this brand to view real-time performance analytics and reports.`;
  const newButton = `Manage Connections`;

  if (content.includes(oldTitle)) {
    content = content.replace(oldTitle, newTitle);
    
    if (content.includes(oldDesc)) {
      content = content.replace(oldDesc, newDesc);
    } else if (content.includes(oldDescAlternative)) {
      content = content.replace(oldDescAlternative, newDesc);
    }

    content = content.replace(oldButton, newButton);

    fs.writeFileSync(filePath, content);
    console.log(`Updated banner text in ${component}`);
  } else {
    console.log(`Could not find old title in ${component}`);
  }
}
