const fs = require('fs');
let code = fs.readFileSync('types.ts', 'utf8');

code = code.replace(/export interface User \{/, 'export interface User {\n  whatsapp?: string;');
code = code.replace(/export interface Organization \{/, 'export interface Organization {\n  phone?: string;\n  whatsapp?: string;\n  cep?: string;\n  address?: string;\n  number?: string;\n  complement?: string;\n  neighborhood?: string;\n  city?: string;\n  state?: string;\n  email?: string;\n  croNumero?: string;\n  croUf?: string;\n  revealJobStatusToDentist?: boolean;');

fs.writeFileSync('types.ts', code);
console.log('Fixed types');
