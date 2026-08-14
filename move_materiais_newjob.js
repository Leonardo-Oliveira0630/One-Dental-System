import fs from 'fs';

let code = fs.readFileSync('pages/NewJob.tsx', 'utf8');

const materiaisBlock = `
                {/* Materiais Enviados */}
                <div className="bg-white p-4 md:p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Box size={14} className="text-slate-400" /> Materiais Enviados pelo Dentista
                        </label>
                        <button 
                            type="button" 
                            onClick={() => setIsAddingMaterial(!isAddingMaterial)}
                            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase"
                        >
                            {isAddingMaterial ? <X size={14} /> : <Plus size={14} />} 
                            {isAddingMaterial ? 'Cancelar' : 'Novo Material'}
                        </button>
                    </div>

                    {isAddingMaterial && (
                        <div className="mb-4 flex gap-2 animate-in fade-in slide-in-from-top-2">
                            <input 
                                type="text"
                                value={newMaterialName}
                                onChange={e => setNewMaterialName(e.target.value)}
                                placeholder="Nome do material (ex: Molde de Gesso)"
                                className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddMaterial();
                                    }
                                }}
                            />
                            <button 
                                type="button"
                                onClick={handleAddMaterial}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black hover:bg-indigo-700"
                            >
                                Adicionar
                            </button>
                        </div>
                    )}

                    {(currentOrg?.receivedMaterialOptions && currentOrg.receivedMaterialOptions.length > 0) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {currentOrg.receivedMaterialOptions.map(mat => {
                                const isChecked = receivedMaterials.includes(mat);
                                return (
                                    <label key={mat} className={\`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all \${isChecked ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'}\`}>
                                        <div className={\`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all \${isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}\`}>
                                            {isChecked && <Check size={14} className="text-white" />}
                                        </div>
                                        <span className="text-xs font-bold">{mat}</span>
                                        <input 
                                            type="checkbox"
                                            className="hidden"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setReceivedMaterials(prev => [...prev, mat]);
                                                } else {
                                                    setReceivedMaterials(prev => prev.filter(m => m !== mat));
                                                }
                                            }}
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs font-medium text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">Nenhum material cadastrado. Clique em "Novo Material" para adicionar opções.</p>
                    )}
                </div>
`;

// Extract original block
const startIdx = code.indexOf('                {/* Materiais Enviados */}');
const endMarker = '                <div className="pt-6 border-t border-slate-100">\n                    <div className="flex justify-between items-center mb-4">\n                        <span className="text-[10px] font-black text-slate-400 uppercase">Total do Caso</span>';
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    // Remove original block
    code = code.substring(0, startIdx) + code.substring(endIdx);
    
    // Insert new block before end of left column (right after Venda de Implantes)
    const splitPoint = '                    )}\n                </div>\n            </div>\n                        \n            <div className="lg:col-span-4 space-y-4 md:space-y-6">';
    
    if (code.includes(splitPoint)) {
        code = code.replace(splitPoint, '                    )}\n                </div>\n' + materiaisBlock + '\n            </div>\n                        \n            <div className="lg:col-span-4 space-y-4 md:space-y-6">');
        fs.writeFileSync('pages/NewJob.tsx', code);
        console.log("Success moving in NewJob");
    } else {
        console.log("Could not find insertion point");
    }
} else {
    console.log("Could not find start or end block");
}
