const fs = require('fs');
let code = fs.readFileSync('pages/JobDetails.tsx', 'utf8');

const validationCode = `
        if (editBoxNumber.trim() && editBoxNumber.trim() !== job.boxNumber) {
            const activeJobWithBox = jobs.find(j => 
                j.id !== job.id &&
                j.boxNumber === editBoxNumber.trim() && 
                ![JobStatus.COMPLETED, JobStatus.DELIVERED, JobStatus.CANCELED, JobStatus.REJECTED].includes(j.status)
            );
            if (activeJobWithBox) {
                alert(\`A caixa \${editBoxNumber.trim()} está em uso pelo trabalho OS \${activeJobWithBox.osNumber}. Finalize-o antes de usar esta caixa.\`);
                return;
            }
        }
`;

code = code.replace(
    'const oldDate = new Date(job.dueDate).toISOString().split(\\\'T\\\')[0];',
    validationCode + '\n        const oldDate = new Date(job.dueDate).toISOString().split(\'T\')[0];'
);

fs.writeFileSync('pages/JobDetails.tsx', code);
