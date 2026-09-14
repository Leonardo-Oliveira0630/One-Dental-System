const fs = require('fs');
const path = 'pages/lab/Dentists.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldFooter = `<div className="p-4 sm:p-6 border-t bg-slate-50 rounded-b-3xl flex justify-end gap-3">
                            <button onClick={() => setSelectedClient(null)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">{t('common.cancel', 'Cancelar')}</button>
                            <button 
                                onClick={handleSavePricing}
                                disabled={isSaving}
                                className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                {t('dentists.saveTable', 'SALVAR TABELA')}
                            </button>
                        </div>`;

const newFooter = `<div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex flex-col-reverse sm:flex-row justify-end items-center gap-3 shrink-0">
                            <button onClick={() => setSelectedClient(null)} className="w-full sm:w-auto px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">{t('common.cancel', 'Cancelar')}</button>
                            <button 
                                onClick={handleSavePricing}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                {t('dentists.saveTable', 'SALVAR TABELA')}
                            </button>
                        </div>`;

if (content.includes(oldFooter)) {
    content = content.replace(oldFooter, newFooter);
    fs.writeFileSync(path, content);
    console.log('Fixed footer');
} else {
    console.log('Could not find footer');
}
