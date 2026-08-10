const fs = require('fs');
let content = fs.readFileSync('pages/NewJob.tsx', 'utf8');

// Add state
const statePattern = "const [dentistSearchQuery, setDentistSearchQuery] = useState((location.state?.dentistName || '').toUpperCase());";
content = content.replace(
    statePattern,
    statePattern + "\n  const [subDentistName, setSubDentistName] = useState('');"
);

// We should reset subDentistName when selecting a new dentist
const selectDentistPattern = "setDentistSearchQuery(dentist.name);";
content = content.replace(
    selectDentistPattern,
    selectDentistPattern + "\n    setSubDentistName('');"
);

// We need to inject the subDentist dropdown in the UI.
// It's after:
// <div className="md:col-span-12 relative" ref={dropdownRef}> ... </div>

const targetUI = `                             </div>
                          </div>
                      )}
                    </div>`;

const replacementUI = `                             </div>
                          </div>
                      )}
                    </div>
                    {selectedDentistObj?.subDentists && selectedDentistObj.subDentists.length > 0 && (
                        <div className="md:col-span-12">
                            <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">
                                Dentista Solicitante <span className="text-slate-400 font-medium normal-case ml-1">(Opcional)</span>
                            </label>
                            <select
                                value={subDentistName}
                                onChange={e => setSubDentistName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                            >
                                <option value="">(Nenhum)</option>
                                {selectedDentistObj.subDentists.map((sd: any) => (
                                    <option key={sd.id} value={sd.name}>{sd.name}</option>
                                ))}
                            </select>
                        </div>
                    )}`;

content = content.replace(targetUI, replacementUI);

// Now, we need to add subDentistName to the payload when saving.
// There are multiple places where Job is created.
content = content.replace(/dentistName: dentistName\.trim\(\)\.toUpperCase\(\),/g, "dentistName: dentistName.trim().toUpperCase(),\n                subDentistName: subDentistName.trim() || undefined,");

fs.writeFileSync('pages/NewJob.tsx', content);
console.log('patched NewJob.tsx');
