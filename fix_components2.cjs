const fs = require('fs');

let scanner = fs.readFileSync('components/Scanner.tsx', 'utf8');

scanner = scanner.replace(/setNfcParam/g, "processScan");
scanner = scanner.replace(/setScanMode/g, "// removed scanMode");
scanner = scanner.replace(/scanMode/g, "isNfcSupported");
scanner = scanner.replace(/activeTab/g, "isNfcSupported");

// Fix User type
scanner = scanner.replace(/User/g, "any"); 
// Fix comm === 'number'
scanner = scanner.replace(/comm === 'number'/g, "typeof comm === 'number'"); 

fs.writeFileSync('components/Scanner.tsx', scanner);

// For nfcServices:
let nfcServices = fs.readFileSync('services/nfcServices.ts', 'utf8');
nfcServices = nfcServices.replace(/Nfc\.isSupported/g, "NFC.isSupported");
nfcServices = nfcServices.replace(/Nfc\.addListener/g, "NFC.addListener");
nfcServices = nfcServices.replace(/Nfc\.startScanSession/g, "NFC.startScanSession");
nfcServices = nfcServices.replace(/Nfc\.stopScanSession/g, "NFC.stopScanSession");
nfcServices = nfcServices.replace(/Nfc\.removeAllListeners/g, "NFC.removeAllListeners");
nfcServices = nfcServices.replace(/import \{ Nfc \} from '@capgo\/capacitor-nfc';/, "import { NFC } from '@capgo/capacitor-nfc';");
nfcServices = nfcServices.replace(/totalCaixas/g, "totalCaixas: any"); 
nfcServices = nfcServices.replace(/\(event\)/g, "(event: any)"); 
fs.writeFileSync('services/nfcServices.ts', nfcServices);
