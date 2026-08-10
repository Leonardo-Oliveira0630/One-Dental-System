const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const targetTd = `            {isBudgetMode && (
                <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                        <button onClick={() => navigate(\`/jobs/\${job.id}\`)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">Resumo</button>
                    </div>
                </td>
            )}`;

const replTd = `            {isBudgetMode && (
                <td className="p-4 text-right font-bold text-xs text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(job.finalValue || 0)}
                </td>
            )}
            {isBudgetMode && (
                <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                        <button onClick={() => navigate(\`/jobs/\${job.id}\`)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" title="Ver Orçamento">
                            <Eye size={18} />
                        </button>
                    </div>
                </td>
            )}`;

content = content.replace(targetTd, replTd);

fs.writeFileSync('pages/JobsList.tsx', content);
console.log('patched desktop td');
