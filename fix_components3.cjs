const fs = require('fs');

let scanner = fs.readFileSync('components/Scanner.tsx', 'utf8');

scanner = scanner.replace(/currentany/g, "currentUser");
scanner = scanner.replace(/entryanyId/g, "entryUserId");
scanner = scanner.replace(/exitanyId/g, "exitUserId");
scanner = scanner.replace(/anyRole/g, "UserRole");

fs.writeFileSync('components/Scanner.tsx', scanner);

let nfc = fs.readFileSync('services/nfcServices.ts', 'utf8');
nfc = nfc.replace(/import \{ NFC \} from '@capgo\/capacitor-nfc';/g, "import { Nfc } from '@capgo/capacitor-nfc';");
nfc = nfc.replace(/NFC\./g, "Nfc.");
nfc = nfc.replace(/totalCaixas: any/g, "// removed");
fs.writeFileSync('services/nfcServices.ts', nfc);
