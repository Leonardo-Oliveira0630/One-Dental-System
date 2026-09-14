const fs = require('fs');
let content = fs.readFileSync('pages/lab/Inventory.tsx', 'utf8');

content = content.replace(
    `<div className="flex gap-4 border-b border-slate-200">`,
    `<div className="flex gap-4 border-b border-slate-200 overflow-x-auto whitespace-nowrap">`
);

fs.writeFileSync('pages/lab/Inventory.tsx', content);
console.log('Fixed tabs overflow');
