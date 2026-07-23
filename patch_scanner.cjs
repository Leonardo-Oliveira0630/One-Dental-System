const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');

const scanLogic = `
        if (!job) {
            // Busca mais rigorosa no array
            job = jobsRef.current.find(j => 
                (j.osNumber && j.osNumber.toUpperCase() === rawCode) ||
                (j.osNumber && j.osNumber.toUpperCase().replace(/^0+/, '') === cleanedCode) ||
                j.id.toUpperCase() === rawCode ||
                j.id.substring(0, 8).toUpperCase() === rawCode
            );
        }
        
        // Busca por Número da Caixa (NFC)
        if (!job) {
            const activeJobWithBox = jobsRef.current.find(j => 
                j.boxNumber === rawCode || j.boxNumber === cleanedCode
            );
            
            if (activeJobWithBox && !['COMPLETED', 'DELIVERED', 'CANCELED', 'REJECTED'].includes(activeJobWithBox.status)) {
                job = activeJobWithBox;
                console.log(\`[Scanner] Trabalho encontrado pela Caixa NFC: \${job.osNumber} (Caixa: \${job.boxNumber})\`);
            }
        }
`;

code = code.replace(
`        if (!job) {
            // Busca mais rigorosa no array
            job = jobsRef.current.find(j => 
                (j.osNumber && j.osNumber.toUpperCase() === rawCode) ||
                (j.osNumber && j.osNumber.toUpperCase().replace(/^0+/, '') === cleanedCode) ||
                j.id.toUpperCase() === rawCode ||
                j.id.substring(0, 8).toUpperCase() === rawCode
            );
        }`, scanLogic);

fs.writeFileSync('components/Scanner.tsx', code);
