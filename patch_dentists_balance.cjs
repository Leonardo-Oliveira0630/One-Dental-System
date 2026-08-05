const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

content = content.replace(
`        const historyWithBalance = sorted.map(item => {
            if (item.type === 'DEBIT') runningBalance -= item.amount;
            else runningBalance += item.amount;`,
`        const historyWithBalance = sorted.map(item => {
            if (item.type === 'DEBIT') runningBalance -= item.amount;
            else if (item.payment?.paymentMethod !== 'CLIENT_CREDIT') runningBalance += item.amount;`
);

fs.writeFileSync('pages/lab/Dentists.tsx', content);
