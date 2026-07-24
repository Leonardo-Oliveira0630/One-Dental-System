const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const targetStr = '<span className="font-mono font-black text-2xl md:text-3xl text-slate-900 tracking-tight shrink-0">OS #{job.osNumber || \'---\'}</span>';

const newStr = `
                    <div className="flex items-center gap-3 shrink-0 relative overflow-visible">
                        <span className="font-mono font-black text-2xl md:text-3xl text-slate-900 tracking-tight shrink-0">OS #{job.osNumber || '---'}</span>
                        {jobs.filter(j => j.patientName === job.patientName).length > 1 && (
                            <div className="relative group shrink-0">
                                <button className="text-[9px] bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-black uppercase tracking-widest hover:bg-slate-300 transition-colors shadow-sm cursor-pointer border border-slate-300">Todos os Casos</button>
                                <div className="absolute left-0 top-full mt-2 hidden group-hover:block bg-white shadow-2xl border border-slate-200 rounded-xl py-2 w-48 z-[9999]">
                                    <div className="px-3 pb-2 mb-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Histórico do Paciente
                                    </div>
                                    {jobs.filter(j => j.patientName === job.patientName)
                                         .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                         .map(j => (
                                        <button 
                                            key={j.id} 
                                            onClick={() => navigate(\`/lab/jobs/\${j.id}\`)} 
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm font-mono font-bold text-slate-700 flex items-center justify-between"
                                        >
                                            <span>OS {j.osNumber || 'N/A'}</span>
                                            {j.id === job.id && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
`.trim();

code = code.replace(targetStr, newStr);

fs.writeFileSync('pages/JobDetails.tsx', code);
console.log("Patched JobDetails.tsx");
