import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'pages/supplier/Products.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update init form
content = content.replace(
  "sellPrice: 0,",
  "sellPrice: 0,\n    isPromotion: false,\n    promotionalPrice: 0,"
);

// Update save payload
content = content.replace(
  "sellPrice: Number(form.sellPrice || 0),",
  "sellPrice: Number(form.sellPrice || 0),\n      isPromotion: form.isPromotion === true,\n      promotionalPrice: Number(form.promotionalPrice || 0),"
);

// Add form UI
const searchUI = `                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Preço de Venda (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={form.sellPrice}
                        onChange={e => setForm(prev => ({ ...prev, sellPrice: Number(e.target.value) }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>`;

const newUI = searchUI + `

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col justify-center">
                      <label className="flex items-center gap-2 cursor-pointer mt-6">
                        <input
                          type="checkbox"
                          checked={form.isPromotion || false}
                          onChange={e => setForm(prev => ({ ...prev, isPromotion: e.target.checked }))}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-sm font-medium text-slate-300">Produto em Promoção?</span>
                      </label>
                    </div>
                    {form.isPromotion && (
                      <div>
                        <label className="block text-xs font-medium text-amber-400 mb-1">Preço Promocional (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={form.promotionalPrice || 0}
                          onChange={e => setForm(prev => ({ ...prev, promotionalPrice: Number(e.target.value) }))}
                          className="w-full bg-slate-950 border border-amber-900/50 rounded-xl px-4 py-2.5 text-xs text-amber-400 outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                      </div>
                    )}
                  </div>`;

content = content.replace(searchUI, newUI);

fs.writeFileSync(filePath, content);
