const fs = require('fs');

let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

const target = `                                        <option value="LABORATORIO">Laboratório</option>
                                    </select>
                                </div>`;

const replacement = `                                        <option value="LABORATORIO">Laboratório</option>
                                    </select>
                                </div>
                                
                                {clientType === 'CLINICA' && (
                                    <div className="space-y-3 col-span-1 md:col-span-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Dentistas Associados (Sub-contas)</label>
                                            <button 
                                                onClick={() => setSubDentists([...subDentists, { id: Math.random().toString(36).substring(2, 9), name: '', cro: '' }])}
                                                className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200 flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Adicionar Dentista
                                            </button>
                                        </div>
                                        {subDentists.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic px-1">Nenhum dentista cadastrado para esta clínica.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {subDentists.map((sd, idx) => (
                                                    <div key={sd.id || idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Nome do Dentista" 
                                                            value={sd.name}
                                                            onChange={e => {
                                                                const newArr = [...subDentists];
                                                                newArr[idx].name = e.target.value;
                                                                setSubDentists(newArr);
                                                            }}
                                                            className="flex-1 px-3 py-1.5 text-sm rounded bg-white border border-slate-200"
                                                        />
                                                        <input 
                                                            type="text" 
                                                            placeholder="CRO (opcional)" 
                                                            value={sd.cro || ''}
                                                            onChange={e => {
                                                                const newArr = [...subDentists];
                                                                newArr[idx].cro = e.target.value;
                                                                setSubDentists(newArr);
                                                            }}
                                                            className="w-32 px-3 py-1.5 text-sm rounded bg-white border border-slate-200"
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                const newArr = [...subDentists];
                                                                newArr.splice(idx, 1);
                                                                setSubDentists(newArr);
                                                            }}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                        >
                                                            <MinusCircle size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}`;

content = content.replace(target, replacement);
fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('patched dentistas ui');
