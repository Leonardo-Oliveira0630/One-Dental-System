const fs = require('fs');
let code = fs.readFileSync('functions/src/index.ts', 'utf8');

code = code.replace(
  'if (!template) return;',
  `if (!template) {
    logger.warn(\`[getTemplateAndSend] Template do tipo \${type} não encontrado ou inativo para orgId: \${orgId}\`);
    return;
  }`
);

fs.writeFileSync('functions/src/index.ts', code);
