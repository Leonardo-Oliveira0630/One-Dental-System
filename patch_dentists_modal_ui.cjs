const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf-8');

const targetStr = `        </div>
    );
};`;

const modalUI = `
            {/* MANUAL ENTRY MODAL */}
            {showManualEntryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <Plus className="text-blue-600" />
                                Lançamento Manual
                            </h3>
                            <button onClick={() => setShowManualEntryModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddManualEntry} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tipo de Lançamento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setManualEntryType('MANUAL_DEBIT')}
                                        className={\`py-3 px-4 rounded-xl font-bold text-sm transition-all border \${
                                            manualEntryType === 'MANUAL_DEBIT' 
                                            ? 'bg-red-50 border-red-200 text-red-700' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }\`}
                                    >
                                        Débito (Dívida)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setManualEntryType('MANUAL_CREDIT')}
                                        className={\`py-3 px-4 rounded-xl font-bold text-sm transition-all border \${
                                            manualEntryType === 'MANUAL_CREDIT' 
                                            ? 'bg-green-50 border-green-200 text-green-700' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }\`}
                                    >
                                        Crédito (Abatimento)
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold mt-2">
                                    {manualEntryType === 'MANUAL_DEBIT' 
                                        ? 'Débito aumenta o saldo devedor do dentista (ex: dívida antiga).'
                                        : 'Crédito diminui o saldo devedor (ex: saldo positivo a favor do dentista).'}
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Valor (R$)</label>
                                <input 
                                    type="text" 
                                    required
                                    value={manualEntryAmount}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/\\D/g, '');
                                        if (val.length > 0) {
                                            val = (parseInt(val) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                        }
                                        setManualEntryAmount(val);
                                    }}
                                    placeholder="0,00"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Observações / Motivo (Opcional)</label>
                                <textarea 
                                    value={manualEntryNotes}
                                    onChange={(e) => setManualEntryNotes(e.target.value)}
                                    placeholder="Ex: Dívida referente ao ano passado..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={isAddingManualEntry}
                                className="w-full mt-2 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2"
                            >
                                {isAddingManualEntry ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                SALVAR LANÇAMENTO
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};`;

content = content.replace(targetStr, modalUI);
fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('Patched Dentists.tsx modal UI');
