const fs = require('fs');
let code = fs.readFileSync('pages/Reports.tsx', 'utf-8');

const regex = /<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-slate-500 uppercase">Dentista<\/label>[\s\S]*?<div className="space-y-1\.5">\s*<label className="text-xs font-bold text-slate-500 uppercase">Tipo de Relatório<\/label>/;

const newSection = `{reportType !== 'CLIENTS' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Dentista</label>
                <select value={dentistId} onChange={(e) => setDentistId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Todos os Dentistas</option>
                  {manualDentists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Colaborador</label>
                <select value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Todos os Colaboradores</option>
                  {allUsers.filter(u => u.role !== 'CLIENT' && u.organizationId === (activeOrganization?.id || currentUser?.organizationId)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Setor</label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Todos os Setores</option>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Trabalho</label>
                <select value={jobTypeId} onChange={(e) => { setJobTypeId(e.target.value); setVariationFilters({}); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Todos os Tipos</option>
                  {jobTypes.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
                </select>
              </div>

              {selectedJobType && selectedJobType.variationGroups && selectedJobType.variationGroups.map(group => (
                <div key={group.id} className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-slate-500 uppercase">{group.name}</label>
                  <select 
                    value={variationFilters[group.id] || ''} 
                    onChange={(e) => setVariationFilters(prev => ({...prev, [group.id]: e.target.value}))} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Qualquer</option>
                    {group.options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                  </select>
                </div>
              ))}
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Relatório</label>`;

if (regex.test(code)) {
    code = code.replace(regex, newSection);
    fs.writeFileSync('pages/Reports.tsx', code);
    console.log('Replaced filters block');
} else {
    console.log('Could not find filters block');
}
