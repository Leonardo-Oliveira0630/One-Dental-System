const fs = require('fs');

let content = fs.readFileSync('pages/lab/Dentists.tsx', 'utf8');

// Add state for subDentists
content = content.replace(
    "const [customPrices, setCustomPrices] = useState<any[]>([]);",
    "const [customPrices, setCustomPrices] = useState<any[]>([]);\n    const [subDentists, setSubDentists] = useState<{ id: string; name: string; cro?: string; }[]>([]);"
);

// In the edit modal opening logic, we need to populate subDentists
const populateMatch = `setTemporaryUnblockUntil(client.temporaryUnblockUntil ? (client.temporaryUnblockUntil.toDate ? client.temporaryUnblockUntil.toDate() : new Date(client.temporaryUnblockUntil)) : null);`;
content = content.replace(
    populateMatch,
    populateMatch + "\n        setSubDentists(client.subDentists || []);"
);

// When saving changes, include subDentists
const saveMatch = `temporaryUnblockUntil: temporaryUnblockUntil`;
content = content.replace(
    saveMatch,
    saveMatch + ",\n                subDentists: subDentists"
);

// We need to add the UI for SubDentists inside the modal. The modal has a tab for Prices maybe? Wait, let's see where the block settings are.
fs.writeFileSync('pages/lab/Dentists.tsx', content);
console.log('patched states');
