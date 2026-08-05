const fs = require('fs');
let code = fs.readFileSync('pages/lab/Dentists.tsx', 'utf-8');

const regex = /return \(\s*<div key=\{type\.id\} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all">(.*?)<\/div>\s*\);\s*\}\)/s;

const match = regex.exec(code);
if (match) {
    const innerContent = match[1];
    const newCode = `return (
                                                        <div key={type.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all gap-4">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                                                                ${innerContent}
                                                            </div>
                                                            {type.variationGroups && type.variationGroups.length > 0 && (
                                                                <div className="mt-2 pt-4 border-t border-slate-200">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Variações / Adicionais</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                                        {type.variationGroups.map((group: any) => (
                                                                            <div key={group.id} className="space-y-3">
                                                                                <p className="text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full inline-block">{group.name}</p>
                                                                                <div className="space-y-2">
                                                                                    {group.options.map((opt: any) => {
                                                                                        const tablePriceObj = priceTables.find(t => t.id === priceTableId)?.prices[type.id];
                                                                                        const tableVariationPrice = tablePriceObj?.variations?.[opt.id];
                                                                                        const baseVariationPrice = tableVariationPrice !== undefined ? tableVariationPrice : opt.priceModifier;
                                                                                        const customVarPrice = cp?.variations?.[opt.id];
                                                                                        return (
                                                                                            <div key={opt.id} className="flex items-center justify-between text-xs px-2 group/opt">
                                                                                                <div className="flex flex-col">
                                                                                                    <span className="text-slate-600 font-bold">{opt.name}</span>
                                                                                                    <span className="text-[9px] text-slate-400">Padrão: R$ {baseVariationPrice.toFixed(2)}</span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="text-[9px] text-slate-400 font-bold">R$</span>
                                                                                                    <input 
                                                                                                        type="number"
                                                                                                        value={customVarPrice !== undefined ? customVarPrice : ''}
                                                                                                        onChange={e => {
                                                                                                            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                                                                                            const newCustomPrices = [...customPrices];
                                                                                                            let idx = newCustomPrices.findIndex(p => p.jobTypeId === type.id);
                                                                                                            if (idx === -1) {
                                                                                                                idx = newCustomPrices.length;
                                                                                                                newCustomPrices.push({ jobTypeId: type.id, variations: {} });
                                                                                                            }
                                                                                                            if (!newCustomPrices[idx].variations) newCustomPrices[idx].variations = {};
                                                                                                            
                                                                                                            if (val === undefined) {
                                                                                                                delete newCustomPrices[idx].variations[opt.id];
                                                                                                                if (Object.keys(newCustomPrices[idx].variations).length === 0) {
                                                                                                                    delete newCustomPrices[idx].variations;
                                                                                                                    if (!newCustomPrices[idx].fixedPrice && !newCustomPrices[idx].discountPercent) {
                                                                                                                        newCustomPrices.splice(idx, 1);
                                                                                                                    }
                                                                                                                }
                                                                                                            } else {
                                                                                                                newCustomPrices[idx].variations[opt.id] = val;
                                                                                                            }
                                                                                                            setCustomPrices(newCustomPrices);
                                                                                                        }}
                                                                                                        className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-md font-bold text-right outline-none focus:border-blue-400 transition-all"
                                                                                                        placeholder="Fixo"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })`;
    
    code = code.replace(regex, newCode);
    fs.writeFileSync('pages/lab/Dentists.tsx', code, 'utf-8');
    console.log('patched dentists.tsx');
} else {
    console.log('not found');
}
