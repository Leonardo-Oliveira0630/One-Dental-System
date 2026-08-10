const fs = require('fs');
let code = fs.readFileSync('pages/admin/DentistsTab.tsx', 'utf-8');

const modalCode = `
        {/* MODAL: SUB-DENTISTA */}
        {isAddingSubDentist && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-auto animate-in zoom-in duration-200">
                  <div className="px-4 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                      <h3 className="text-lg font-black flex items-center gap-2 text-slate-800"><Stethoscope className="text-blue-600" /> {editingSubDentistIndex !== null ? 'Editar Dentista' : 'Novo Dentista'}</h3>
                      <button onClick={() => { setIsAddingSubDentist(false); setEditingSubDentistIndex(null); }} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                      <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome Completo *</label>
                          <input required name="name" value={subDentistFormData.name} onChange={handleSubDentistInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CRO</label>
                              <input name="cro" value={subDentistFormData.cro} onChange={handleSubDentistInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CPF</label>
                              <input name="cpfCnpj" value={subDentistFormData.cpfCnpj} onChange={handleSubDentistInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">E-mail</label>
                              <input type="email" name="email" value={subDentistFormData.email} onChange={handleSubDentistInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Telefone</label>
                              <input name="phone" value={subDentistFormData.phone} onChange={handleSubDentistInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                      <button onClick={() => { setIsAddingSubDentist(false); setEditingSubDentistIndex(null); }} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                      <button onClick={handleSaveSubDentist} className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
                          <Save size={18} /> Salvar Dentista
                      </button>
                  </div>
              </div>
          </div>
        )}
    </div>
  );
};
`

// Replace the very end of the file
code = code.replace(
  '        )}\n    </div>\n  );\n};',
  modalCode
);

fs.writeFileSync('pages/admin/DentistsTab.tsx', code);
console.log('Fixed DentistsTab');
