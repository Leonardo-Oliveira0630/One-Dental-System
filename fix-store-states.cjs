const fs = require('fs');
let store = fs.readFileSync('pages/store/SupplierStore.tsx', 'utf8');

const statesToAdd = `
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
`;

if (!store.includes('const [cpfCnpj')) {
  store = store.replace(/const \[isCheckoutOpen, setIsCheckoutOpen\] = useState\(false\);/, `$&${statesToAdd}`);
}

const uiToAdd = `
              <div className="space-y-4">
                  <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CPF/CNPJ do Pagador</label><input required value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} className="w-full px-4 py-3 border border-slate-700 bg-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white" placeholder="000.000.000-00" /></div>
                  {paymentMethod === 'CREDIT_CARD' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Número do Cartão</label><input required value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="w-full px-4 py-3 border border-slate-700 bg-slate-900 rounded-xl text-white" placeholder="0000 0000 0000 0000" /></div>
                          <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome no Cartão</label><input required value={cardHolder} onChange={e => setCardHolder(e.target.value)} className="w-full px-4 py-3 border border-slate-700 bg-slate-900 rounded-xl text-white" placeholder="NOME IMPRESSO" /></div>
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Validade</label><input required value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="w-full px-4 py-3 border border-slate-700 bg-slate-900 rounded-xl text-white" placeholder="MM/AA" /></div>
                              <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CVV</label><input required value={cardCvv} onChange={e => setCardCvv(e.target.value)} className="w-full px-4 py-3 border border-slate-700 bg-slate-900 rounded-xl text-white" placeholder="123" /></div>
                          </div>
                      </div>
                  )}
              </div>
`;

if (!store.includes('CPF/CNPJ do Pagador')) {
  store = store.replace(/(<label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Forma de Pagamento<\/label>[\s\S]*?<\/div>\s*<\/div>)/, `$1\n${uiToAdd}`);
}

const successUiPixToUpdate = `<h3 className="font-bold text-slate-800 mb-2">Pague com PIX</h3>`;
const newSuccessUiPix = `
                  <h3 className="font-bold text-slate-800 mb-2">Pague com PIX</h3>
                  {(orderSuccess as any).pixQrCode ? (
                    <div className="flex justify-center mb-4">
                      <img src={\`data:image/png;base64,\${(orderSuccess as any).pixQrCode}\`} alt="QR Code PIX" className="w-48 h-48 border rounded-lg" />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 mb-4">Aguardando QR Code...</p>
                  )}
`;

if (store.includes(successUiPixToUpdate)) {
  store = store.replace(successUiPixToUpdate, newSuccessUiPix);
}

fs.writeFileSync('pages/store/SupplierStore.tsx', store);
