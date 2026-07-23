const fs = require('fs');
let code = fs.readFileSync('pages/NFCReader.tsx', 'utf8');

const logic = `
    useEffect(() => {
        const boxNumber = searchParams.get('box');
        
        if (!boxNumber) {
            setError('Nenhum número de caixa fornecido na tag NFC.');
            return;
        }

        const activeJob = jobs.find(j => 
            (j.boxNumber || '').trim() === boxNumber.trim() && 
            ![JobStatus.COMPLETED, JobStatus.DELIVERED, JobStatus.CANCELED, JobStatus.REJECTED].includes(j.status)
        );

        if (activeJob) {
            const channel = new BroadcastChannel('nfc-channel');
            let ackReceived = false;

            channel.onmessage = (event) => {
                if (event.data?.type === 'NFC_ACK') {
                    ackReceived = true;
                    // Fechar a aba atual já que a principal pegou o evento
                    window.close();
                    // Fallback caso o navegador bloqueie window.close()
                    setError('Leitura enviada para a aba principal. Você pode fechar esta aba.');
                }
            };

            channel.postMessage({ type: 'NFC_SCAN', code: boxNumber.trim() });

            // Se não receber ACK em 500ms, navega normalmente (significa que não há outra aba aberta)
            const timeoutId = setTimeout(() => {
                if (!ackReceived) {
                    window.dispatchEvent(new CustomEvent('nfcScan', { detail: { code: boxNumber.trim() } }));
                    navigate('/dashboard', { replace: true, state: { nfcScanCode: boxNumber.trim() } });
                }
                channel.close();
            }, 600);

            return () => clearTimeout(timeoutId);
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
