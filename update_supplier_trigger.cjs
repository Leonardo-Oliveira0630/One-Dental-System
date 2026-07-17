const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(/const phone = org\.phone \|\| "";/, 'const phone = org.phone || org.whatsapp || "";');

fs.writeFileSync('functions/src/index.ts', code);
console.log('Fixed supplier phone');
