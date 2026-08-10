const fs = require('fs');
let content = fs.readFileSync('pages/admin/DentistsTab.tsx', 'utf8');

const target = `                      <button disabled={editingDentistId ? !canEdit : !canCreate} type="submit"`;
const subDentistSection = `
                      {/* SUB-DENTISTS SECTION */}
                      {formData.clientType === 'CLINICA' && (
                          <div className="pt-4 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">5. Dentistas Associados (Sub-contas)</h4>
                                  <button type="button" onClick={() => {
                                      setSubDentistFormData(defaultSubDentist);
                                      setEditingSubDentistIndex(null);
                                      setIsAddingSubDentist(true);
                                  }} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-200">
                                      <Plus size={14} /> Adicionar Dentista
                                  </button>
                              </div>
                              
                              {(!formData.subDentists || formData.subDentists.length === 0) ? (
                                  <div className="bg-slate-50 p-4 rounded-xl text-center text-slate-400 text-xs italic font-medium border border-slate-200">
                                      Nenhum dentista associado a esta clínica.
                                  </div>
                              ) : (
                                  <div className="space-y-2">
                                      {formData.subDentists.map((sd: any, idx: number) => (
                                          <div key={sd.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                              <div>
                                                  <p className="font-bold text-slate-800 text-sm">{sd.name}</p>
                                                  <p className="text-xs text-slate-500">{sd.cro ? \`CRO: \${sd.cro}\` : 'Sem CRO'} | {sd.cpfCnpj || 'Sem Documento'}</p>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <button type="button" onClick={() => {
                                                      setSubDentistFormData(sd);
                                                      setEditingSubDentistIndex(idx);
                                                      setIsAddingSubDentist(true);
                                                  }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                                      <Edit size={16} />
                                                  </button>
                                                  <button type="button" onClick={() => {
                                                      setFormData(prev => {
                                                          const subs = [...(prev.subDentists || [])];
                                                          subs.splice(idx, 1);
                                                          return { ...prev, subDentists: subs };
                                                      });
                                                  }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                      <Trash2 size={16} />
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}
                      
                      <button disabled={editingDentistId ? !canEdit : !canCreate} type="submit"`;

content = content.replace(target, subDentistSection);

// NOW add the SubDentist modal logic at the very end of the component, just before `</div>` at the bottom of DentistsTab.tsx.
// We can actually just put it after `{isAddingDentist && ... }` ends.
const endTarget = `        )}

        {/* AI IMPORT MODAL */}`;

const subModal = `        )}

        {/* SUB-DENTIST MODAL */}
        {isAddingSubDentist && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
                    <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                        <h3 className="text-xl font-black flex items-center gap-2 text-slate-800"><Stethoscope className="text-blue-600" /> {editingSubDentistIndex !== null ? 'Editar Dentista Associado' : 'Novo Dentista Associado'}</h3>
                        <button onClick={() => setIsAddingSubDentist(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                    </div>
                    <div className="p-4 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                        {/* 1. Identificação */}
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">1. Identificação e Contato</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome Completo *</label>
                            <input name="name" required value={subDentistFormData.name} onChange={handleSubDentistInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">E-mail</label>
                            <input name="email" type="email" value={subDentistFormData.email} onChange={handleSubDentistInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">WhatsApp / Telefone</label>
                            <input name="phone" value={subDentistFormData.phone} onChange={handleSubDentistInputChange} placeholder="(11) 99999-9999" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>

                        {/* 2. Documentação */}
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1 mt-6">2. Documentação e Registro</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CPF ou CNPJ</label>
                                <input name="cpfCnpj" value={subDentistFormData.cpfCnpj} onChange={handleSubDentistInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CRO (Opcional)</label>
                                <input name="cro" value={subDentistFormData.cro} onChange={handleSubDentistInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                            </div>
                        </div>
                        
                        {/* 3. Logística */}
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-6">3. Localização e Logística</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CEP</label>
                                <input name="cep" value={subDentistFormData.cep} onChange={handleSubDentistInputChange} placeholder="00000-000" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Endereço</label>
                                <input name="address" value={subDentistFormData.address} onChange={handleSubDentistInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Número</label>
                                <input name="number" value={subDentistFormData.number} onChange={handleSubDentistInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Complemento</label>
                                <input name="complement" value={subDentistFormData.complement} onChange={handleSubDentistInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Bairro</label>
                                <input name="neighborhood" value={subDentistFormData.neighborhood} onChange={handleSubDentistInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Cidade</label>
                                <input name="city" value={subDentistFormData.city} onChange={handleSubDentistInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Estado (UF)</label>
                                <input name="state" value={subDentistFormData.state} onChange={handleSubDentistInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 uppercase" maxLength={2} />
                            </div>
                        </div>

                    </div>
                    <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50">
                        <button type="button" onClick={handleSaveSubDentist} className="w-full py-4 font-black rounded-2xl shadow-xl transition-all transform active:scale-95 bg-blue-600 text-white hover:bg-blue-700">SALVAR DENTISTA ASSOCIADO</button>
                    </div>
                </div>
            </div>
        )}

        {/* AI IMPORT MODAL */}`;

content = content.replace(endTarget, subModal);

fs.writeFileSync('pages/admin/DentistsTab.tsx', content);
console.log('patched nested modal UI');
