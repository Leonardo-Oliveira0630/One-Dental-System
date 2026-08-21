const fs = require('fs');

// Patch nfcServices.ts
let nfcServices = fs.readFileSync('services/nfcServices.ts', 'utf8');

// Add Capacitor imports if not present
if (!nfcServices.includes('@capacitor/core')) {
  nfcServices = `import { Capacitor } from '@capacitor/core';\nimport { Nfc } from '@capgo/capacitor-nfc';\n` + nfcServices;
}

nfcServices = nfcServices.replace(
  `startWebNfcScan: async (`,
  `startWebNfcScan: async (`
);

// We need to rewrite the startWebNfcScan completely
const startScanRegex = /startWebNfcScan:\s*async\s*\(\s*onScan:\s*\([^)]*\)\s*=>\s*void,\s*onError\?:\s*\([^)]*\)\s*=>\s*void,\s*signal\?:\s*AbortSignal\s*\)\s*:\s*Promise<void>\s*=>\s*{[\s\S]*?}(?=\s*,\s*getKits:|\s*};|\s*\/\*\*)/m;

const newStartScan = `startWebNfcScan: async (
    onScan: (uid: string, text?: string) => void,
    onError?: (err: any) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Native NFC for Android/iOS Capacitor app
        const isSupported = await Nfc.isSupported();
        if (!isSupported.supported) throw new Error('NFC não suportado neste dispositivo.');
        
        await Nfc.startScanSession();
        
        Nfc.addListener('nfcTagScanned', (event) => {
          let textValue = '';
          const uid = event.id ? event.id.map((b: number) => b.toString(16).padStart(2, '0')).join('').toUpperCase() : '';
          
          if (event.messages && event.messages.length > 0) {
            for (const record of event.messages[0].records) {
              if (record.type && String.fromCharCode(...record.type) === 'T' && record.payload) {
                 textValue = String.fromCharCode(...record.payload).substring(3); // Skip language code
                 break;
              }
            }
          }
          
          onScan(uid, textValue);
        });
        
        if (signal) {
          signal.addEventListener('abort', () => {
             Nfc.stopScanSession();
             Nfc.removeAllListeners();
          });
        }
        
      } else {
        // Web NFC for Chrome browser
        if (!('NDEFReader' in window)) {
          throw new Error('Web NFC não é suportado neste dispositivo/navegador.');
        }
        const ndef = new (window as any).NDEFReader();
        await ndef.scan({ signal });
        ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
          let textValue = '';
          try {
            if (message && message.records) {
              for (const record of message.records) {
                if (record.recordType === "text" || (record.recordType === "mime" && record.mediaType === "text/plain")) {
                  const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                  textValue = textDecoder.decode(record.data);
                  break;
                }
              }
            }
          } catch(e) {}
          onScan(serialNumber, textValue);
        });
      }
    } catch (err: any) {
      if (onError) onError(err);
      else throw err;
    }
  }`;

nfcServices = nfcServices.replace(startScanRegex, newStartScan);
fs.writeFileSync('services/nfcServices.ts', nfcServices);
console.log("Patched nfcServices.ts");

