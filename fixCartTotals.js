import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'pages/store/SupplierStore.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace("const cartTotals.finalTotals = useMemo(() => {", "const cartTotals = useMemo(() => {");

const couponUI = `
              {/* Cupom de Desconto */}
              <div className="pt-4 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cupom de Desconto</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                    disabled={appliedCoupon !== null}
                    placeholder="Insira o código"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white uppercase disabled:opacity-50"
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
                {couponError && <p className="text-red-400 text-xs mt-1">{couponError}</p>}
                {appliedCoupon && (
                  <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                    <Check size={12} /> Cupom {appliedCoupon.code} aplicado com sucesso!
                  </p>
                )}
              </div>
`;

content = content.replace(
  /<div className="pt-4 border-t border-slate-800 space-y-2">/g,
  couponUI + '\n              <div className="pt-4 border-t border-slate-800 space-y-2">'
);

fs.writeFileSync(filePath, content);
