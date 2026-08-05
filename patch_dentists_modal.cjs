const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf-8');

const targetStr = `return (
        <div className="flex-1 bg-slate-50 overflow-auto relative">`;

const replacement = `const handleAddManualEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statementClient || !currentOrg) return;
        
        setIsAddingManualEntry(true);
        try {
            const valueStr = manualEntryAmount.replace(/\\./g, '').replace(',', '.');
            const value = parseFloat(valueStr);
            if (isNaN(value) || value <= 0) {
                alert('Por favor, insira um valor válido maior que zero.');
                setIsAddingManualEntry(false);
                return;
            }

            const newPayment = {
                organizationId: currentOrg.id,
                dentistId: statementClient.id,
                dentistName: statementClient.name,
                amount: value,
                paymentMethod: 'CASH', // Dummy method for manual entry
                paymentDate: new Date(),
                type: manualEntryType,
                notes: manualEntryNotes,
                createdAt: new Date(),
            };

            if (addDentistPayment) {
                await addDentistPayment(newPayment);
            }
            
            setShowManualEntryModal(false);
            setManualEntryAmount('');
            setManualEntryNotes('');
            setManualEntryType('MANUAL_DEBIT');
        } catch (err) {
            console.error("Erro ao adicionar lançamento:", err);
            alert('Erro ao adicionar lançamento manual.');
        } finally {
            setIsAddingManualEntry(false);
        }
    };

    return (
        <div className="flex-1 bg-slate-50 overflow-auto relative">`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('Patched Dentists.tsx handler');
