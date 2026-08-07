const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

content = content.replace(/job\.finalValue/g, 'job.totalValue');

fs.writeFileSync('pages/JobsList.tsx', content);
console.log('patched totalValue');
