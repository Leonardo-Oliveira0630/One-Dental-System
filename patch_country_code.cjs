const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(
  'const cleanTo = toNumber.replace(/\\D/g, "");',
  `let cleanTo = toNumber.replace(/\\D/g, "");
    if (cleanTo.length === 10 || cleanTo.length === 11) {
      cleanTo = "55" + cleanTo;
    }`
);

fs.writeFileSync('functions/src/index.ts', code);
