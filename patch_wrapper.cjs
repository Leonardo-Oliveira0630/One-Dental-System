const fs = require('fs');
let code = fs.readFileSync('components/PrintOverlay.tsx', 'utf8');

const target = `printData.mode === 'SHEET' ? 'w-[210mm] h-[148.5mm] p-6 print:w-[210mm] print:h-[148.5mm] overflow-hidden' : 
            printData.mode === 'ROUTE' ? 'w-[210mm] min-h-[297mm] p-12 print:w-[210mm] print:h-auto' : 
            'w-[50mm] h-[28mm] print:w-[50mm] print:h-[28mm] print:overflow-hidden relative print:m-0 print:p-0'`;

const replacement = `printData.mode === 'SHEET' ? 'w-[210mm] h-[148.5mm] p-6 print:w-[210mm] print:h-[148.5mm] overflow-hidden' : 
            printData.mode === 'INVOICE_SHEET' ? 'w-[210mm] h-[297mm] p-10 print:w-[210mm] print:h-[297mm] overflow-hidden' : 
            printData.mode === 'ROUTE' ? 'w-[210mm] min-h-[297mm] p-12 print:w-[210mm] print:h-auto' : 
            'w-[50mm] h-[28mm] print:w-[50mm] print:h-[28mm] print:overflow-hidden relative print:m-0 print:p-0'`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('components/PrintOverlay.tsx', code);
    console.log("Patched wrapper");
} else {
    console.log("Could not find wrapper target");
}
