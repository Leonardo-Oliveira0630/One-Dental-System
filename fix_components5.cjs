const fs = require('fs');
let code = fs.readFileSync('services/nfcServices.ts', 'utf8');
code = code.replace(/const totalCaixas: any = /g, "const totalCaixas = ");
fs.writeFileSync('services/nfcServices.ts', code);
