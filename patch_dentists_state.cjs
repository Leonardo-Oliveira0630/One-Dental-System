const fs = require('fs');
let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf-8');

const targetStr = `    const [showStatement, setShowStatement] = useState(false);`;
const replacement = `    const [showStatement, setShowStatement] = useState(false);
    const [showManualEntryModal, setShowManualEntryModal] = useState(false);
    const [manualEntryType, setManualEntryType] = useState<'MANUAL_DEBIT' | 'MANUAL_CREDIT'>('MANUAL_DEBIT');
    const [manualEntryAmount, setManualEntryAmount] = useState('');
    const [manualEntryNotes, setManualEntryNotes] = useState('');
    const [isAddingManualEntry, setIsAddingManualEntry] = useState(false);`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('Patched Dentists.tsx state');
