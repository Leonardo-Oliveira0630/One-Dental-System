const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const targetStr = '<div className="flex justify-between items-center border-b border-slate-200 pb-2"><span className="text-slate-500 text-xs font-bold uppercase">OS</span><span className="font-mono font-black text-2xl text-blue-600">{scannedJob.osNumber || "N/A"}</span></div>';

const newStr = `
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 overflow-visible">
                <span className="text-slate-500 text-xs font-bold uppercase shrink-0 mr-2">OS</span>
                <div className="flex items-center gap-2 relative">
                    {jobs.filter(j => j.patientName === scannedJob.patientName).length > 1 && (
                        <div className="relative group">
                            <button className="text-[9px] bg-slate-200 text-slate-600 px-2 py-1 rounded font-black uppercase tracking-widest hover:bg-slate-300 transition-colors shadow-sm">Todos os Casos</button>
                            <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-white shadow-2xl border border-slate-200 rounded-xl py-2 w-48 z-[9999]">
                                {jobs.filter(j => j.patientName === scannedJob.patientName)
                                     .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                     .map(j => (
                                    <button 
                                        key={j.id} 
                                        onClick={() => { setScannedJob(null); navigate(\`/lab/jobs/\${j.id}\`); }} 
                                        className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm font-mono font-bold text-slate-700 flex items-center justify-between"
                                    >
                                        <span>OS {j.osNumber || 'N/A'}</span>
                                        {j.id === scannedJob.id && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <button 
                        onClick={() => { setScannedJob(null); navigate(\`/lab/jobs/\${scannedJob.id}\`); }} 
                        className="font-mono font-black text-2xl text-blue-600 hover:text-blue-800 transition-colors hover:underline cursor-pointer text-right"
                    >
                        {scannedJob.osNumber || "N/A"}
                    </button>
                </div>
            </div>
`.trim();

code = code.replace(targetStr, newStr);

fs.writeFileSync('components/Scanner.tsx', code);
console.log("Patched Scanner.tsx");
