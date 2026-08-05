const fs = require('fs');
let content = fs.readFileSync('pages/lab/Finance.tsx', 'utf8');

const translateMethodMap = `const translatePaymentMethod = (method: string) => {
    switch (method) {
        case 'PIX': return 'PIX';
        case 'CASH': return 'Dinheiro';
        case 'CREDIT_CARD': return 'Cartão Crédito';
        case 'DEBIT_CARD': return 'Cartão Débito';
        case 'BANK_TRANSFER': return 'Transf. Bancária';
        case 'BOLETO': return 'Boleto';
        case 'DISCOUNT': return 'Desconto/Cortesia';
        case 'CLIENT_CREDIT': return 'Saldo Crédito';
        default: return method;
    }
};`;

if (!content.includes('translatePaymentMethod')) {
    content = content.replace('export default function Finance() {', translateMethodMap + '\\n\\nexport default function Finance() {');
}

content = content.replace(
  /\`Pagamento: \$\{p\.paymentMethod\}/g,
  `\`Pagamento: \$\{translatePaymentMethod(p.paymentMethod)\}`
);

// We need to carefully replace {p.paymentMethod} but let's check exact matches
content = content.replace(
  />\\s*\{p\.paymentMethod\}\\s*<\/span>/g,
  `>{translatePaymentMethod(p.paymentMethod)}</span>`
);

content = content.replace(
  />\\s*\{selectedPaymentForDetail\.paymentMethod\}\\s*<\/span>/g,
  `>{translatePaymentMethod(selectedPaymentForDetail.paymentMethod)}</span>`
);


fs.writeFileSync('pages/lab/Finance.tsx', content);
