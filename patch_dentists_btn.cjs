const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf-8');

const targetStr = `<button 
                                            onClick={generateStatementPDF}
                                            className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                                        >
                                            <Download size={16} /> Exportar PDF
                                        </button>`;
const replacement = `<div className="flex gap-2">
                                            <button 
                                                onClick={() => setShowManualEntryModal(true)}
                                                className="px-4 py-3 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
                                            >
                                                <Plus size={16} /> Lançamento Manual
                                            </button>
                                            <button 
                                                onClick={generateStatementPDF}
                                                className="px-4 py-3 bg-slate-900 text-white text-[10px] font-black uppercase rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                                            >
                                                <Download size={16} /> PDF
                                            </button>
                                        </div>`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('Patched Dentists.tsx button');
