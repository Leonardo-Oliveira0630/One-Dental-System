const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf-8');

const targetStr = `                                                                    {item.type === 'DEBIT' && item.job && (
                                                                        <div className="ml-10 space-y-1">
                                                                            {item.job.items.map((it:any, iIdx:number) => (
                                                                                <div key={iIdx} className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase">
                                                                                    <span>{it.quantity} x {it.name}</span>
                                                                                    <span className="text-slate-300">R$ {it.price.toFixed(2)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}`;

const replaceStr = `                                                                    {item.type === 'DEBIT' && 'job' in item && item.job && (
                                                                        <div className="ml-10 space-y-1">
                                                                            {item.job.items.map((it:any, iIdx:number) => (
                                                                                <div key={iIdx} className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase">
                                                                                    <span>{it.quantity} x {it.name}</span>
                                                                                    <span className="text-slate-300">R$ {it.price.toFixed(2)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('Patched Dentists.tsx type error job UI');
