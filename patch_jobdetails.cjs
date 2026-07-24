const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const target = `<button onClick={() => triggerPrint(job, 'SHEET')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> A4</button>`;
const replacement = `<button onClick={() => triggerPrint(job, 'SHEET')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> Ficha Interna</button>
                      <button onClick={() => triggerPrint(job, 'INVOICE_SHEET')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-bold flex items-center gap-1.5 text-[9px] uppercase tracking-widest shadow-sm"><Printer size={12} /> Ficha de Entrega</button>`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/JobDetails.tsx', code);
    console.log("Patched JobDetails.tsx");
} else {
    console.log("Could not find target in JobDetails.tsx");
}
