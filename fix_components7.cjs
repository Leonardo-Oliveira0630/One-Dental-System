const fs = require('fs');

let scanner = fs.readFileSync('components/Scanner.tsx', 'utf8');
scanner = scanner.replace(/import \{ Nfc \} from '@capgo\/capacitor-nfc';/g, "import { CapacitorNfc as Nfc } from '@capgo/capacitor-nfc';");
fs.writeFileSync('components/Scanner.tsx', scanner);
