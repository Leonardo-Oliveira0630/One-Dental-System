const fs = require('fs');
let code = fs.readFileSync('types.ts', 'utf8');

const regex = /export interface Organization \{\n  phone\?: string;\n  whatsapp\?: string;\n  cep\?: string;\n  address\?: string;\n  number\?: string;\n  complement\?: string;\n  neighborhood\?: string;\n  city\?: string;\n  state\?: string;\n  email\?: string;\n  croNumero\?: string;\n  croUf\?: string;\n  revealJobStatusToDentist\?: boolean;/;

code = code.replace(regex, "export interface Organization {\n  whatsapp?: string;");

fs.writeFileSync('types.ts', code);
console.log('Fixed types again');
