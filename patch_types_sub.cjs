const fs = require('fs');
let types = fs.readFileSync('types.ts', 'utf8');

types = types.replace(/subDentists\?\: \{ id\: string; name\: string; cro\?\: string; \}\[\];/g, "subDentists?: any[];");

fs.writeFileSync('types.ts', types);
