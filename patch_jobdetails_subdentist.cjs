const fs = require('fs');
let content = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const targetHeader = `<div className="flex items-center gap-2 text-slate-500 mt-1 font-bold text-xs uppercase truncate"><User size={14} className="text-blue-500 shrink-0" /> Dr(a). {job.dentistName}</div>`;
const replacementHeader = `<div className="flex flex-wrap items-center gap-2 text-slate-500 mt-1 font-bold text-xs uppercase">
                    <span className="flex items-center gap-1 truncate"><User size={14} className="text-blue-500 shrink-0" /> {job.dentistName}</span>
                    {job.subDentistName && (
                        <span className="flex items-center gap-1 border-l border-slate-300 pl-2 truncate"><Stethoscope size={14} className="text-indigo-500 shrink-0" /> Dr(a). {job.subDentistName}</span>
                    )}
                </div>`;

content = content.replace(targetHeader, replacementHeader);

fs.writeFileSync('pages/JobDetails.tsx', content);
console.log('patched JobDetails header');
