const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf-8');

const targetStr = `...clientPayments.map(p => ({
                id: p.id,
                date: p.paymentDate,
                type: (p.type === 'DISCOUNT' ? 'CREDIT' : 'PAYMENT') as 'CREDIT' | 'PAYMENT',
                description: p.type === 'DISCOUNT' ? \`Desconto: \${p.notes || ''}\` : \`Pagamento: \${p.paymentMethod} \${p.notes ? \`- \${p.notes}\` : ''}\`,
                amount: p.type === 'DISCOUNT' ? Number(p.amount || 0) : (Number(p.amount || 0) + Number(p.discount || 0)),
                payment: p
            }))`;

const replacement = `...clientPayments.map(p => ({
                id: p.id,
                date: p.paymentDate,
                type: (p.type === 'DISCOUNT' || p.type === 'MANUAL_CREDIT' ? 'CREDIT' : p.type === 'MANUAL_DEBIT' ? 'DEBIT' : 'PAYMENT') as 'CREDIT' | 'PAYMENT' | 'DEBIT',
                description: p.type === 'DISCOUNT' ? \`Desconto: \${p.notes || ''}\` : 
                             p.type === 'MANUAL_DEBIT' ? \`Débito Manual\${p.notes ? ': ' + p.notes : ''}\` :
                             p.type === 'MANUAL_CREDIT' ? \`Crédito Manual\${p.notes ? ': ' + p.notes : ''}\` :
                             \`Pagamento: \${p.paymentMethod} \${p.notes ? \`- \${p.notes}\` : ''}\`,
                amount: p.type === 'DISCOUNT' ? Number(p.amount || 0) : 
                        (p.type === 'MANUAL_DEBIT' || p.type === 'MANUAL_CREDIT') ? Number(p.amount || 0) :
                        (Number(p.amount || 0) + Number(p.discount || 0)),
                payment: p
            }))`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('Patched Dentists.tsx history map');
