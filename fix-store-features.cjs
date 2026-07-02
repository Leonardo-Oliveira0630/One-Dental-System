const fs = require('fs');

let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const regexToReplaceStates = /const \[selectedItemForDetail, setSelectedItemForDetail\] = useState<InventoryItem \| null>\(null\);/;
const statesToAdd = `
  const [activeTab, setActiveTab] = useState<'STORE' | 'MY_ORDERS'>('STORE');
  const [shippingMethod, setShippingMethod] = useState<'COMBINE' | 'PAC' | 'SEDEX'>('COMBINE');
`;
if (store.match(regexToReplaceStates)) {
  store = store.replace(regexToReplaceStates, `$&${statesToAdd}`);
}

const checkoutShippingUI = `
              {/* Shipping Method */}
              <div className="space-y-3 mb-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Opções de Frete (Melhor Envio)</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setShippingMethod('COMBINE')}
                    className={\`p-3 rounded-xl border text-left font-bold text-sm transition-all \${
                      shippingMethod === 'COMBINE' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                        : 'border-slate-800 bg-slate-950 text-slate-450 hover:bg-slate-850'
                    }\`}
                  >
                    Combinar com o vendedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setShippingMethod('PAC')}
                    className={\`p-3 rounded-xl border text-left font-bold text-sm transition-all \${
                      shippingMethod === 'PAC' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                        : 'border-slate-800 bg-slate-950 text-slate-450 hover:bg-slate-850'
                    }\`}
                  >
                    PAC - Correios (Simulado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShippingMethod('SEDEX')}
                    className={\`p-3 rounded-xl border text-left font-bold text-sm transition-all \${
                      shippingMethod === 'SEDEX' 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                        : 'border-slate-800 bg-slate-950 text-slate-450 hover:bg-slate-850'
                    }\`}
                  >
                    SEDEX - Correios (Simulado)
                  </button>
                </div>
              </div>
`;

if (!store.includes('Opções de Frete')) {
  store = store.replace(/<form onSubmit=\{handleCheckout\} className="p-6 overflow-y-auto space-y-5">/, `$&${checkoutShippingUI}`);
}

const asaasCheckoutRedirect = `
        const result: any = await api.apiCreateSupplierPayment(newOrder, { cpfCnpj: cpfCnpj.replace(/\\D/g, '') });

        if (result && result.success && result.invoiceUrl) {
          window.location.href = result.invoiceUrl;
          return;
        } else {
           throw new Error("Falha ao gerar link de pagamento");
        }
`;

const oldCheckoutCodeRegex = /const paymentData = \{[\s\S]*?throw new Error\("Falha no pagamento"\);\n        \}/g;
if (store.match(oldCheckoutCodeRegex)) {
  store = store.replace(oldCheckoutCodeRegex, asaasCheckoutRedirect);
}

fs.writeFileSync('pages/store/SupplierStore.tsx', store);
