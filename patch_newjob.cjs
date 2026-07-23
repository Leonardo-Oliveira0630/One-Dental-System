const fs = require('fs');
let code = fs.readFileSync('pages/NewJob.tsx', 'utf8');

const validationCode = `
        if (boxNumber.trim()) {
            const activeJobWithBox = jobs.find(j => 
                j.boxNumber === boxNumber.trim() && 
                ![JobStatus.COMPLETED, JobStatus.DELIVERED, JobStatus.CANCELED, JobStatus.REJECTED].includes(j.status)
            );
            if (activeJobWithBox) {
                alert(\`A caixa \${boxNumber.trim()} está em uso pelo trabalho OS \${activeJobWithBox.osNumber}. Finalize-o antes de usar esta caixa.\`);
                setIsSubmitting(false);
                return;
            }
        }
`;

code = code.replace(
    'if (!initialSector) {',
    validationCode + '\n        if (!initialSector) {'
);

fs.writeFileSync('pages/NewJob.tsx', code);
