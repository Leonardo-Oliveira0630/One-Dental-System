const fs = require('fs');

let scanner = fs.readFileSync('components/Scanner.tsx', 'utf8');

scanner = scanner.replace(/import \{ Nfc \} from '@capgo\/capacitor-nfc';/, "import { Nfc } from '@capgo/capacitor-nfc';\n// HACK");
scanner = scanner.replace(/NFC\./g, "Nfc.");

// Admin Kits
let admin = fs.readFileSync('pages/superadmin/NfcKitsAdmin.tsx', 'utf8');
admin = admin.replace(/getKitBoxes\(\)/g, "getKits()"); // restore getKits
fs.writeFileSync('pages/superadmin/NfcKitsAdmin.tsx', admin);

// For nfcServices, restore getKits in KitService:
let nfcServices = fs.readFileSync('services/nfcServices.ts', 'utf8');
const missingGetKits = `
  getKits: async (): Promise<NfcKit[]> => {
    const snapshot = await getDocs(collection(db, 'nfc_kits'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NfcKit[];
  },
`;
nfcServices = nfcServices.replace(/export const KitService = \{/, "export const KitService = {\n" + missingGetKits);
fs.writeFileSync('services/nfcServices.ts', nfcServices);
