const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf-8');

const handleAddManualEntryStr = `
    const handleAddManualEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statementClient) return;
        
        const amount = parseFloat(manualEntryAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Digite um valor válido.");
            return;
        }

        setIsAddingManualEntry(true);
        try {
            await addDentistPayment({
                dentistId: statementClient.id,
                dentistName: statementClient.name,
                amount: amount,
                paymentMethod: 'CASH',
                paymentDate: new Date(),
                type: manualEntryType === 'MANUAL_DEBIT' ? 'DEBIT_ADJUSTMENT' : 'CREDIT_ADJUSTMENT',
                notes: manualEntryNotes || (manualEntryType === 'MANUAL_DEBIT' ? 'Ajuste a Débito' : 'Ajuste a Crédito')
            } as any);
            
            setShowManualEntryModal(false);
            setManualEntryAmount('');
            setManualEntryNotes('');
            alert('Lançamento manual registrado com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao registrar lançamento manual.');
        } finally {
            setIsAddingManualEntry(false);
        }
    };
`;

const targetInsertStr = `    const handleSavePayment = async () => {`;

content = content.replace(targetInsertStr, handleAddManualEntryStr + '\n' + targetInsertStr);

fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('Patched handleAddManualEntry in Dentists.tsx');
