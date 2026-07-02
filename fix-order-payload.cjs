const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const oldOrderPayloadRegex = /paymentMethod: paymentMethod,\s*asaasPaymentId: `pay_\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 10\)\}`,\s*asaasPixCopyPaste: paymentMethod === 'PIX' \? `00020126580014br\.gov\.bcb\.pix0136\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 10\)\}` : undefined,\s*asaasInvoiceUrl: `https:\/\/sandbox\.asaas\.com\/i\/\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 10\)\}`,\s*buyerAddress: address/g;

const newOrderPayload = `shippingMethod, buyerAddress: address`;
if (store.match(oldOrderPayloadRegex)) {
  store = store.replace(oldOrderPayloadRegex, newOrderPayload);
}

// In case it was already replaced by the previous fix:
const oldOrderPayloadRegex2 = /notes: notes \|\| undefined,\s*paymentMethod: paymentMethod,\s*buyerAddress: address/g;
if (store.match(oldOrderPayloadRegex2)) {
  store = store.replace(oldOrderPayloadRegex2, `notes: notes || undefined,\n          shippingMethod,\n          buyerAddress: address`);
}

fs.writeFileSync('pages/store/SupplierStore.tsx', store);
