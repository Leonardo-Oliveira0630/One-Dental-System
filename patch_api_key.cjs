const fs = require('fs');
let code = fs.readFileSync('pages/admin/FinancialTab.tsx', 'utf-8');

code = code.replace(
  'Vincule sua API Key existente para gerenciar o split manualmente.',
  'Vincule seu Wallet ID existente para gerenciar o split e recebimentos.'
);

fs.writeFileSync('pages/admin/FinancialTab.tsx', code);
console.log('Fixed API Key text');
