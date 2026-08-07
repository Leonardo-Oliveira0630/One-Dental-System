const fs = require('fs');
let content = fs.readFileSync('pages/JobsList.tsx', 'utf8');

const startIndex = content.indexOf('const JobCard = memo(');
let endIndex = content.indexOf('    );\n});', startIndex);
if (endIndex === -1) {
    endIndex = content.indexOf('    )\n});', startIndex);
}
if (endIndex === -1) {
    endIndex = content.indexOf('});', content.indexOf('    );', startIndex));
}

if (startIndex === -1 || endIndex === -1) {
    console.log('Could not find JobCard boundaries.');
    process.exit(1);
}

const replacement = `const JobCard = memo(({ isJobOverdue, 
    job, 
    navigate, 
    getStatusColor, 
    getTranslatedStatus, 
    getSectorTimeInfo, 
    isClient,
    isBudgetMode,
    revealJobStatus
}: { 
    isJobOverdue?: any,
    job: Job, 
    navigate: any, 
    getStatusColor: any, 
    getTranslatedStatus: any, 
    getSectorTimeInfo: any, 
    isClient: boolean,
    isBudgetMode?: boolean,
    revealJobStatus: boolean
}) => {
    const timeInfo = getSectorTimeInfo(job);
    const showAttention = !isClient && timeInfo.isAttention;
    return (
        <div onClick={() => navigate(\`/jobs/\${job.id}\`)} className={\`bg-white rounded-2xl p-4 shadow-sm border transition-transform relative overflow-hidden active:scale-[0.98] \${showAttention ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}\`}>
            {job.urgency === UrgencyLevel.VIP && <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden"><div className="bg-orange-500 text-white text-[8px] font-black py-1 px-10 transform rotate-45 translate-x-3 -translate-y-1 text-center shadow-sm uppercase">VIP</div></div>}

            {showAttention && <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 animate-pulse" />}

            
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-blue-600 text-base">#{job.osNumber || '---'}</span>
                    {!isBudgetMode && (
                        revealJobStatus ? (
                            <span className={\`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border \${getStatusColor(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)}\`}>
                                {getTranslatedStatus(job.status, typeof isJobOverdue === "function" ? isJobOverdue(job) : false)}
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase border bg-slate-100 text-slate-400 border-slate-200">
                                Indisponível
                            </span>
                        )
                    )}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">{isBudgetMode ? 'Criado em' : 'Entrega'}</p>
                    <p className="text-xs font-bold text-slate-800">
                        {isBudgetMode 
                            ? (job.createdAt ? (job.createdAt instanceof Date ? job.createdAt.toLocaleDateString() : new Date((job.createdAt as any).seconds ? (job.createdAt as any).seconds * 1000 : job.createdAt).toLocaleDateString()) : '-')
                            : (job.dueDate ? new Date(job.dueDate).toLocaleDateString() : '-')
                        }
                    </p>
                </div>
            </div>

            <div className="space-y-1 mb-4">
                <h3 className="font-black text-slate-900 text-lg leading-tight">{job.patientName}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                    <User size={12} className="text-blue-500" />
                    <span className="uppercase truncate">Dr(a). {job.dentistName}</span>
                </div>
                {!isBudgetMode && (job.status === 'REJECTED' || (job.status as any) === 'REJECTED_REQUISITION') && job.rejectionReason && (
                    <div className="mt-2 text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-xl p-2.5">
                        <span className="font-black text-[9px] uppercase tracking-wider block mb-0.5 text-red-800">Motivo da Recusa:</span>
                        {job.rejectionReason}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                   {!isClient && !isBudgetMode && job.boxNumber && (
                       <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg">
                           <Box size={14} className="text-slate-400" />
                           <span className="text-xs font-black text-slate-700">{job.boxNumber}</span>
                       </div>
                   )}

                   {!isBudgetMode && (
                       <div className={\`flex items-center gap-1.5 px-2 py-1 rounded-lg \${revealJobStatus ? (showAttention ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700') : 'bg-slate-100 text-slate-400'}\`}>
                           <MapPin size={14} className={revealJobStatus ? (showAttention ? 'text-amber-500' : 'text-blue-400') : 'text-slate-400'} />
                           <span className="text-xs font-bold truncate max-w-[100px]">{revealJobStatus ? (job.currentSector || 'Recepção') : 'Indisponível'}</span>
                           {revealJobStatus && !isClient && <span className="text-[10px] font-black border-l border-current pl-1.5 ml-0.5">{timeInfo.label}</span>}
                       </div>
                   )}
                   {!isBudgetMode && (() => {
                        const originInfo = getJobOriginInfo(job);
                        return (
                            <span className={\`px-2 py-1 rounded-lg text-xs font-bold border \${originInfo.color}\`}>
                                {originInfo.label}
                            </span>
                        );
                   })()}
                </div>
                <ChevronRight className="text-slate-300 flex-shrink-0" size={20} />
            </div>
        </div>
    );
});`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex + 4);
fs.writeFileSync('pages/JobsList.tsx', content);
console.log('replaced JobCard');
