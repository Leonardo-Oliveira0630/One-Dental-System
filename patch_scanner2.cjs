const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const doubleBipLogic = `
        // Lógica de confirmação por "Bip Duplo"
        if (scannedJobRef.current) {
            const currentJob = scannedJobRef.current;
            const jobOs = (currentJob.osNumber || '').trim().toUpperCase().replace(/^0+/, '');
            const jobId = currentJob.id.trim().toUpperCase();
            const jobIdShort = currentJob.id.substring(0,8).toUpperCase();
            const jobBox = (currentJob.boxNumber || '').trim().toUpperCase();
            
            if (jobOs === cleanedCode || jobId === cleanedCode || jobIdShort === rawCode || (jobBox && (jobBox === cleanedCode || jobBox === rawCode))) {
`;

code = code.replace(
`        // Lógica de confirmação por "Bip Duplo"
        if (scannedJobRef.current) {
            const currentJob = scannedJobRef.current;
            const jobOs = (currentJob.osNumber || '').trim().toUpperCase().replace(/^0+/, '');
            const jobId = currentJob.id.trim().toUpperCase();
            const jobIdShort = currentJob.id.substring(0,8).toUpperCase();
            
            if (jobOs === cleanedCode || jobId === cleanedCode || jobIdShort === rawCode) {`, doubleBipLogic);

fs.writeFileSync('components/Scanner.tsx', code);
