const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, '..', 'src'));
let changedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace exact `/t/` string literals in code
    // We need to be careful not to replace random things, but most of these are routes.
    // e.g. `/t/${tenantSlug}` -> `/client/${tenantSlug}`
    // e.g. `/t/` -> `/client/`
    
    let original = content;
    content = content.replace(/\/t\//g, '/client/');
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        changedCount++;
        console.log('Updated:', file);
    }
}

console.log(`Replaced in ${changedCount} files.`);
