const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const target1 = `            {!isClient && (
                <td className="p-4">
                    {job.boxNumber ? (`;

const repl1 = `            {!isClient && !isBudgetMode && (
                <td className="p-4">
                    {job.boxNumber ? (`;

const target2 = `            <td className="p-4 text-xs font-bold">
                {(() => {
                    const originInfo = getJobOriginInfo(job);
                    return (
                        <span className={\`px-2 py-0.5 rounded text-[10px] font-bold border \${originInfo.color}\`}>
                            {originInfo.label}
                        </span>
                    );
                })()}
            </td>`;

const repl2 = `            {!isBudgetMode && <td className="p-4 text-xs font-bold">
                {(() => {
                    const originInfo = getJobOriginInfo(job);
                    return (
                        <span className={\`px-2 py-0.5 rounded text-[10px] font-bold border \${originInfo.color}\`}>
                            {originInfo.label}
                        </span>
                    );
                })()}
            </td>}`;

const target3 = `            <td className="p-4">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {revealJobStatus ? (job.currentSector || 'Triagem') : 'Indisponível'}
                    </span>
                    {revealJobStatus && !isClient && (
                        <div className={\`flex items-center gap-1 text-xs font-bold \${timeInfo.isAttention ? 'text-amber-600' : 'text-slate-500'}\`}>
                            <Clock size={12} /> {timeInfo.label}
                            {timeInfo.isAttention && <AlertCircle size={12} className="animate-pulse" />}
                        </div>
                    )}
                </div>
            </td>
            <td className="p-4 text-slate-600 text-xs font-bold">{new Date(job.dueDate).toLocaleDateString()}</td>
            <td className="p-4 text-right">`;

const repl3 = `            {!isBudgetMode && <td className="p-4">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {revealJobStatus ? (job.currentSector || 'Triagem') : 'Indisponível'}
                    </span>
                    {revealJobStatus && !isClient && (
                        <div className={\`flex items-center gap-1 text-xs font-bold \${timeInfo.isAttention ? 'text-amber-600' : 'text-slate-500'}\`}>
                            <Clock size={12} /> {timeInfo.label}
                            {timeInfo.isAttention && <AlertCircle size={12} className="animate-pulse" />}
                        </div>
                    )}
                </div>
            </td>}
            {isBudgetMode && <td className="p-4 text-slate-600 text-xs font-bold">{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '-'}</td>}
            {!isBudgetMode && <td className="p-4 text-slate-600 text-xs font-bold">{(job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "-")}</td>}
            <td className="p-4 text-right">`;

const targetTableHead = `                <thead>
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

const replTableHead = `                <thead>
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

content = content.replace(target1, repl1);
content = content.replace(target2, repl2);
content = content.replace(target3, repl3);
content = content.replace(targetTableHead, replTableHead);

fs.writeFileSync('pages/JobsList.tsx', content);
console.log('patched JobsList formatting');
