const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const regexToReplace = /\{\/\* Payment handled by Asaas Checkout \*\/\}[\s\S]*?\{\/\* Delivery Address \*\/\}/;

if (store.match(regexToReplace)) {
  store = store.replace(regexToReplace, `{/* Payment handled by Asaas Checkout */}\n              {/* Delivery Address */}`);
  fs.writeFileSync('pages/store/SupplierStore.tsx', store);
  console.log("Success");
} else {
  console.log("Not found");
}
