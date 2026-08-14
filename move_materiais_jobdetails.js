import fs from 'fs';

let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const observacoesBlock = `                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observações Técnicas</label>
                          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" placeholder="Novas instruções..."></textarea>
                      </div>`;

const endOfMateriais = `                          </div>
                      </div>
                  )}`;

const startIdx = code.indexOf(observacoesBlock);
const materiaisStartIdx = code.indexOf('                  {/* Materiais Recebidos */}');

if (startIdx !== -1 && materiaisStartIdx !== -1) {
    const endIdx = code.indexOf(endOfMateriais, materiaisStartIdx) + endOfMateriais.length;
    const materiaisBlock = code.substring(materiaisStartIdx, endIdx);
    
    // Create new replaced text
    // Replace the entire area (from startIdx to endIdx) with materiaisBlock then observacoesBlock
    const originalText = code.substring(startIdx, endIdx);
    
    // Add margin top to Observacoes for spacing since it's now after Materiais
    const modifiedObservacoes = `                      <div className="pt-6">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Observações Técnicas</label>
                          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium" placeholder="Novas instruções..."></textarea>
                      </div>`;
                      
    const modifiedMateriais = materiaisBlock.replace('className="pt-6 border-t border-slate-100"', 'className="pt-4 mt-4 border-t border-slate-100"');
    
    const newText = modifiedMateriais + '\n\n' + modifiedObservacoes;
    
    code = code.replace(originalText, newText);
    fs.writeFileSync('pages/JobDetails.tsx', code);
    console.log("Success moving in JobDetails");
} else {
    console.log("Could not find blocks");
}
