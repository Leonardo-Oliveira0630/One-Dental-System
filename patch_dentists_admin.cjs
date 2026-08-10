const fs = require('fs');
let code = fs.readFileSync('pages/admin/DentistsTab.tsx', 'utf-8');

const regex = /return \(\s*<div key=\{type\.id\} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">(.*?)<\/div>\s*\);\s*\}\)/s;

const match = regex.exec(code);
if (match) {
    const innerContent = match[1];
    const newCode = `return (
                                              <div key={type.id} className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl gap-3">
                                                  <div className="flex items-center justify-between">
                                                      ${innerContent}
                                                  </div>
                                                  {type.variationGroups && type.variationGroups.length > 0 && (
                                                      <div className="pt-3 border-t border-slate-100">
                                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Variações</p>
                                                          <div className="space-y-2">
                                                              {type.variationGroups.map((group: any) => (
                                                                  <div key={group.id} className="pl-2 border-l-2 border-slate-100">
                                                                      <p className="text-[9px] font-bold text-slate-500 mb-1">{group.name}</p>
                                                                      <div className="space-y-1">
                                                                          {group.options.map((opt: any) => {
                                                                              const customVarPrice = cp?.variations?.[opt.id];
                                                                              return (
                                                                                  <div key={opt.id} className="flex items-center justify-between">
                                                                                      <span className="text-[10px] text-slate-600 truncate max-w-[120px]">{opt.name}</span>
                                                                                      <div className="flex items-center">
                                                                                          <span className="text-[9px] text-slate-400 pr-1">R$</span>
                                                                                          <input
                                                                                              type="number"
                                                                                              value={customVarPrice !== undefined ? customVarPrice : ''}
                                                                                              onChange={e => {
                                                                                                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                                                                                  const newCustomPrices = [...(formData.customPrices || [])];
                                                                                                  let idx = newCustomPrices.findIndex((p: any) => p.jobTypeId === type.id);
                                                                                                  if (idx === -1) {
                                                                                                      idx = newCustomPrices.length;
                                                                                                      newCustomPrices.push({ jobTypeId: type.id, variations: {} } as any);
                                                                                                  }
                                                                                                  if (!(newCustomPrices[idx] as any).variations) (newCustomPrices[idx] as any).variations = {};
                                                                                                  
                                                                                                  if (val === undefined) {
                                                                                                      delete (newCustomPrices[idx] as any).variations[opt.id];
                                                                                                      if (Object.keys((newCustomPrices[idx] as any).variations).length === 0) {
                                                                                                          delete (newCustomPrices[idx] as any).variations;
                                                                                                          if (!(newCustomPrices[idx] as any).fixedPrice && !(newCustomPrices[idx] as any).discountPercent) {
                                                                                                              newCustomPrices.splice(idx, 1);
                                                                                                          }
                                                                                                      }
                                                                                                  } else {
                                                                                                      (newCustomPrices[idx] as any).variations[opt.id] = val;
                                                                                                  }
                                                                                                  setFormData(prev => ({ ...prev, customPrices: newCustomPrices }));
                                                                                              }}
                                                                                              className="w-14 px-1 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded text-right outline-none focus:border-blue-400"
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
    fs.writeFileSync('pages/admin/DentistsTab.tsx', code, 'utf-8');
    console.log('patched dentists tab admin');
} else {
    console.log('not found in admin');
}
