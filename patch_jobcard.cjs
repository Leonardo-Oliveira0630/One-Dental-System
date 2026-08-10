const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const targetCard = `<div className="space-y-1 mb-4">
                <h3 className="font-black text-slate-900 text-lg leading-tight">{job.patientName}</h3>`;

const replCard = `<div className="space-y-1 mb-4">
                {isBudgetMode && (
                    <div className="mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase leading-none block mb-1">Valor Final</span>
                        <span className="font-bold text-slate-800 text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(job.finalValue || 0)}
                        </span>
                    </div>
                )}
                <h3 className="font-black text-slate-900 text-lg leading-tight">{job.patientName}</h3>`;

content = content.replace(targetCard, replCard);
fs.writeFileSync('pages/JobsList.tsx', content);
console.log('patched jobcard');
