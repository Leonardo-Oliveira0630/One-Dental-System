const fs = require('fs');
let content = fs.readFileSync('pages/lab/PriceTables.tsx', 'utf8');

content = content.replace(
`{jt.variationGroups.length > 0 && (
                                                    <div className="p-6 bg-white space-y-4">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Variações / Adicionais</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                            {jt.variationGroups.map(group => (`,
`{((jt.variationGroups && jt.variationGroups.length > 0) || (jt.variations && jt.variations.length > 0)) && (
                                                    <div className="p-6 bg-white space-y-4">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Variações / Adicionais</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                            {(jt.variationGroups && jt.variationGroups.length > 0 ? jt.variationGroups : [{ id: 'default', name: 'Opções', options: jt.variations || [] }]).map((group: any) => (`
);
fs.writeFileSync('pages/lab/PriceTables.tsx', content);
