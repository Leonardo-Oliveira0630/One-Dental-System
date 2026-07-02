const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

store = store.replace(/shippingMethod,\n          buyerAddress: address/g, `shippingMethod,\n          paymentMethod: 'BOLETO', // Asaas allows user to choose\n          buyerAddress: address`);

fs.writeFileSync('pages/store/SupplierStore.tsx', store);
