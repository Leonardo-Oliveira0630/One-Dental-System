const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = `<span className="text-[10px] leading-tight">{new Date(printData.job.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(printData.job.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-[11px] font-bold leading-tight mt-0.5">{new Date(printData.job.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                        <span className="text-[11px] leading-tight mt-0.5 font-bold">{printData.job.osNumber || printData.job.id.substring(0,8)}</span>`;

const replacement = `<span className="text-[11px] leading-tight font-bold mb-0.5">{printData.job.osNumber || printData.job.id.substring(0,8)}</span>
                        <span className="text-[10px] leading-tight">{new Date(printData.job.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(printData.job.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-[11px] font-bold leading-tight mt-0.5">{new Date(printData.job.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/PrintOverlay.tsx', code);
    console.log("Patched PrintOverlay.tsx to match image OS order");
} else {
    console.log("Could not find the target text.");
}
