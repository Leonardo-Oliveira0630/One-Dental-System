const fs = require('fs');

let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

// Undo the bad patch
content = content.replace(
`{((type.variationGroups && type.variationGroups.length > 0) || (type.variations && type.variations.length > 0)) && (
                                                                <div className="mt-2 pt-4 border-t border-slate-200">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Variações / Adicionais</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                                        {(type.variationGroups && type.variationGroups.length > 0 ? type.variationGroups : [{ id: 'default', name: 'Opções', options: type.variations || [] }]).map((group: any) => (
                                                                <div className="mt-2 pt-4 border-t border-slate-200">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Variações / Adicionais</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                                        {type.variationGroups.map((group: any) => (`,
`{((type.variationGroups && type.variationGroups.length > 0) || (type.variations && type.variations.length > 0)) && (
                                                                <div className="mt-2 pt-4 border-t border-slate-200">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Variações / Adicionais</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                                                                        {(type.variationGroups && type.variationGroups.length > 0 ? type.variationGroups : [{ id: 'default', name: 'Opções', options: type.variations || [] }]).map((group: any) => (`
);

fs.writeFileSync('pages/lab/Dentists.tsx', content);

