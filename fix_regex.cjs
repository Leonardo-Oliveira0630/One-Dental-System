const fs = require('fs');
const code = fs.readFileSync('functions/src/communication/services/CommunicationService.ts', 'utf8');
const fixedCode = code.replace(
  "const regex = new RegExp(`\\\\{\\\\{(\\s*)${key}(\\s*)\\\\}\\\\}`, 'g');",
  "const regex = new RegExp(`\\\\\\\\{\\\\\\\\{\\\\\\\\s*\\${key}\\\\\\\\s*\\\\\\\\}\\\\\\\\}`, 'g');"
);
fs.writeFileSync('functions/src/communication/services/CommunicationService.ts', fixedCode);
console.log('Fixed regex');
