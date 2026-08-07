const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const target = `                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest font-black">
                        <th className="p-4">OS #</th>
                        {!isClient && <th className="p-4">Caixa</th>}

                        <th className="p-4">Paciente</th>
                        <th className="p-4">Origem</th>
                        <th className="p-4">Dentista</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">{isClient ? 'Setor' : 'Setor/Tempo'}</th>
                        <th className="p-4">Entrega</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>`;

const repl = `                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest font-black">
                        <th className="p-4">{isBudgetMode ? 'Orçamento #' : 'OS #'}</th>
                        {!isClient && !isBudgetMode && <th className="p-4">Caixa</th>}
                        <th className="p-4">Paciente</th>
                        {!isBudgetMode && <th className="p-4">Origem</th>}
                        <th className="p-4">Dentista</th>
                        <th className="p-4">Status</th>
                        {!isBudgetMode && <th className="p-4">{isClient ? 'Setor' : 'Setor/Tempo'}</th>}
                        <th className="p-4">{isBudgetMode ? 'Data' : 'Entrega'}</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>`;

content = content.replace(target, repl);
fs.writeFileSync('pages/JobsList.tsx', content);
console.log('patched TH');
