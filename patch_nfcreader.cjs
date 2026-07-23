const fs = require('fs');
let code = fs.readFileSync('pages/NFCReader.tsx', 'utf8');

code = code.replace(
`        if (activeJob) {
            // Trabalho encontrado! Vamos redirecionar para a página do trabalho com um state para abrir o scanner`,
`        if (activeJob) {
            // Trabalho encontrado! Vamos redirecionar para a página do trabalho com um state para abrir o scanner`);

const logic = `
    useEffect(() => {
        const boxNumber = searchParams.get('box');
        
        if (!boxNumber) {
            setError('Nenhum número de caixa fornecido na tag NFC.');
            return;
        }

        // Tentar encontrar um trabalho ativo com esta caixa
        const activeJob = jobs.find(j => 
            (j.boxNumber || '').trim() === boxNumber.trim() && 
            ![JobStatus.COMPLETED, JobStatus.DELIVERED, JobStatus.CANCELED, JobStatus.REJECTED].includes(j.status)
        );

        if (activeJob) {
            window.dispatchEvent(new CustomEvent('nfcScan', { detail: { code: boxNumber.trim() } }));
            navigate('/dashboard', { replace: true });
        } else {
            // Wait for jobs to potentially load
            const timeoutId = setTimeout(() => {
                const currentJob = jobs.find(j => 
                    (j.boxNumber || '').trim() === boxNumber.trim() && 
                    ![JobStatus.COMPLETED, JobStatus.DELIVERED, JobStatus.CANCELED, JobStatus.REJECTED].includes(j.status)
                );
                if (!currentJob) {
                    setError(\`Nenhum trabalho ativo encontrado para a caixa \${boxNumber}.\`);
                }
            }, 2500);
            return () => clearTimeout(timeoutId);
        }
    }, [jobs, searchParams, navigate]);
`;

code = code.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[jobs, searchParams, navigate\]\);/, logic);

fs.writeFileSync('pages/NFCReader.tsx', code);
