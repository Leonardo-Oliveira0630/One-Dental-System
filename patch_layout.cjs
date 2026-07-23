const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = `              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="border border-gray-300 p-2 rounded">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Dentista / Clínica</p>
                    <p className="text-base font-bold leading-tight truncate">{printData.job.dentistName}</p>
                </div>
                <div className="border border-gray-300 p-2 rounded relative">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Paciente</p>
                    <p className="text-base font-bold leading-tight truncate">{printData.job.patientName}</p>
                    {printData.job.items.some(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT') && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded-sm">
                            {printData.job.items.find(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT')?.nature === 'REPETITION' ? 'REPETIÇÃO' : 'AJUSTE'}
                        </div>
                    )}
                </div>
              </div>
              
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-gray-100 p-2 rounded"><p className="text-[10px] font-bold text-gray-500">Data Entrada</p><p className="font-mono text-sm">{new Date(printData.job.createdAt).toLocaleDateString()}</p></div>
                 <div className="flex-1 bg-gray-100 p-2 rounded border-2 border-black"><p className="text-[10px] font-bold text-gray-500">Data Saída (Prevista)</p><p className="font-mono text-sm font-bold">{new Date(printData.job.dueDate).toLocaleDateString()}</p></div>
                <div className="flex-1 bg-gray-100 p-2 rounded"><p className="text-[10px] font-bold text-gray-500">Prioridade</p><p className="font-bold text-sm uppercase">{printData.job.urgency}</p></div>
                <div className="flex-1 bg-gray-100 p-2 rounded"><p className="text-[10px] font-bold text-gray-500">Caixa</p><p className="font-bold text-sm">{printData.job.boxNumber || '-'}</p></div>
              </div>`;

const replacement = `              <div className="flex gap-3 mb-3">
                {/* Left column */}
                <div className="flex flex-col gap-2 flex-1">
                    <div className="border border-gray-300 p-2 rounded flex justify-between items-start">
                        <div className="overflow-hidden">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Dentista / Clínica</p>
                            <p className="text-base font-bold leading-tight truncate mt-1">{printData.job.dentistName}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Cidade/UF</p>
                            <p className="text-xs font-bold leading-tight mt-1 text-gray-700">{dentistCityState || '-'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="border border-gray-300 p-2 rounded relative flex-1">
                            <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Paciente</p>
                            <p className="text-base font-bold leading-tight truncate mt-1">{printData.job.patientName}</p>
                            {printData.job.items.some(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT') && (
                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase rounded-sm">
                                    {printData.job.items.find(i => i.nature === 'REPETITION' || i.nature === 'ADJUSTMENT')?.nature === 'REPETITION' ? 'REPETIÇÃO' : 'AJUSTE'}
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-100 p-2 rounded w-24 shrink-0 flex flex-col justify-center items-center">
                            <p className="text-[10px] font-bold text-gray-500 leading-none mb-1">Caixa</p>
                            <p className="font-bold text-lg leading-none">{printData.job.boxNumber || '-'}</p>
                        </div>
                        <div className="bg-gray-100 p-2 rounded w-24 shrink-0 flex flex-col justify-center items-center">
                            <p className="text-[10px] font-bold text-gray-500 leading-none mb-1">Prioridade</p>
                            <p className="font-bold text-xs uppercase leading-none">{printData.job.urgency}</p>
                        </div>
                    </div>
                </div>
                
                {/* Right column */}
                <div className="flex flex-col gap-2 w-32 shrink-0">
                    <div className="bg-gray-100 p-2 rounded flex-1 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-bold text-gray-500 leading-tight">Data Entrada</p>
                        <p className="font-mono text-sm leading-tight mt-0.5">{new Date(printData.job.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-gray-100 p-2 rounded border-2 border-black flex-1 flex flex-col justify-center items-center">
                        <p className="text-[10px] font-bold text-gray-500 leading-tight">Data Saída (Prevista)</p>
                        <p className="font-mono text-sm font-bold leading-tight mt-0.5">{new Date(printData.job.dueDate).toLocaleDateString()}</p>
                    </div>
                </div>
              </div>`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/PrintOverlay.tsx', code);
    console.log("Patched layout");
} else {
    console.log("Could not find target block");
}
