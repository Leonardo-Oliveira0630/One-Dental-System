const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

content = content.replace(
`                type: manualEntryType === 'MANUAL_DEBIT' ? 'DEBIT_ADJUSTMENT' : 'CREDIT_ADJUSTMENT',`,
`                type: manualEntryType === 'MANUAL_DEBIT' ? 'MANUAL_DEBIT' : 'MANUAL_CREDIT',`
);

fs.writeFileSync('pages/lab/Dentists.tsx', content);
