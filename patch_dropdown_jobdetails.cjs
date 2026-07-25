const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

// 1. Add state
code = code.replace(
  /const \[showRouteModal, setShowRouteModal\] = useState\(false\);/,
  "const [showRouteModal, setShowRouteModal] = useState(false);\n  const [isCasesDropdownOpen, setIsCasesDropdownOpen] = useState(false);"
);

// 2. Modify dropdown
const oldDropdown = \`                            <div className="relative group shrink-0">
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
                                            onClick={() => navigate(\\\`/lab/jobs/\${j.id}\\\`)} 
                                            className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm font-mono font-bold text-slate-700 flex items-center justify-between"
                                        >
                                            <span>OS {j.osNumber || 'N/A'}</span>
                                            {j.id === job.id && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                        </button>
                                    ))}
                                </div>
                            </div>\`;

const newDropdown = \`                            <div className="relative shrink-0">
                                <button onClick={() => setIsCasesDropdownOpen(!isCasesDropdownOpen)} className="text-[9px] bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-black uppercase tracking-widest hover:bg-slate-300 transition-colors shadow-sm cursor-pointer border border-slate-300">Todos os Casos</button>
                                {isCasesDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[9998]" onClick={() => setIsCasesDropdownOpen(false)}></div>
                                        <div className="absolute left-0 top-full mt-2 bg-white shadow-2xl border border-slate-200 rounded-xl py-2 w-48 z-[9999]">
                                            <div className="px-3 pb-2 mb-1 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Histórico do Paciente
                                            </div>
                                            {jobs.filter(j => j.patientName === job.patientName)
                                                 .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                                 .map(j => (
                                                <button 
                                                    key={j.id} 
                                                    onClick={() => { setIsCasesDropdownOpen(false); navigate(\\\`/lab/jobs/\${j.id}\\\`); }} 
                                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm font-mono font-bold text-slate-700 flex items-center justify-between"
                                                >
                                                    <span>OS {j.osNumber || 'N/A'}</span>
                                                    {j.id === job.id && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>\`;

code = code.replace(oldDropdown, newDropdown);

fs.writeFileSync('pages/JobDetails.tsx', code);
console.log("Patched JobDetails.tsx");
