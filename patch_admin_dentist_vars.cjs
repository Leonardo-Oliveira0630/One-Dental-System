const fs = require('fs');

let content = fs.readFileSync('pages/admin/DentistsTab.tsx', 'utf8');

content = content.replace(
`{type.variationGroups && type.variationGroups.length > 0 && (
                                                      <div className="pt-3 border-t border-slate-100">
                                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Variações</p>
                                                          <div className="space-y-2">
                                                              {type.variationGroups.map((group: any) => (`,
`{((type.variationGroups && type.variationGroups.length > 0) || (type.variations && type.variations.length > 0)) && (
                                                      <div className="pt-3 border-t border-slate-100">
                                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Variações</p>
                                                          <div className="space-y-2">
                                                              {(type.variationGroups && type.variationGroups.length > 0 ? type.variationGroups : [{ id: 'default', name: 'Opções', options: type.variations || [] }]).map((group: any) => (`
);

fs.writeFileSync('pages/admin/DentistsTab.tsx', content);

