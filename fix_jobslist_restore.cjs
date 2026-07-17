const fs = require('fs');

const restoredCode = `
                    {filteredJobs.length > visibleCount && (
                        <tr>
                            <td colSpan={8} className="p-4 text-center">
                                <button 
                                    onClick={() => setVisibleCount(prev => prev + 20)}
                                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                                >
                                    Carregar mais trabalhos
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* VIEW PARA MOBILE (CARDS) */}

      <div className="md:hidden space-y-4">
        {filteredJobs.length === 0 ? (
            <div className="py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed">Nenhum pedido encontrado.</div>
        ) : (
            filteredJobs.slice(0, visibleCount).map(job => (
                <JobCard 
                    key={job.id}
                    job={job}
                    navigate={navigate}
                    getStatusColor={getStatusColor}
                    getTranslatedStatus={getTranslatedStatus}
                    getSectorTimeInfo={getSectorTimeInfo}
                    isClient={isClient}
                    revealJobStatus={revealJobStatus}
                />
            ))
        )}

        {filteredJobs.length > visibleCount && (
            <div className="p-4 flex justify-center">
                <button 
                    onClick={() => setVisibleCount(prev => prev + 20)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                    Carregar mais trabalhos
                </button>
            </div>
        )}
      </div>

      {/* ROUTE MODAL */}

      {routeModalJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Truck className="text-indigo-600" /> Escalar p/ Entrega</h3>
                      <button onClick={() => setRouteModalJob(null)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data da Rota</label>
                          <input type="date" value={routeDate} onChange={e => setRouteDate(e.target.value)} className="w-full px-4 py-2 border rounded-xl" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Turno</label>
                          <select value={routeShift} onChange={e => setRouteShift(e.target.value as any)} className="w-full px-4 py-2 border rounded-xl font-bold text-slate-800 bg-slate-50">
                              <option value="MORNING">Manhã</option>
                              <option value="AFTERNOON">Tarde</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motoboy</label>
                          {couriers.filter(c => c.active).length > 0 ? (
                              <div className="space-y-2">
                                  <select value={routeDriver} onChange={e => setRouteDriver(e.target.value)} className="w-full px-4 py-2 border rounded-xl font-bold text-slate-800 bg-slate-50">
                                      <option value="">Selecione um motoboy...</option>
                                      {couriers.filter(c => c.active).map(c => (
                                          <option key={c.id} value={c.name}>{c.name} {c.vehicleType ? \`(\${c.vehicleType})\` : ''}</option>
                                      ))}
                                      <option value="MANUAL">Outro (Digitar nome)</option>
                                  </select>
                                  {(!couriers.filter(c => c.active).map(c => c.name).includes(routeDriver) || routeDriver === 'MANUAL') && (
                                      <input 
                                          placeholder="Digite o nome do Motoboy" 
                                          value={routeDriver === 'MANUAL' ? '' : routeDriver} 
                                          onChange={e => setRouteDriver(e.target.value)} 
                                          className="w-full px-4 py-2 border rounded-xl font-bold text-slate-800" 
                                      />
                                  )}
                              </div>
                          ) : (
                              <input placeholder="Nome do Motoboy" value={routeDriver} onChange={e => setRouteDriver(e.target.value)} className="w-full px-4 py-2 border rounded-xl font-bold text-slate-800" />
                          )}
                      </div>
                      <button onClick={handleAddToRoute} disabled={isProcessing} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                          {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={20} /> CONFIRMAR NA ROTA</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
    </div>
  );
}`;

let code = fs.readFileSync('pages/JobsList.tsx', 'utf8');

// The code currently has:
//                     {filteredJobs.length > visibleCount && (
//                         <tr>
//                             <td colSpan={8} className="p-4 text-center">
// ...
//                     )}` : ''}</option>

// So we can replace from {filteredJobs.length > visibleCount && ( 
// to the end of the file, with our restoredCode.

const startIdx = code.indexOf('{filteredJobs.length > visibleCount && (');
if (startIdx > -1) {
    code = code.substring(0, startIdx) + restoredCode;
}

fs.writeFileSync('pages/JobsList.tsx', code);
console.log('Restored');
