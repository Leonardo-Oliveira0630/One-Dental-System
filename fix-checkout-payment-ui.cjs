const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const paymentSectionRegex = /\{\/\* Payment Method \*\/\}\s*<div className="space-y-2">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

if (store.match(paymentSectionRegex)) {
  store = store.replace(paymentSectionRegex, `\n\n              {/* Payment handled by Asaas Checkout */}\n`);
  fs.writeFileSync('pages/store/SupplierStore.tsx', store);
  console.log("Success");
} else {
  console.log("Not found");
}
