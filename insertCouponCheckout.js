import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'pages/store/SupplierStore.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const couponUI = `
              {/* Cupom de Desconto */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Cupom de Desconto</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                    disabled={appliedCoupon !== null}
                    placeholder="Insira o código do cupom"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white uppercase disabled:opacity-50"
                  />
                  {!appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={checkingCoupon || !couponCodeInput}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {checkingCoupon ? '...' : 'Aplicar'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponCodeInput(''); }}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold rounded-lg transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {couponError && <p className="text-red-400 text-xs">{couponError}</p>}
                {appliedCoupon && (
                  <p className="text-emerald-400 text-xs flex items-center gap-1">
                    <Check size={12} /> Cupom {appliedCoupon.code} aplicado com sucesso!
                  </p>
                )}
              </div>
`;

content = content.replace(
  "{/* Order summary breakdown */}",
  couponUI + "\n\n              {/* Order summary breakdown */}"
);

// Update order summary breakdown to show discount
content = content.replace(
  `<div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Itens Selecionados</span>
                  <span>R$ {cartTotals.finalTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Frete / Despacho</span>
                  <span className="text-emerald-400 font-semibold uppercase">Grátis</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-slate-100">
                  <span>Total a Pagar</span>
                  <span className="font-mono text-teal-400">R$ {cartTotals.finalTotal.toFixed(2)}</span>
                </div>
              </div>`,
  `<div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>R$ {cartTotals.baseTotal.toFixed(2)}</span>
                </div>
                {cartTotals.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Desconto ({appliedCoupon?.code})</span>
                    <span>- R$ {cartTotals.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Frete / Despacho</span>
                  <span className="text-emerald-400 font-semibold uppercase">Grátis</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-slate-100">
                  <span>Total a Pagar</span>
                  <span className="font-mono text-teal-400">R$ {cartTotals.finalTotal.toFixed(2)}</span>
                </div>
              </div>`
);


fs.writeFileSync(filePath, content);
