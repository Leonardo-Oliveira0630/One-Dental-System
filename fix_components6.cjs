const fs = require('fs');

let scanner = fs.readFileSync('components/Scanner.tsx', 'utf8');
scanner = scanner.replace(/import \{ Nfc \} from '@capgo\/capacitor-nfc';\n\/\/ HACK/g, "import { CapacitorNfc as Nfc } from '@capgo/capacitor-nfc';");
fs.writeFileSync('components/Scanner.tsx', scanner);

let nfc = fs.readFileSync('services/nfcServices.ts', 'utf8');
nfc = nfc.replace(/import \{ Nfc \} from '@capgo\/capacitor-nfc';/g, "import { CapacitorNfc as Nfc } from '@capgo/capacitor-nfc';");
fs.writeFileSync('services/nfcServices.ts', nfc);
