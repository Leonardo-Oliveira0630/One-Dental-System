const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

// Add state
const statePattern = "const [editDentistName, setEditDentistName] = useState('');";
content = content.replace(
    statePattern,
    statePattern + "\n  const [editSubDentistName, setEditSubDentistName] = useState('');"
);

// Add to useEffect
const effectPattern = "setEditDentistName(job.dentistName || '');";
content = content.replace(
    effectPattern,
    effectPattern + "\n        setEditSubDentistName(job.subDentistName || '');"
);

// Reset when selecting a new dentist
const selectDentistPattern = "setDentistSearchQuery(dentist.name.toUpperCase());";
content = content.replace(
    selectDentistPattern,
    selectDentistPattern + "\n    setEditSubDentistName('');"
);

// Add to save object
const savePattern = "dentistName: editDentistName,";
content = content.replace(
    savePattern,
    savePattern + "\n            subDentistName: editSubDentistName || undefined,"
);

// Now the UI for editing it
const uiPattern = `                          </div>
                          {showDentistSuggestions && dentistSearchQuery.length > 0 && (
                              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                 <div className="max-h-60 overflow-y-auto">
                                    {suggestions.map(d => (
                                        <button key={d.id} type="button" onClick={() => selectDentist(d)} className="w-full text-left p-3 hover:bg-blue-50 flex items-center justify-between border-b border-slate-50 last:border-0">
                                            <div className="flex items-center gap-2"><div className={\`p-1.5 rounded-lg \${d.type === 'ONLINE' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}\`}><Stethoscope size={14} /></div><p className="font-bold text-slate-800 text-sm">{d.name}</p></div>
                                            <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded \${d.type === 'ONLINE' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}\`}>{d.type === 'ONLINE' ? 'WEB' : 'INTERNO'}</span>
                                        </button>
                                    ))}
                                    <button type="button" onClick={handleManualDentistEntry} className="w-full text-left p-3 bg-slate-50 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 border-t"><div className="p-1.5 rounded-lg bg-white shadow-sm"><Plus size={14} className="text-blue-600" /></div><p className="text-[10px] font-bold uppercase tracking-wider">Usar Nome Avulso: "{dentistSearchQuery}"</p></button>
                                 </div>
                              </div>
                          )}
                        </div>
                    </div>`;

const replaceUi = `                          </div>
                          {showDentistSuggestions && dentistSearchQuery.length > 0 && (
                              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                 <div className="max-h-60 overflow-y-auto">
                                    {suggestions.map(d => (
                                        <button key={d.id} type="button" onClick={() => selectDentist(d)} className="w-full text-left p-3 hover:bg-blue-50 flex items-center justify-between border-b border-slate-50 last:border-0">
                                            <div className="flex items-center gap-2"><div className={\`p-1.5 rounded-lg \${d.type === 'ONLINE' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}\`}><Stethoscope size={14} /></div><p className="font-bold text-slate-800 text-sm">{d.name}</p></div>
                                            <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded \${d.type === 'ONLINE' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}\`}>{d.type === 'ONLINE' ? 'WEB' : 'INTERNO'}</span>
                                        </button>
                                    ))}
                                    <button type="button" onClick={handleManualDentistEntry} className="w-full text-left p-3 bg-slate-50 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 border-t"><div className="p-1.5 rounded-lg bg-white shadow-sm"><Plus size={14} className="text-blue-600" /></div><p className="text-[10px] font-bold uppercase tracking-wider">Usar Nome Avulso: "{dentistSearchQuery}"</p></button>
                                 </div>
                              </div>
                          )}
                        </div>
                    </div>
                    {selectedDentistObj?.subDentists && selectedDentistObj.subDentists.length > 0 && (
                        <div className="md:col-span-12">
                            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">
                                Dentista Solicitante <span className="text-slate-400 font-medium normal-case ml-1">(Opcional)</span>
                            </label>
                            <select
                                value={editSubDentistName}
                                onChange={e => setEditSubDentistName(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                            >
                                <option value="">(Nenhum)</option>
                                {selectedDentistObj.subDentists.map((sd: any) => (
                                    <option key={sd.id} value={sd.name}>{sd.name}</option>
                                ))}
                            </select>
                        </div>
                    )}`;

content = content.replace(uiPattern, replaceUi);

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched Edit Job Details');
