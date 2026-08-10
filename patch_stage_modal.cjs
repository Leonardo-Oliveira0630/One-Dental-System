const fs = require('fs');
const content = fs.readFileSync('pages/JobDetails.tsx', 'utf-8');

const modalCode = `
      {/* MODAL STAGE CONFIG */}
      {stageConfigItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl shrink-0">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                              <Settings className="text-slate-400" />
                              Etapas do Serviço
                          </h3>
                          <p className="text-xs text-slate-500 font-bold uppercase mt-1 tracking-widest">{stageConfigItem.name}</p>
                      </div>
                      <button onClick={() => setStageConfigItem(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                      {sectors.map(sector => (
                          <div key={sector.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                              <button
                                  className="w-full bg-slate-50 hover:bg-slate-100 p-4 flex justify-between items-center transition-colors"
                                  onClick={() => setExpandedStageSectors(prev => ({ ...prev, [sector.name]: !prev[sector.name] }))}
                              >
                                  <span className="font-black text-slate-700 text-sm">{sector.name}</span>
                                  <ChevronDown size={18} className={\`text-slate-400 transition-transform \${expandedStageSectors[sector.name] ? 'rotate-180' : ''}\`} />
                              </button>
                              
                              {expandedStageSectors[sector.name] && (
                                  <div className="p-4 bg-white border-t border-slate-100 space-y-2">
                                      {(!sector.stages || sector.stages.length === 0) ? (
                                          <p className="text-xs text-slate-400 font-bold text-center py-2">Nenhuma etapa cadastrada neste setor.</p>
                                      ) : (
                                          sector.stages.map((stage, idx) => {
                                              const isChecked = tempItemStages[sector.name]?.includes(stage) || false;
                                              return (
                                                  <label key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                                                      <input
                                                          type="checkbox"
                                                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                                          checked={isChecked}
                                                          onChange={(e) => {
                                                              const current = tempItemStages[sector.name] || [];
                                                              let next;
                                                              if (e.target.checked) {
                                                                  next = [...current, stage];
                                                              } else {
                                                                  next = current.filter(s => s !== stage);
                                                              }
                                                              setTempItemStages(prev => ({ ...prev, [sector.name]: next }));
                                                          }}
                                                      />
                                                      <span className="text-sm font-bold text-slate-600">{stage}</span>
                                                  </label>
                                              );
                                          })
                                      )}
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>

                  <div className="p-6 border-t bg-slate-50 rounded-b-3xl flex justify-end gap-3 shrink-0">
                      <button onClick={() => setStageConfigItem(null)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                      <button 
                          onClick={handleSaveStageConfig}
                          disabled={isUpdatingStatus}
                          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all"
                      >
                          {isUpdatingStatus ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                          SALVAR ETAPAS
                      </button>
                  </div>
              </div>
          </div>
      )}
`;

const replaced = content.replace('{/* MODAL EXECUTION EDIT */}', modalCode + '\n      {/* MODAL EXECUTION EDIT */}');

if (replaced !== content) {
    fs.writeFileSync('pages/JobDetails.tsx', replaced);
    console.log('Successfully patched modal');
} else {
    console.log('Failed to find replacement point');
}
