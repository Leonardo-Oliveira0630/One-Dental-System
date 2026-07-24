const fs = require('fs');
let code = fs.readFileSync('context/AppContext.tsx', 'utf8');

code = code.replace(/mode: 'SHEET' \| 'LABEL' \| 'ROUTE' \| 'ADDRESS_LABEL'/g, "mode: 'SHEET' | 'LABEL' | 'ROUTE' | 'ADDRESS_LABEL' | 'INVOICE_SHEET'");
code = code.replace(/m: 'SHEET' \| 'LABEL' \| 'ADDRESS_LABEL'/g, "m: 'SHEET' | 'LABEL' | 'ADDRESS_LABEL' | 'INVOICE_SHEET'");
code = code.replace(/mode: 'SHEET' \| 'LABEL' \| 'ADDRESS_LABEL'/g, "mode: 'SHEET' | 'LABEL' | 'ADDRESS_LABEL' | 'INVOICE_SHEET'");

fs.writeFileSync('context/AppContext.tsx', code);
console.log("Patched AppContext.tsx");
