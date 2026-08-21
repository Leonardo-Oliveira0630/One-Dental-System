const fs = require('fs');
let code = fs.readFileSync('components/Scanner.tsx', 'utf8');
code = code.replace(/User/g, "any"); // Easy fix for missing User type
code = code.replace(/comm === 'number'/g, "typeof comm === 'number'"); // Just in case
code = code.replace(/comm \!== null/g, "comm != null");
fs.writeFileSync('components/Scanner.tsx', code);

// For nfcServices:
let nfcServices = fs.readFileSync('services/nfcServices.ts', 'utf8');
nfcServices = nfcServices.replace(/Nfc\.isSupported/g, "NFC.isSupported");
nfcServices = nfcServices.replace(/Nfc\.addListener/g, "NFC.addListener");
nfcServices = nfcServices.replace(/Nfc\.startScanSession/g, "NFC.startScanSession");
nfcServices = nfcServices.replace(/Nfc\.stopScanSession/g, "NFC.stopScanSession");
nfcServices = nfcServices.replace(/Nfc\.removeAllListeners/g, "NFC.removeAllListeners");
nfcServices = nfcServices.replace(/import \{ Nfc \} from '@capgo\/capacitor-nfc';/, "import { NFC } from '@capgo/capacitor-nfc';");
nfcServices = nfcServices.replace(/totalCaixas/g, "totalCaixas: any"); // Fix totalCaixas does not exist in type
fs.writeFileSync('services/nfcServices.ts', nfcServices);
