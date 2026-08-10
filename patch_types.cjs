const fs = require('fs');
let content = fs.readFileSync('types.ts', 'utf8');

content = content.replace(
  "  paymentMethod: 'PIX' | 'BOLETO' | 'CARD' | 'CASH' | 'TRANSFER' | 'DISCOUNT' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER';",
  "  paymentMethod: 'PIX' | 'BOLETO' | 'CARD' | 'CASH' | 'TRANSFER' | 'DISCOUNT' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'CLIENT_CREDIT';"
);

fs.writeFileSync('types.ts', content);
