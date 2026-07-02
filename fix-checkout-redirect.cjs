const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const regexToReplace = /const result: any = await api\.apiCreateSupplierPayment\(newOrder, \{ cpfCnpj: cpfCnpj\.replace\(\/\\D\/g, ''\) \}\);\n\n        if \(result && result\.success && result\.invoiceUrl\) \{\n          window\.location\.href = result\.invoiceUrl;\n          return;\n        \} else \{\n           throw new Error\("Falha ao gerar link de pagamento"\);\n        \}\n\n\n      \}\n\n      \/\/ Sync and succeed\n      setOrderSuccess\(lastOrder\);/g;

const newCode = `const result: any = await api.apiCreateSupplierPayment(newOrder, { cpfCnpj: cpfCnpj.replace(/\\D/g, '') });

        if (result && result.success && result.invoiceUrl) {
          lastOrder = { ...newOrder, asaasInvoiceUrl: result.invoiceUrl } as SupplierOrder;
        } else {
           throw new Error("Falha ao gerar link de pagamento");
        }
      }

      saveCartToStorage([]); // clear
      setNotes('');
      setIsCheckoutOpen(false);
      
      if (lastOrder && lastOrder.asaasInvoiceUrl) {
         window.location.href = lastOrder.asaasInvoiceUrl;
      } else {
         setOrderSuccess(lastOrder);
      }`;

if (store.match(regexToReplace)) {
  store = store.replace(regexToReplace, newCode);
  fs.writeFileSync('pages/store/SupplierStore.tsx', store);
  console.log("Success");
} else {
  console.log("Not found");
}
