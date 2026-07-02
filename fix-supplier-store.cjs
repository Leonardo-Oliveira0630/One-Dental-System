const fs = require('fs');

let service = fs.readFileSync('services/firebaseService.ts', 'utf8');
if (!service.includes('apiCreateSupplierPayment')) {
  service += `\nexport const apiCreateSupplierPayment = async (orderData: any, paymentData: any) => {
    const fn = httpsCallable(functions, 'createSupplierPayment');
    return (await fn({ orderData, paymentData })).data;
};\n`;
  fs.writeFileSync('services/firebaseService.ts', service);
}

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const regexToReplace = /asaasPaymentId: \`pay_\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 10\)\}\`,\s*asaasPixCopyPaste: paymentMethod === 'PIX' \? \`00020126580014br\.gov\.bcb\.pix0136\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 10\)\}\` : undefined,\s*asaasInvoiceUrl: \`https:\/\/sandbox\.asaas\.com\/i\/\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 10\)\}\`,/g;

if (store.match(regexToReplace)) {
  store = store.replace(regexToReplace, '');
}

const addSupplierOrderRegex = /await addSupplierOrder\(newOrder\);\s*lastOrder = newOrder;/g;
const replacementAddOrder = `
        const paymentData = {
          method: paymentMethod,
          cpfCnpj: cpfCnpj.replace(/\\D/g, ''),
          creditCard: paymentMethod === 'CREDIT_CARD' ? {
              number: cardNumber.replace(/\\s/g, ''),
              holderName: cardHolder,
              expiry: cardExpiry,
              cvv: cardCvv
          } : undefined
        };

        const result: any = await api.apiCreateSupplierPayment(newOrder, paymentData);

        if (result && result.success) {
          lastOrder = {
            ...newOrder,
            asaasPaymentId: result.paymentId,
            asaasInvoiceUrl: result.invoiceUrl,
            asaasPixCopyPaste: result.pixCopyPaste,
            pixQrCode: result.pixQrCode // temporary hold for UI
          };
          // addSupplierOrder was already called via functions? 
          // Wait, the function sets the doc, but we might want to also add it to our local context or run addSupplierOrder.
          // Since the function does db.collection("supplierOrders").doc(orderData.id).set(newOrderData),
          // we just need to update the UI.
        } else {
           throw new Error("Falha no pagamento");
        }
`;
if (store.includes('await addSupplierOrder(newOrder);')) {
  store = store.replace(addSupplierOrderRegex, replacementAddOrder);
}

// Ensure api is imported
if (!store.includes('import * as api')) {
  store = store.replace(/import \{.*?\} from 'react';/, `$& \nimport * as api from '../../services/firebaseService';`);
}

fs.writeFileSync('pages/store/SupplierStore.tsx', store);
