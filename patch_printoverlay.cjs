const fs = require('fs');
let content = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

// There are two layout versions in PrintOverlay based on what I see (one for full-page, one for half-page maybe? Or different parts of the print overlay, maybe the receipt part and the production ticket part).
// Let's replace "Dentista / Clínica" with "Cliente" and add subDentist

content = content.replace(
    /<p className="text-\[10px\] uppercase font-bold text-gray-500 mb-0\.5 leading-none">Dentista \/ Clínica<\/p>\s*<p className="text-base font-bold leading-tight truncate mt-1">\{job\.dentistName\}<\/p>/g,
    `<p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Cliente / Clínica</p>
                            <p className="text-base font-bold leading-tight truncate mt-1">{job.dentistName}</p>
                            {job.subDentistName && (
                                <div className="mt-2 pt-1 border-t border-gray-100">
                                    <p className="text-[9px] uppercase font-bold text-gray-500 mb-0.5 leading-none">Dentista Solicitante</p>
                                    <p className="text-sm font-bold leading-tight mt-0.5">{job.subDentistName}</p>
                                </div>
                            )}`
);

fs.writeFileSync('components/PrintOverlay.tsx', content);
console.log('patched PrintOverlay.tsx');
