const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const boxNumberInput = `<div className="md:col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nº Caixa</label>
                              <input type="text" value={editBoxNumber} onChange={e => setEditBoxNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>`;
const replacementBox = `{!job.isBudget && (<div className="md:col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Nº Caixa</label>
                              <input type="text" value={editBoxNumber} onChange={e => setEditBoxNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>)}`;
content = content.replace(boxNumberInput, replacementBox);

const dueDateInput = `                          <div className="md:col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Previsão</label>
                              <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div className="md:col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Hora Previsão</label>
                              <input type="time" value={editDueTime} onChange={e => setEditDueTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>`;
const replacementDue = `                          {!job.isBudget && (<>
                          <div className="md:col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Previsão</label>
                              <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          <div className="md:col-span-1">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Hora Previsão</label>
                              <input type="time" value={editDueTime} onChange={e => setEditDueTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                          </div>
                          </>)}`;
content = content.replace(dueDateInput, replacementDue);

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched JobDetails edit');
