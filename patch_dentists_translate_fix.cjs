const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

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

if (!content.includes('const translatePaymentMethod')) {
    content = content.replace('export const Dentists = () => {', translateMethodMap + '\\n\\nexport const Dentists = () => {');
}

fs.writeFileSync('pages/lab/Dentists.tsx', content);
