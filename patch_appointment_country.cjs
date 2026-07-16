const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(
  'const cleanPhone = phone.replace(/\\D/g, "");',
  `let cleanPhone = phone.replace(/\\D/g, "");
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = "55" + cleanPhone;
  }`
);

fs.writeFileSync('functions/src/index.ts', code);
