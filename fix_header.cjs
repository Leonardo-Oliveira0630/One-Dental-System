const fs = require('fs');

const path = 'pages/lab/Dentists.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldHeader = `<div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{t('dentists.priceTableModalTitle', 'Tabela de Preços:')} {selectedClient.name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase">{t('dentists.priceTableModalSubtitle', 'Personalize os descontos para este cliente')}</p>
                            </div>
                            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                        </div>`;

const newHeader = `<div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-start gap-4 bg-slate-50 rounded-t-3xl">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-black text-slate-800 truncate" title={\`\${t('dentists.priceTableModalTitle', 'Tabela de Preços:')} \${selectedClient.name}\`}>{t('dentists.priceTableModalTitle', 'Tabela de Preços:')} {selectedClient.name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase truncate" title={t('dentists.priceTableModalSubtitle', 'Personalize os descontos para este cliente')}>{t('dentists.priceTableModalSubtitle', 'Personalize os descontos para este cliente')}</p>
                            </div>
                            <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors shrink-0"><X size={24}/></button>
                        </div>`;

if (content.includes(oldHeader)) {
    content = content.replace(oldHeader, newHeader);
    fs.writeFileSync(path, content);
    console.log('Fixed header');
} else {
    console.log('Could not find header');
}
