const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const target = `    return (
        <tr className={\`hover:bg-blue-50/30 transition-colors \${showAttention ? 'bg-yellow-50/50' : ''}\`}>
            <td className="p-4 font-mono font-bold text-sm">
                <button onClick={() => navigate(\`/jobs/\${job.id}\`)} className="text-blue-600 hover:text-blue-800 hover:underline text-left">
                    {job.osNumber || '---'}
                </button>
            </td>
            {!isClient && !isBudgetMode && (
                <td className="p-4">
                    {job.boxNumber ? (
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs shadow-sm border border-black/10"
                            style={{ backgroundColor: job.boxColor?.hex || '#f1f5f9', color: job.boxColor ? getContrastColor(job.boxColor.hex) : '#64748b' }}
                        >
                            {job.boxNumber}
                        </div>
                    ) : <span className="text-slate-300">-</span>}
                </td>
            )}
            <td className="p-4">
                <div className="font-bold text-slate-900 text-sm">{job.patientName}</div>
                {(job.status === 'REJECTED' || (job.status as any) === 'REJECTED_REQUISITION') && job.rejectionReason && (
                    <div className="mt-1 text-[11px] font-medium text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 max-w-xs">
                        <span className="font-black text-[9px] uppercase tracking-wider block text-red-700">Motivo da Recusa:</span>
                        {job.rejectionReason}
                    </div>
                )}
            </td>
            <td className="p-4 text-xs font-bold">
                {(() => {
                    const originInfo = getJobOriginInfo(job);
                    return (
                        <span className={\`px-2 py-0.5 rounded text-[10px] font-bold border \${originInfo.color}\`}>
                            {originInfo.label}
                        </span>
                    );
                })()}
            </td>
            <td className="p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-tight">{job.dentistName}</div>
            </td>
            <td className="p-4">
                {revealJobStatus ? (
                    <span className={\`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border \${getStatusColor(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)}\`}>
                        {getTranslatedStatus(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)}
                    </span>
                ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase border bg-slate-100 text-slate-400 border-slate-200" title="Função de andamento indisponível no momento">
                        Indisponível
                    </span>
                )}
            </td>
            <td className="p-4">
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
            <td className="p-4 text-right">
                <div className="flex justify-end gap-1">
                    {canFinalize && <button onClick={() => handleFinalizeJob(job)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg"><CheckCircle2 size={18} /></button>}
                    {canReopen && <button onClick={() => handleReopenJob(job)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg"><RotateCcw size={18} /></button>}
                    {canRoute && <button onClick={() => setRouteModalJob(job)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"><Truck size={18} /></button>}
                    <button onClick={() => navigate(\`/jobs/\${job.id}\`)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Eye size={18} /></button>
                </div>
            </td>
        </tr>
    );`;

const repl = `    return (
        <tr className={\`hover:bg-blue-50/30 transition-colors \${showAttention ? 'bg-yellow-50/50' : ''}\`}>
            <td className="p-4 font-mono font-bold text-sm">
                <button onClick={() => navigate(\`/jobs/\${job.id}\`)} className="text-blue-600 hover:text-blue-800 hover:underline text-left">
                    {job.osNumber || '---'}
                </button>
            </td>
            {!isClient && !isBudgetMode && (
                <td className="p-4">
                    {job.boxNumber ? (
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs shadow-sm border border-black/10"
                            style={{ backgroundColor: job.boxColor?.hex || '#f1f5f9', color: job.boxColor ? getContrastColor(job.boxColor.hex) : '#64748b' }}
                        >
                            {job.boxNumber}
                        </div>
                    ) : <span className="text-slate-300">-</span>}
                </td>
            )}
            {!isBudgetMode && (
                <td className="p-4">
                    <div className="font-bold text-slate-900 text-sm">{job.patientName}</div>
                    {(job.status === 'REJECTED' || (job.status as any) === 'REJECTED_REQUISITION') && job.rejectionReason && (
                        <div className="mt-1 text-[11px] font-medium text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 max-w-xs">
                            <span className="font-black text-[9px] uppercase tracking-wider block text-red-700">Motivo da Recusa:</span>
                            {job.rejectionReason}
                        </div>
                    )}
                </td>
            )}
            {isBudgetMode && (
                <td className="p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-tight">{job.dentistName}</div>
                </td>
            )}
            {isBudgetMode && (
                <td className="p-4">
                    <div className="font-bold text-slate-900 text-sm">{job.patientName}</div>
                </td>
            )}
            {!isBudgetMode && (
                <td className="p-4 text-xs font-bold">
                    {(() => {
                        const originInfo = getJobOriginInfo(job);
                        return (
                            <span className={\`px-2 py-0.5 rounded text-[10px] font-bold border \${originInfo.color}\`}>
                                {originInfo.label}
                            </span>
                        );
                    })()}
                </td>
            )}
            {!isBudgetMode && (
                <td className="p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-tight">{job.dentistName}</div>
                </td>
            )}
            {!isBudgetMode && (
                <td className="p-4">
                    {revealJobStatus ? (
                        <span className={\`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border \${getStatusColor(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)}\`}>
                            {getTranslatedStatus(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)}
                        </span>
                    ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase border bg-slate-100 text-slate-400 border-slate-200" title="Função de andamento indisponível no momento">
                            Indisponível
                        </span>
                    )}
                </td>
            )}
            {!isBudgetMode && (
                <td className="p-4">
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
            )}
            {isBudgetMode && (
                <td className="p-4 text-slate-600 text-xs font-bold">
                    {job.createdAt ? (
                        job.createdAt instanceof Date 
                            ? job.createdAt.toLocaleDateString()
                            : new Date((job.createdAt as any).seconds ? (job.createdAt as any).seconds * 1000 : job.createdAt).toLocaleDateString()
                    ) : '-'}
                </td>
            )}
            {!isBudgetMode && (
                <td className="p-4 text-slate-600 text-xs font-bold">{(job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "-")}</td>
            )}
            {!isBudgetMode && (
                <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                        {canFinalize && <button onClick={() => handleFinalizeJob(job)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg"><CheckCircle2 size={18} /></button>}
                        {canReopen && <button onClick={() => handleReopenJob(job)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg"><RotateCcw size={18} /></button>}
                        {canRoute && <button onClick={() => setRouteModalJob(job)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg"><Truck size={18} /></button>}
                        <button onClick={() => navigate(\`/jobs/\${job.id}\`)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Eye size={18} /></button>
                    </div>
                </td>
            )}
            {isBudgetMode && (
                <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                        <button onClick={() => navigate(\`/jobs/\${job.id}\`)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Eye size={14} /> Resumo</button>
                    </div>
                </td>
            )}
        </tr>
    );`;

// Let's do a strict replace
if (content.indexOf(target) !== -1) {
    content = content.replace(target, repl);
    fs.writeFileSync('pages/JobsList.tsx', content);
    console.log('patched JobRow exactly');
} else {
    console.log('target not found, let us check where it differs.');
}
